/**
 * Process Product Queue - Scheduled Trigger
 *
 * Runs every 10 minutes. Reads all queued product IDs from the Netlify Blob
 * queue, deduplicates them, and triggers the background worker to do the
 * actual Scryfall lookup + Shopify metafield writes.
 *
 * Scheduled functions have a 10s timeout, so we delegate to the background
 * function which gets 15 minutes.
 */

const { getStore } = require('@netlify/blobs');

const SITE_ID = process.env.CC_SITE_ID;
const BLOBS_TOKEN = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_ACCESS_TOKEN;
const SITE_URL = process.env.URL || 'https://leagues.crypticcabin.com';

const BLOB_STORE_NAME = 'product-queue';

function getBlobStore() {
  const options = { name: BLOB_STORE_NAME };
  if (SITE_ID) options.siteID = SITE_ID;
  if (BLOBS_TOKEN) options.token = BLOBS_TOKEN;
  return getStore(options);
}

exports.handler = async (event, context) => {
  console.log('Process product queue triggered at', new Date().toISOString());

  try {
    const store = getBlobStore();

    // List all queued product keys
    const { blobs } = await store.list();

    if (!blobs || blobs.length === 0) {
      console.log('Queue empty - nothing to process');
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Queue empty', count: 0 })
      };
    }

    // Read all queued entries
    const products = [];
    for (const blob of blobs) {
      try {
        const entry = await store.get(blob.key, { type: 'json' });
        if (entry) products.push(entry);
      } catch (e) {
        console.warn(`Failed to read queue entry ${blob.key}:`, e.message);
      }
    }

    if (products.length === 0) {
      console.log('No valid queue entries found');
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'No valid entries', count: 0 })
      };
    }

    console.log(`Found ${products.length} queued products, triggering background worker`);

    // Clear the queue before triggering background (so new webhooks during
    // processing get picked up in the next cycle)
    for (const blob of blobs) {
      try {
        await store.delete(blob.key);
      } catch (e) {
        console.warn(`Failed to delete queue entry ${blob.key}:`, e.message);
      }
    }

    // Trigger background worker
    const bgUrl = `${SITE_URL}/.netlify/functions/process-product-queue-background`;
    const res = await fetch(bgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products,
        triggered_by: 'schedule',
        timestamp: new Date().toISOString()
      })
    });

    console.log(`Background worker triggered: ${res.status} (${products.length} products)`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Background worker triggered',
        count: products.length,
        bgStatus: res.status
      })
    };
  } catch (error) {
    console.error('Queue processor error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
