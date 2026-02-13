/**
 * Metafield Sync - Background Worker
 *
 * Fetches bulk data and syncs Scryfall card data to Shopify product metafields.
 * Uses batch processing (25 products per API call) for efficiency.
 *
 * Required env vars:
 * - SHOPIFY_ACCESS_TOKEN: Admin API token with write_products scope
 * - SHOPIFY_STORE: Store subdomain (default: cryptic-cabin-tcg)
 */

const { getStore } = require('@netlify/blobs');

const BULK_DATA_URL = 'https://leagues.crypticcabin.com/bulk-data/cryptic-cabin-inventory.json';
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'cryptic-cabin-tcg';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2025-10';
const SITE_ID = process.env.CC_SITE_ID;
const BLOBS_TOKEN = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_ACCESS_TOKEN;

const BATCH_SIZE = 25;
const RATE_LIMIT_DELAY = 500;

function getBlobStore(name) {
  const options = { name };
  if (SITE_ID) options.siteID = SITE_ID;
  if (BLOBS_TOKEN) options.token = BLOBS_TOKEN;
  return getStore(options);
}

exports.handler = async (event, context) => {
  console.log('🔄 Metafield sync background worker started');
  console.log('Time:', new Date().toISOString());

  if (!SHOPIFY_ACCESS_TOKEN) {
    console.error('❌ SHOPIFY_ACCESS_TOKEN not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SHOPIFY_ACCESS_TOKEN not configured' })
    };
  }

  const stats = {
    total: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    apiCalls: 0,
    errors: []
  };

  try {
    // Fetch bulk data (blob store first, then static fallback)
    console.log('📥 Fetching bulk data...');
    let bulkData = null;
    try {
      const store = getBlobStore('bulk-data');
      bulkData = await store.get('inventory', { type: 'json' });
      if (bulkData) console.log('   Loaded from blob store');
    } catch (e) {
      console.log('   Blob store unavailable:', e.message);
    }
    if (!bulkData) {
      const response = await fetch(BULK_DATA_URL);
      if (!response.ok) throw new Error(`Failed to fetch bulk data: ${response.status}`);
      bulkData = await response.json();
      console.log('   Loaded from static URL');
    }
    console.log(`   ${bulkData.data.length} card listings`);

    // Dedupe by product_id
    const productMap = new Map();
    let missingScryfall = 0;
    for (const card of bulkData.data) {
      const productId = card.cryptic_cabin?.product_id;
      if (!productId) continue;
      if (!card.oracle_id) {
        missingScryfall++;
        continue;
      }
      if (!productMap.has(productId)) {
        productMap.set(productId, card);
      }
    }

    console.log(`   Deduped to ${productMap.size} unique products`);
    if (missingScryfall > 0) {
      console.warn(`   ⚠️ ${missingScryfall} cards missing Scryfall data — backfill needed`);
    }
    stats.total = productMap.size;
    stats.missingScryfall = missingScryfall;

    // Prepare products with metafields
    const productsToUpdate = [];
    for (const [productId, card] of productMap) {
      const metafields = buildMetafields(card);
      if (metafields.length > 0) {
        productsToUpdate.push({ productId, cardName: card.name, metafields });
      } else {
        stats.skipped++;
      }
    }

    const totalBatches = Math.ceil(productsToUpdate.length / BATCH_SIZE);
    console.log(`📤 Syncing ${productsToUpdate.length} products in ${totalBatches} batches`);

    // Process in batches
    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE;
      const batch = productsToUpdate.slice(start, start + BATCH_SIZE);

      const result = await updateProductBatch(batch, stats);

      for (const itemResult of result.results) {
        if (itemResult.success) {
          stats.updated++;
        } else {
          stats.failed++;
          stats.errors.push({
            name: itemResult.cardName,
            productId: itemResult.productId,
            error: itemResult.error
          });
        }
      }

      if (i < totalBatches - 1) {
        await sleep(RATE_LIMIT_DELAY);
      }

      // Log progress every 10 batches
      if ((i + 1) % 10 === 0) {
        console.log(`   Progress: ${i + 1}/${totalBatches} batches`);
      }
    }

    console.log('✅ Sync complete:', JSON.stringify(stats));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stats
      })
    };
  }
};

function buildMetafields(card) {
  const metafields = [];

  const add = (key, value, type) => {
    if (value === null || value === undefined || value === '') return;

    let formattedValue;
    if (type.startsWith('list.')) {
      if (!Array.isArray(value) || value.length === 0) return;
      formattedValue = JSON.stringify(value);
    } else if (type === 'number_decimal') {
      formattedValue = String(value);
    } else {
      formattedValue = String(value);
    }

    metafields.push({ namespace: 'custom', key, value: formattedValue, type });
  };

  const getFaceValue = (field) => {
    if (card[field] !== null && card[field] !== undefined) return card[field];
    if (card.card_faces?.[0]?.[field]) return card.card_faces[0][field];
    return null;
  };

  // Core card data
  add('mana_cost', getFaceValue('mana_cost'), 'single_line_text_field');
  add('cmc', card.cmc, 'number_decimal');
  add('type_line', card.type_line, 'single_line_text_field');

  if (card.type_line) {
    const cardType = card.type_line.split(' — ')[0].split(' // ')[0].trim();
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

async function updateProductBatch(batch, stats) {
  if (batch.length === 0) return { success: true, results: [] };

  const mutationParts = batch.map((_, i) => `
    product${i}: productUpdate(input: $input${i}) {
      product { id }
      userErrors { field message }
    }
  `);

  const mutation = `
    mutation batchProductUpdate(${batch.map((_, i) => `$input${i}: ProductInput!`).join(', ')}) {
      ${mutationParts.join('\n')}
    }
  `;

  const variables = {};
  batch.forEach((item, i) => {
    variables[`input${i}`] = {
      id: `gid://shopify/Product/${item.productId}`,
      metafields: item.metafields
    };
  });

  try {
    stats.apiCalls++;
    const result = await shopifyGraphQL(mutation, variables);

    return {
      success: true,
      results: batch.map((item, i) => {
        const productResult = result.data?.[`product${i}`];
        const userErrors = productResult?.userErrors || [];

        if (userErrors.length > 0) {
          return {
            productId: item.productId,
            cardName: item.cardName,
            success: false,
            error: userErrors.map(e => `${e.field}: ${e.message}`).join(', ')
          };
        }
        return { productId: item.productId, cardName: item.cardName, success: true };
      })
    };
  } catch (error) {
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

async function shopifyGraphQL(query, variables) {
  const url = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`❌ Shopify API error: ${response.status} - ${text}`);
    throw new Error(`Shopify API ${response.status}: ${text}`);
  }

  const result = await response.json();
  if (result.errors) {
    console.error('❌ GraphQL errors:', JSON.stringify(result.errors, null, 2));
    throw new Error(JSON.stringify(result.errors));
  }
  return result;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
