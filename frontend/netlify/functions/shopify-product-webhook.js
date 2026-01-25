/**
 * Shopify Product Webhook Handler
 *
 * Receives product webhooks from Shopify (create/update/delete)
 * and updates the bulk data blob in real-time.
 *
 * SIMPLIFIED: No Scryfall matching - just updates product data.
 * The scheduled bulk-data-refresh handles Scryfall enrichment.
 */

let getStore;
try {
  getStore = require('@netlify/blobs').getStore;
} catch (e) {
  console.error('Failed to import @netlify/blobs:', e.message);
}

const crypto = require('crypto');

// Config
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
const SITE_ID = process.env.CC_SITE_ID;
const BLOBS_TOKEN = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_ACCESS_TOKEN;

const BULK_DATA_STORE = 'bulk-data';
const BULK_DATA_KEY = 'inventory';

function getBlobStore(name) {
  if (!getStore) {
    throw new Error('@netlify/blobs not available');
  }
  const options = { name };
  if (SITE_ID) options.siteID = SITE_ID;
  if (BLOBS_TOKEN) options.token = BLOBS_TOKEN;
  return getStore(options);
}

function verifyWebhookSignature(body, signature) {
  if (!SHOPIFY_WEBHOOK_SECRET) {
    return true; // Skip if not configured
  }

  try {
    const hmac = crypto
      .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
      .update(body, 'utf8')
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error('Signature verification error:', error.message);
    return false;
  }
}

function parseProductTitle(title) {
  const result = { cardName: null, setCode: null, collectorNumber: null, rarity: null };
  if (!title) return result;

  let workingTitle = title.trim();

  // Extract [SET-NUMBER] from the end
  const bracketMatch = workingTitle.match(/\[([A-Z0-9]+)-(\d+[a-z]?)\]$/i);
  if (bracketMatch) {
    result.setCode = bracketMatch[1].toLowerCase();
    result.collectorNumber = bracketMatch[2];
    workingTitle = workingTitle.replace(/\s*\[[^\]]+\]$/, '').trim();
  }

  // Extract (Rarity) from the end
  const rarityMatch = workingTitle.match(/\(([^)]+)\)$/);
  if (rarityMatch) {
    const rarityText = rarityMatch[1].toLowerCase();
    if (rarityText.includes('mythic')) result.rarity = 'mythic';
    else if (rarityText === 'rare') result.rarity = 'rare';
    else if (rarityText === 'uncommon') result.rarity = 'uncommon';
    else if (rarityText === 'common') result.rarity = 'common';
    workingTitle = workingTitle.replace(/\s*\([^)]+\)$/, '').trim();
  }

  // Split by " - " for card name
  const dashIndex = workingTitle.indexOf(' - ');
  if (dashIndex > 0) {
    result.cardName = workingTitle.substring(0, dashIndex).trim();
  } else {
    result.cardName = workingTitle;
  }

  return result;
}

function parseVariantOptions(variant) {
  const result = { language: 'en', condition: 'NM', finish: 'nonfoil' };
  const variantTitle = (variant.title || '').toLowerCase();

  if (variantTitle.includes('foil') && !variantTitle.includes('non')) result.finish = 'foil';
  if (variantTitle.includes('etched')) result.finish = 'etched';
  if (variantTitle.includes('lp') || variantTitle.includes('lightly')) result.condition = 'LP';
  if (variantTitle.includes('mp') || variantTitle.includes('moderately')) result.condition = 'MP';
  if (variantTitle.includes('japanese')) result.language = 'ja';

  return result;
}

function isMtgProduct(product) {
  const productType = (product.product_type || '').toLowerCase();
  const tags = (product.tags || '').toLowerCase();
  return productType.includes('magic') || tags.includes('magic') || tags.includes('mtg');
}

