/**
 * Shopify Inventory Webhook Handler
 *
 * Receives inventory update webhooks from Shopify and triggers a bulk data rebuild.
 * Includes debouncing to prevent excessive rebuilds when multiple items change.
 *
 * Setup in Shopify Admin:
 * 1. Settings > Notifications > Webhooks
 * 2. Create webhook for "Inventory level update"
 * 3. URL: https://your-site.netlify.app/api/webhook/inventory
 * 4. Format: JSON
 *
 * Environment variables needed:
 * - NETLIFY_BUILD_HOOK: Build hook URL from Netlify dashboard
 * - SHOPIFY_WEBHOOK_SECRET: (optional) For HMAC verification
 */

const crypto = require('crypto');

// Debounce: Don't trigger more than once per 5 minutes
const DEBOUNCE_MS = 5 * 60 * 1000;
let lastTriggerTime = 0;

/**
 * Verify Shopify webhook signature (optional but recommended)
 */
function verifyWebhook(body, hmacHeader, secret) {
  if (!secret || !hmacHeader) return true; // Skip if not configured

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  );
}

/**
 * Trigger Netlify build hook
 */
async function triggerBuild(buildHookUrl) {
  const response = await fetch(buildHookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trigger: 'shopify-inventory-webhook' })
  });

  return response.ok;
}

exports.handler = async (event, context) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const buildHookUrl = process.env.NETLIFY_BUILD_HOOK;
  if (!buildHookUrl) {
    console.error('NETLIFY_BUILD_HOOK not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Build hook not configured' })
    };
  }

  // Verify webhook signature if secret is configured
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const hmacHeader = event.headers['x-shopify-hmac-sha256'];

  if (webhookSecret && !verifyWebhook(event.body, hmacHeader, webhookSecret)) {
    console.error('Invalid webhook signature');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid signature' })
    };
  }

  // Parse webhook payload for logging
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    payload = {};
  }

  const now = Date.now();
  const timeSinceLastTrigger = now - lastTriggerTime;

  // Debounce: Skip if triggered recently
  if (timeSinceLastTrigger < DEBOUNCE_MS) {
    const waitSeconds = Math.ceil((DEBOUNCE_MS - timeSinceLastTrigger) / 1000);
    console.log(`Debounced: Last trigger was ${Math.floor(timeSinceLastTrigger / 1000)}s ago. Next allowed in ${waitSeconds}s`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        action: 'debounced',
        message: `Build triggered recently. Next rebuild allowed in ${waitSeconds} seconds.`,
        inventory_item_id: payload.inventory_item_id
      })
    };
  }

  // Trigger the build
  try {
    console.log(`Triggering bulk data rebuild for inventory change: ${payload.inventory_item_id || 'unknown'}`);

    const success = await triggerBuild(buildHookUrl);

    if (success) {
      lastTriggerTime = now;
      console.log('Build triggered successfully');

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          action: 'build_triggered',
          message: 'Bulk data rebuild triggered',
          inventory_item_id: payload.inventory_item_id
        })
      };
    } else {
      throw new Error('Build hook returned non-OK status');
    }
  } catch (error) {
    console.error('Failed to trigger build:', error.message);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to trigger rebuild',
        message: error.message
      })
    };
  }
};
