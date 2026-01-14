/**
 * Shopify Inventory Webhook Handler
 *
 * Receives inventory_levels/update webhooks from Shopify
 * and stores live inventory data in Netlify Blobs for real-time cart availability.
 *
 * Webhook Setup in Shopify:
 * Settings > Notifications > Webhooks > Create webhook
 * - Event: Inventory levels > Update
 * - URL: https://leagues.crypticcabin.com/api/shopify-inventory-webhook
 * - Format: JSON
 */

const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

// Shopify webhook secret for signature verification
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

// Netlify Blobs config (needed for serverless functions)
const SITE_ID = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
const BLOBS_TOKEN = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_ACCESS_TOKEN;

// Blob store name for live inventory
const BLOB_STORE_NAME = 'live-inventory';
const BLOB_KEY = 'inventory';

/**
 * Get blob store with proper config
 */
function getBlobStore() {
  const options = { name: BLOB_STORE_NAME };

  // Add siteID and token if available (needed for serverless)
  if (SITE_ID) options.siteID = SITE_ID;
  if (BLOBS_TOKEN) options.token = BLOBS_TOKEN;

  return getStore(options);
}

/**
 * Verify Shopify webhook signature
 */
function verifyWebhookSignature(body, signature) {
  if (!SHOPIFY_WEBHOOK_SECRET) {
    console.warn('⚠️ SHOPIFY_WEBHOOK_SECRET not set - skipping signature verification');
    return true; // Allow in dev, but warn
  }

  try {
    const hmac = crypto
      .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
      .update(body, 'utf8')
      .digest('base64');

    const hmacBuffer = Buffer.from(hmac);
    const signatureBuffer = Buffer.from(signature);

    // Buffers must be same length for timingSafeEqual
    if (hmacBuffer.length !== signatureBuffer.length) {
      console.error(`Signature length mismatch: expected ${hmacBuffer.length}, got ${signatureBuffer.length}`);
      return false;
    }

    return crypto.timingSafeEqual(hmacBuffer, signatureBuffer);
  } catch (error) {
    console.error('Signature verification error:', error.message);
    return false;
  }
}

/**
 * Netlify Function Handler
 */
exports.handler = async (event, context) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Verify webhook signature
  const signature = event.headers['x-shopify-hmac-sha256'];
  if (SHOPIFY_WEBHOOK_SECRET && !signature) {
    console.error('Missing webhook signature');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Missing signature' })
    };
  }

  if (signature && !verifyWebhookSignature(event.body, signature)) {
    console.error('Invalid webhook signature');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid signature' })
    };
  }

  try {
    const payload = JSON.parse(event.body);

    // Shopify sends: inventory_item_id, location_id, available, updated_at
    const { inventory_item_id, available, updated_at } = payload;

    if (!inventory_item_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing inventory_item_id' })
      };
    }

    console.log(`📦 Inventory update: item ${inventory_item_id} = ${available}`);

    // Get or create the blob store
    const store = getBlobStore();
    console.log('Blob store initialized, siteID:', SITE_ID ? 'set' : 'not set');

    // Read current inventory data
    let inventoryData = {};
    try {
      const existing = await store.get(BLOB_KEY, { type: 'json' });
      console.log('Existing blob data:', existing ? 'found' : 'not found');
      if (existing) {
        inventoryData = existing;
      }
    } catch (e) {
      // Blob doesn't exist yet, start fresh
      console.log('Creating new inventory blob, error was:', e.message);
    }

    // Update the inventory for this item
    inventoryData[inventory_item_id] = {
      available: available,
      updated_at: updated_at || new Date().toISOString()
    };

    // Write back to blob
    console.log('Writing to blob store...');
    await store.setJSON(BLOB_KEY, inventoryData);

    console.log(`✅ Updated inventory blob (${Object.keys(inventoryData).length} items tracked)`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        inventory_item_id,
        available,
        total_tracked: Object.keys(inventoryData).length
      })
    };

  } catch (error) {
    console.error('Webhook error:', error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
