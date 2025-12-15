#!/usr/bin/env node

/**
 * Sync Scryfall Data to Shopify Product Metafields
 *
 * Fetches bulk data from our API and populates Shopify metafields
 * with card data (mana cost, colors, legalities, etc.)
 */

const https = require('https');

// Configuration
const BULK_DATA_URL = 'https://leagues.crypticcabin.com/bulk-data/cryptic-cabin-inventory.json';
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'cryptic-cabin-tcg';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2025-01';
const RATE_LIMIT_DELAY = 50; // ms between requests (Shopify allows 40 req/sec)

// Test mode - set to a number to limit products, or false for full sync
const TEST_BATCH_SIZE = process.argv.includes('--test') ? 20 : false;
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
 * Update a single product's metafields
 */
async function updateProduct(productId, metafields, cardName) {
  const mutation = `
    mutation productUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    input: {
      id: `gid://shopify/Product/${productId}`,
      metafields
    }
  };

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would update ${cardName} (${productId}) with ${metafields.length} metafields`);
    return { success: true };
  }

  try {
    const result = await shopifyGraphQL(mutation, variables);

    if (result.data?.productUpdate?.userErrors?.length > 0) {
      const errors = result.data.productUpdate.userErrors;
      throw new Error(errors.map(e => `${e.field}: ${e.message}`).join(', '));
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Main sync function
 */
async function sync() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Scryfall → Shopify Metafield Sync');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Store: ${SHOPIFY_STORE}`);
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
  console.log('');
  console.log('📤 Syncing metafields to Shopify...');

  // Process each product
  for (let i = 0; i < products.length; i++) {
    const [productId, card] = products[i];
    const progress = `[${i + 1}/${products.length}]`;

    // Build metafields
    const metafields = buildMetafields(card);

    if (metafields.length === 0) {
      console.log(`${progress} ⏭️  ${card.name} - no metafields to update`);
      stats.skipped++;
      continue;
    }

    // Update product
    const result = await updateProduct(productId, metafields, card.name);

    if (result.success) {
      console.log(`${progress} ✅ ${card.name} (${metafields.length} fields)`);
      stats.updated++;
    } else {
      console.log(`${progress} ❌ ${card.name} - ${result.error}`);
      stats.failed++;
      stats.errors.push({ name: card.name, productId, error: result.error });
    }

    // Rate limiting
    if (i < products.length - 1) {
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
