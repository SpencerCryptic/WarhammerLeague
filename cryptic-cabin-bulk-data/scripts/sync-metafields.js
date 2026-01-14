#!/usr/bin/env node

/**
 * Sync Scryfall Data to Shopify Product Metafields
 *
 * Fetches bulk data from our API and populates Shopify metafields
 * with card data (mana cost, colors, legalities, etc.)
 *
 * OPTIMIZED: Uses batch processing to reduce API calls by ~95%
 * Instead of 1 call per product, batches 25 products per call.
 */

const https = require('https');

// Configuration
const BULK_DATA_URL = 'https://leagues.crypticcabin.com/bulk-data/cryptic-cabin-inventory.json';
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'cryptic-cabin-tcg';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2025-01';

// Batch size for bulk updates (25 is safe for Shopify's query complexity limits)
const BATCH_SIZE = 25;
const RATE_LIMIT_DELAY = 500; // ms between batches

// Test mode - set to a number to limit products, or false for full sync
const TEST_BATCH_SIZE = process.argv.includes('--test') ? 50 : false;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SHOPIFY_ACCESS_TOKEN) {
  console.error('❌ SHOPIFY_ACCESS_TOKEN environment variable is required');
  process.exit(1);
}

// Stats tracking
const stats = {
  total: 0,
  updated: 0,
  skipped: 0,
  failed: 0,
  apiCalls: 0,
  errors: []
};

/**
 * Fetch JSON from URL
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Make GraphQL request to Shopify
 */
