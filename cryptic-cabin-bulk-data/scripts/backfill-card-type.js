#!/usr/bin/env node

/**
 * Backfill card_type metafield
 *
 * Quick script to add card_type to all products.
 * card_type = type_line stripped of subtypes (after em-dash)
 */

const https = require('https');

const BULK_DATA_URL = 'https://leagues.crypticcabin.com/bulk-data/cryptic-cabin-inventory.json';
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'cryptic-cabin-tcg';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2025-01';
const RATE_LIMIT_DELAY = 300;

if (!SHOPIFY_ACCESS_TOKEN) {
  console.error('❌ SHOPIFY_ACCESS_TOKEN required');
  process.exit(1);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function shopifyGraphQL(query, variables) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query, variables });
    const req = https.request({
      hostname: `${SHOPIFY_STORE}.myshopify.com`,
      path: `/admin/api/${API_VERSION}/graphql.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        if (result.errors) reject(new Error(JSON.stringify(result.errors)));
        else resolve(result);
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractCardType(typeLine) {
  if (!typeLine) return null;
  return typeLine
    .split(' — ')[0]      // Remove subtypes
    .split(' // ')[0]     // Handle DFCs
    .trim();
}

async function backfill() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Backfill card_type Metafield');
  console.log('═══════════════════════════════════════════════════════════');

  const bulkData = await fetchJson(BULK_DATA_URL);
  console.log(`Loaded ${bulkData.data.length} cards`);

  // Dedupe by product_id
  const productMap = new Map();
  for (const card of bulkData.data) {
    const productId = card.cryptic_cabin?.product_id;
    if (productId && card.type_line && !productMap.has(productId)) {
      productMap.set(productId, card);
    }
  }

  const products = Array.from(productMap.entries());
  console.log(`Processing ${products.length} products\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const [productId, card] = products[i];
    const cardType = extractCardType(card.type_line);

    try {
      await shopifyGraphQL(`
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product { id }
            userErrors { field message }
          }
        }
      `, {
        input: {
          id: `gid://shopify/Product/${productId}`,
          metafields: [{
            namespace: 'custom',
            key: 'card_type',
            value: cardType,
            type: 'single_line_text_field'
          }]
        }
      });
      console.log(`[${i + 1}/${products.length}] ✅ ${card.name} → "${cardType}"`);
      updated++;
    } catch (err) {
      console.log(`[${i + 1}/${products.length}] ❌ ${card.name} - ${err.message}`);
      failed++;
    }

    if (i < products.length - 1) await sleep(RATE_LIMIT_DELAY);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  Complete: ${updated} updated, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════');
}

backfill().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
