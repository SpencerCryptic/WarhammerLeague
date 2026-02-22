/**
 * Shopify Product Webhook - Queue & Deduplicate
 *
 * On product create/update, stores the product ID in a Netlify Blob queue
 * and returns 200 instantly. A scheduled function (process-product-queue)
 * processes the queue every 10 minutes in bulk.
 *
 * This replaces the previous inline Scryfall+Shopify enrichment to:
 * 1. Reduce invocation cost (fast blob write vs ~780ms API round-trips)
 * 2. Break the feedback loop (skip products already enriched with oracle_id)
 * 3. Deduplicate (same product ID overwrites in the queue)
 *
 * Webhook Setup in Shopify:
 * Settings > Notifications > Webhooks > Create webhook
 * - Events: Product creation, Product update
 * - URL: https://leagues.crypticcabin.com/api/shopify-product-webhook
 * - Format: JSON
 */

const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

// --- Config ---
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
const SITE_ID = process.env.CC_SITE_ID;
const BLOBS_TOKEN = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_ACCESS_TOKEN;

const BLOB_STORE_NAME = 'product-queue';

// --- HMAC verification ---
function verifyWebhookSignature(body, signature) {
  if (!SHOPIFY_WEBHOOK_SECRET) {
    console.warn('SHOPIFY_WEBHOOK_SECRET not set - skipping verification');
    return true;
  }
  try {
    const hmac = crypto
      .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
      .update(body, 'utf8')
      .digest('base64');
    const hmacBuffer = Buffer.from(hmac);
    const signatureBuffer = Buffer.from(signature);
    if (hmacBuffer.length !== signatureBuffer.length) return false;
    return crypto.timingSafeEqual(hmacBuffer, signatureBuffer);
  } catch {
    return false;
  }
}

// --- Filter: is this an MTG product? ---
function isMTGProduct(product) {
  const type = (product.product_type || '').toLowerCase();
  const tags = (product.tags || (Array.isArray(product.tags) ? product.tags.join(',') : '')).toLowerCase();
  return type.includes('magic') || tags.includes('magic') || tags.includes('mtg');
}

// --- Check if product already has oracle_id (feedback loop breaker) ---
function hasOracleId(product) {
  if (!product.metafields) return false;
  const metafields = Array.isArray(product.metafields)
    ? product.metafields
    : (product.metafields?.edges || []).map(e => e.node);
  return metafields.some(mf =>
    mf.namespace === 'custom' && mf.key === 'oracle_id' && mf.value
  );
}

function getBlobStore() {
  const options = { name: BLOB_STORE_NAME };
  if (SITE_ID) options.siteID = SITE_ID;
  if (BLOBS_TOKEN) options.token = BLOBS_TOKEN;
  return getStore(options);
}

// --- Handler ---
exports.handler = async (event) => {
  const ok = (msg, data = {}) => ({
    statusCode: 200,
    body: JSON.stringify({ acknowledged: true, ...data, message: msg })
  });

  try {
    if (event.httpMethod !== 'POST') return ok('ignored: not POST');

    // Verify signature
    const signature = event.headers['x-shopify-hmac-sha256'];
    if (SHOPIFY_WEBHOOK_SECRET && !signature) {
      console.error('Missing webhook signature');
      return ok('rejected: missing signature');
    }
    if (signature && !verifyWebhookSignature(event.body, signature)) {
      console.error('Invalid webhook signature');
      return ok('rejected: invalid signature');
    }

    // Only process create/update
    const topic = event.headers['x-shopify-topic'] || '';
    if (topic === 'products/delete') return ok('ignored: delete event');

    const product = JSON.parse(event.body);

    // Skip non-MTG products
    if (!isMTGProduct(product)) return ok('skipped: not MTG');

    // Break feedback loop: skip if product already has oracle_id metafield
    if (topic === 'products/update' && hasOracleId(product)) {
      return ok('skipped: already enriched (oracle_id present)');
    }

    // Queue the product for batch processing (keyed by product ID for dedup)
    const store = getBlobStore();
    const queueEntry = {
      product_id: product.id,
      title: product.title,
      product_type: product.product_type,
      tags: product.tags,
      updated_at: product.updated_at,
      queued_at: new Date().toISOString()
    };

    await store.setJSON(String(product.id), queueEntry);

    console.log(`Queued product ${product.id}: "${product.title}"`);
    return ok('queued', { product_id: product.id });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return ok('error: ' + error.message);
  }
};