function shopifyGraphQL(query, variables) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query, variables });

    const options = {
      hostname: `${SHOPIFY_STORE}.myshopify.com`,
      path: `/admin/api/${API_VERSION}/graphql.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.errors) {
            reject(new Error(JSON.stringify(result.errors)));
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build metafields array for a card
 */
function buildMetafields(card) {
  const metafields = [];

  // Helper to add metafield if value exists
  const add = (key, value, type) => {
    if (value === null || value === undefined || value === '') return;

    let formattedValue;

    if (type.startsWith('list.')) {
      // Lists need to be JSON stringified arrays
      if (!Array.isArray(value) || value.length === 0) return;
      formattedValue = JSON.stringify(value);
    } else if (type === 'number_decimal') {
      // Numbers need to be strings
      formattedValue = String(value);
    } else {
      formattedValue = String(value);
    }

    metafields.push({
      namespace: 'custom',
      key,
      value: formattedValue,
      type
    });
  };

  // For transform cards, use card_faces[0] data if main field is null
  const getFaceValue = (field) => {
    if (card[field] !== null && card[field] !== undefined) return card[field];
    if (card.card_faces && card.card_faces[0] && card.card_faces[0][field]) {
      return card.card_faces[0][field];
    }
    return null;
  };

  // Core card data
  add('mana_cost', getFaceValue('mana_cost'), 'single_line_text_field');
  add('cmc', card.cmc, 'number_decimal');
  add('type_line', card.type_line, 'single_line_text_field');

  // card_type - type_line without subtypes (strips everything after em-dash)
  if (card.type_line) {
    const cardType = card.type_line
      .split(' — ')[0]      // Remove subtypes (after em-dash)
      .split(' // ')[0]     // Handle double-faced cards, take front face
      .trim();
    add('card_type', cardType, 'single_line_text_field');
  }
  add('colors', getFaceValue('colors'), 'list.single_line_text_field');
  add('color_identity', card.color_identity, 'list.single_line_text_field');
  add('keywords', card.keywords, 'list.single_line_text_field');
  add('oracle_text', card.oracle_text, 'multi_line_text_field');
  add('power', getFaceValue('power'), 'single_line_text_field');
  add('toughness', getFaceValue('toughness'), 'single_line_text_field');

  // Identifiers
  add('id', card.scryfall_id, 'single_line_text_field');
  add('oracle_id', card.oracle_id, 'single_line_text_field');

  // Legalities
  if (card.legalities) {
    add('legality_standard', card.legalities.standard, 'single_line_text_field');
    add('legality_modern', card.legalities.modern, 'single_line_text_field');
    add('legality_pioneer', card.legalities.pioneer, 'single_line_text_field');
    add('legality_legacy', card.legalities.legacy, 'single_line_text_field');
    add('legality_commander', card.legalities.commander, 'single_line_text_field');
    add('legality_pauper', card.legalities.pauper, 'single_line_text_field');
    add('legality_vintage', card.legalities.vintage, 'single_line_text_field');
  }

  return metafields;
}

/**
 * Update a batch of products using aliased mutations
 * This sends multiple productUpdate mutations in a single GraphQL request
 */
async function updateProductBatch(batch) {
  if (batch.length === 0) return { success: true, results: [] };

  // Build aliased mutation for each product in batch
  const mutationParts = batch.map((item, index) => {
    return `
      product${index}: productUpdate(input: $input${index}) {
        product { id }
        userErrors { field message }
      }
    `;
  });

  const mutation = `
    mutation batchProductUpdate(${batch.map((_, i) => `$input${i}: ProductInput!`).join(', ')}) {
      ${mutationParts.join('\n')}
    }
  `;

  const variables = {};
  batch.forEach((item, index) => {
    variables[`input${index}`] = {
      id: `gid://shopify/Product/${item.productId}`,
      metafields: item.metafields
    };
  });

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would update batch of ${batch.length} products`);
    return {
      success: true,
      results: batch.map(item => ({ productId: item.productId, success: true }))
    };
  }

  try {
    stats.apiCalls++;
    const result = await shopifyGraphQL(mutation, variables);

    // Process results for each product in batch
    const results = batch.map((item, index) => {
      const productResult = result.data?.[`product${index}`];
      const userErrors = productResult?.userErrors || [];

      if (userErrors.length > 0) {
        return {
          productId: item.productId,
          cardName: item.cardName,
          success: false,
          error: userErrors.map(e => `${e.field}: ${e.message}`).join(', ')
        };
      }

      return {
        productId: item.productId,
        cardName: item.cardName,
        success: true
      };
    });

    return { success: true, results };
  } catch (error) {
    // If batch fails, return failure for all items
    return {
      success: false,
      error: error.message,
      results: batch.map(item => ({
        productId: item.productId,
        cardName: item.cardName,
        success: false,
        error: error.message
      }))
    };
  }
}

/**
 * Main sync function
 */
async function sync() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Scryfall → Shopify Metafield Sync (BATCH OPTIMIZED)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Store: ${SHOPIFY_STORE}`);
  console.log(`  Batch Size: ${BATCH_SIZE} products per API call`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : TEST_BATCH_SIZE ? `TEST (${TEST_BATCH_SIZE} products)` : 'FULL SYNC'}`);
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log('');

  // Fetch bulk data
  console.log('📥 Fetching bulk data...');
  const bulkData = await fetchJson(BULK_DATA_URL);
  console.log(`   Loaded ${bulkData.data.length} card listings`);

  // Dedupe by product_id (multiple variants share same Scryfall data)
  const productMap = new Map();
  for (const card of bulkData.data) {
    const productId = card.cryptic_cabin?.product_id;
    if (!productId) continue;

    // Skip if no Scryfall data (oracle_id missing)
    if (!card.oracle_id) continue;

    // Only keep first variant per product
    if (!productMap.has(productId)) {
      productMap.set(productId, card);
    }
  }

  console.log(`   Deduped to ${productMap.size} unique products with Scryfall data`);

  // Convert to array and optionally limit
  let products = Array.from(productMap.entries());
  if (TEST_BATCH_SIZE) {
    products = products.slice(0, TEST_BATCH_SIZE);
    console.log(`   Limited to ${products.length} products for testing`);
  }

  stats.total = products.length;

  // Prepare all products with their metafields
  const productsToUpdate = [];
  for (const [productId, card] of products) {
    const metafields = buildMetafields(card);
    if (metafields.length > 0) {
      productsToUpdate.push({
        productId,
        cardName: card.name,
        metafields
      });
    } else {
      stats.skipped++;
    }
  }

  const totalBatches = Math.ceil(productsToUpdate.length / BATCH_SIZE);
  const estimatedCalls = totalBatches;
  const oldStyleCalls = productsToUpdate.length;

  console.log('');
  console.log('📤 Syncing metafields to Shopify...');
  console.log(`   Products to update: ${productsToUpdate.length}`);
  console.log(`   Batches: ${totalBatches} (${BATCH_SIZE} products each)`);
  console.log(`   Estimated API calls: ${estimatedCalls} (was ${oldStyleCalls} - ${Math.round((1 - estimatedCalls/oldStyleCalls) * 100)}% reduction)`);
  console.log('');

  // Process in batches
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, productsToUpdate.length);
    const batch = productsToUpdate.slice(start, end);

    const batchProgress = `[Batch ${batchIndex + 1}/${totalBatches}]`;

    const result = await updateProductBatch(batch);

    // Process results
    let batchSucceeded = 0;
    let batchFailed = 0;

    for (const itemResult of result.results) {
      if (itemResult.success) {
        stats.updated++;
        batchSucceeded++;
      } else {
        stats.failed++;
        batchFailed++;
        stats.errors.push({
          name: itemResult.cardName,
          productId: itemResult.productId,
          error: itemResult.error
        });
      }
    }

    if (batchFailed === 0) {
      console.log(`${batchProgress} ✅ ${batchSucceeded} products updated`);
    } else if (batchSucceeded === 0) {
      console.log(`${batchProgress} ❌ All ${batchFailed} products failed: ${result.error || 'See errors'}`);
    } else {
      console.log(`${batchProgress} ⚠️  ${batchSucceeded} succeeded, ${batchFailed} failed`);
    }

    // Rate limiting between batches
    if (batchIndex < totalBatches - 1) {
      await sleep(RATE_LIMIT_DELAY);
    }
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Sync Complete');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Total products:  ${stats.total}`);
  console.log(`  Updated:         ${stats.updated}`);
  console.log(`  Skipped:         ${stats.skipped}`);
  console.log(`  Failed:          ${stats.failed}`);
  console.log(`  API calls made:  ${stats.apiCalls} (saved ${oldStyleCalls - stats.apiCalls} calls)`);
  console.log(`  Finished:        ${new Date().toISOString()}`);

  if (stats.errors.length > 0) {
    console.log('');
    console.log('  Errors:');
    for (const err of stats.errors.slice(0, 10)) {
      console.log(`    - ${err.name}: ${err.error}`);
    }
    if (stats.errors.length > 10) {
      console.log(`    ... and ${stats.errors.length - 10} more`);
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
}

// Run
sync().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