exports.handler = async (event, context) => {
  console.log('🔔 Product webhook received');

  // Quick validation
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: '{"error":"Method not allowed"}' };
  }

  // Verify signature
  const signature = event.headers['x-shopify-hmac-sha256'];
  if (SHOPIFY_WEBHOOK_SECRET && signature) {
    if (!verifyWebhookSignature(event.body, signature)) {
      console.error('❌ Invalid webhook signature');
      return { statusCode: 401, body: '{"error":"Invalid signature"}' };
    }
  }

  const topic = event.headers['x-shopify-topic'];
  console.log(`📦 Topic: ${topic}`);

  try {
    const product = JSON.parse(event.body);
    const productId = product.id;

    if (!productId) {
      return { statusCode: 400, body: '{"error":"Missing product id"}' };
    }

    // Skip non-MTG products (except deletes)
    if (topic !== 'products/delete' && !isMtgProduct(product)) {
      console.log(`⏭️ Skipping non-MTG: ${product.title}`);
      return { statusCode: 200, body: '{"skipped":true}' };
    }

    console.log(`🎴 Processing: ${product.title || productId}`);

    const store = getBlobStore(BULK_DATA_STORE);

    // Load existing bulk data
    let bulkData;
    try {
      bulkData = await store.get(BULK_DATA_KEY, { type: 'json' });
    } catch (e) {
      console.error('❌ Failed to load bulk data:', e.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load bulk data' }) };
    }

    if (!bulkData?.data) {
      console.error('❌ Bulk data not initialized');
      return { statusCode: 500, body: '{"error":"Bulk data not initialized"}' };
    }

    let action = 'none';
    let cardsAffected = 0;

    if (topic === 'products/delete') {
      const before = bulkData.data.length;
      bulkData.data = bulkData.data.filter(card => card.cryptic_cabin?.product_id !== productId);
      cardsAffected = before - bulkData.data.length;
      action = 'deleted';

    } else if (topic === 'products/create' || topic === 'products/update') {
      // Remove existing entries
      bulkData.data = bulkData.data.filter(card => card.cryptic_cabin?.product_id !== productId);

      // Add new entries (without Scryfall enrichment - scheduled refresh handles that)
      const parsed = parseProductTitle(product.title);

      for (const variant of product.variants || []) {
        const variantOptions = parseVariantOptions(variant);
        const price = parseFloat(variant.price) || 0;
        const quantity = variant.inventory_quantity ?? 0;

        bulkData.data.push({
          id: `cc-${product.id}-${variant.id}`,
          name: parsed.cardName || product.title,
          set: parsed.setCode || 'unknown',
          collector_number: parsed.collectorNumber || '0',
          rarity: parsed.rarity || 'unknown',
          // Scryfall fields - will be populated by scheduled refresh
          oracle_id: null,
          scryfall_id: null,
          mana_cost: null,
          cmc: null,
          colors: [],
          type_line: null,
          // Store data
          cryptic_cabin: {
            product_id: product.id,
            variant_id: variant.id,
            sku: variant.sku || null,
            handle: product.handle,
            url: `https://tcg.crypticcabin.com/products/${product.handle}`,
            price_gbp: price,
            currency: 'GBP',
            quantity,
            in_stock: quantity > 0,
            condition: variantOptions.condition,
            finish: variantOptions.finish,
            language: variantOptions.language,
            last_updated: new Date().toISOString()
          },
          prices: {
            gbp: variantOptions.finish === 'nonfoil' && price > 0 ? price.toFixed(2) : null,
            gbp_foil: variantOptions.finish === 'foil' && price > 0 ? price.toFixed(2) : null
          },
          finishes: [variantOptions.finish],
          lang: variantOptions.language
        });
        cardsAffected++;
      }
      action = topic === 'products/create' ? 'created' : 'updated';
    }

    // Update statistics
    bulkData.total_cards = bulkData.data.length;
    bulkData.statistics.total_listings = bulkData.data.length;
    bulkData.statistics.in_stock = bulkData.data.filter(c => c.cryptic_cabin?.in_stock).length;
    bulkData.generated_at = new Date().toISOString();

    // Save back
    await store.setJSON(BULK_DATA_KEY, bulkData);

    console.log(`✅ ${action} ${cardsAffected} cards`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, action, cards_affected: cardsAffected })
    };

  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
