/**
 * Bulk Data API - Serves real-time inventory from Netlify Blobs
 *
 * Endpoint: /api/bulk-data
 * Returns the live bulk data JSON with real-time inventory updates
 */

const { getStore } = require('@netlify/blobs');

const SITE_ID = process.env.CC_SITE_ID;
const BLOBS_TOKEN = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_ACCESS_TOKEN;

const BULK_DATA_STORE = 'bulk-data';
const BULK_DATA_KEY = 'inventory';
const LIVE_INVENTORY_STORE = 'live-inventory';
const LIVE_INVENTORY_KEY = 'inventory';

// Static fallback URL (from build)
const STATIC_URL = 'https://leagues.crypticcabin.com/bulk-data/cryptic-cabin-inventory.json';

function getBlobStore(name) {
  const options = { name };
  if (SITE_ID) options.siteID = SITE_ID;
  if (BLOBS_TOKEN) options.token = BLOBS_TOKEN;
  return getStore(options);
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60' // Cache for 1 minute
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    let bulkData = null;
    let source = 'unknown';

    // Try loading from blob store first
    try {
      const store = getBlobStore(BULK_DATA_STORE);
      bulkData = await store.get(BULK_DATA_KEY, { type: 'json' });
      if (bulkData) {
        source = 'blob';
        console.log(`Loaded ${bulkData.total_cards} cards from blob`);
      }
    } catch (e) {
      console.log('Blob store error:', e.message);
    }

    // Fallback to static file
    if (!bulkData) {
      try {
        const response = await fetch(STATIC_URL);
        if (response.ok) {
          bulkData = await response.json();
          source = 'static';
          console.log(`Loaded ${bulkData.total_cards} cards from static file`);
        }
      } catch (e) {
        console.log('Static file error:', e.message);
      }
    }

    if (!bulkData) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: 'Bulk data temporarily unavailable' })
      };
    }

    // Apply live inventory overlay from webhook updates
    try {
      const liveStore = getBlobStore(LIVE_INVENTORY_STORE);
      const liveInventory = await liveStore.get(LIVE_INVENTORY_KEY, { type: 'json' });

      if (liveInventory && Object.keys(liveInventory).length > 0) {
        let updated = 0;

        for (const card of bulkData.data) {
          const inventoryItemId = card.cryptic_cabin?.inventory_item_id;
          if (inventoryItemId && liveInventory[inventoryItemId]) {
            const live = liveInventory[inventoryItemId];
            card.cryptic_cabin.quantity = live.available;
            card.cryptic_cabin.in_stock = live.available > 0;
            card.cryptic_cabin.last_updated = live.updated_at;
            updated++;
          }
        }

        if (updated > 0) {
          console.log(`Applied ${updated} live inventory updates`);
          // Recalculate in_stock count
          bulkData.statistics.in_stock = bulkData.data.filter(c => c.cryptic_cabin?.in_stock).length;
        }
      }
    } catch (e) {
      console.log('Live inventory overlay skipped:', e.message);
    }

    // Add metadata
    bulkData.served_from = source;
    bulkData.served_at = new Date().toISOString();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(bulkData)
    };

  } catch (error) {
    console.error('Error serving bulk data:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
