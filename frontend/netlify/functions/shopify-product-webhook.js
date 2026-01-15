/**
 * Shopify Product Webhook Handler
 *
 * Receives product webhooks from Shopify (create/update/delete)
 * and updates the bulk data blob in real-time.
 *
 * Webhook Setup in Shopify:
 * Settings > Notifications > Webhooks > Create webhook
 * - Events: Product creation, Product update, Product deletion
 * - URL: https://leagues.crypticcabin.com/api/shopify-product-webhook
 * - Format: JSON
 */

const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

// Config
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
const SITE_ID = process.env.CC_SITE_ID;
const BLOBS_TOKEN = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_ACCESS_TOKEN;

const BULK_DATA_STORE = 'bulk-data';
const BULK_DATA_KEY = 'inventory';
const SCRYFALL_BLOB_KEY = 'scryfall-cache';

const SET_CODE_OVERRIDES = {
  'babp': 'pbook', 'znl': 'plst', 'sldfs': 'sld',
  'xafc': 'afc', 'xafr': 'afr', 'xbrc': 'brc', 'xbro': 'bro',
  'xclb': 'clb', 'xcmm': 'cmm', 'xcmr': 'cmr', 'xdmu': 'dmu',
  'xdsk': 'dsk', 'xeoc': 'eoc', 'xeoe': 'eoe', 'xfin': 'fin',
  'xlci': 'lci', 'xln': 'xln', 'xltc': 'ltc', 'xltr': 'ltr',
  'xm3c': 'm3c', 'xmat': 'mat', 'xmh3': 'mh3', 'xmid': 'mid',
  'xmkm': 'mkm', 'xmom': 'mom', 'xncc': 'ncc', 'xneo': 'neo',
  'xotj': 'otj', 'xpip': 'pip', 'xrvr': 'rvr', 'xsld': 'sld',
  'xsnc': 'snc', 'xtdm': 'tdm', 'xtla': 'tla', 'xunf': 'unf',
  'xvow': 'vow', 'xwho': 'who', 'xwoc': 'woc', 'xwoe': 'woe'
};

const MULTI_SET_MAPPINGS = { 'ltrh': ['ltr', 'ltc'] };

function getBlobStore(name) {
  const options = { name };
  if (SITE_ID) options.siteID = SITE_ID;
  if (BLOBS_TOKEN) options.token = BLOBS_TOKEN;
  return getStore(options);
}

function verifyWebhookSignature(body, signature) {
  if (!SHOPIFY_WEBHOOK_SECRET) {
    console.warn('⚠️ SHOPIFY_WEBHOOK_SECRET not set - skipping verification');
    return true;
  }

  try {
    const hmac = crypto
      .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
      .update(body, 'utf8')
      .digest('base64');

    const hmacBuffer = Buffer.from(hmac);
    const signatureBuffer = Buffer.from(signature);

    if (hmacBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(hmacBuffer, signatureBuffer);
  } catch (error) {
    console.error('Signature verification error:', error.message);
    return false;
  }
}

function parseProductTitle(title) {
  const result = { cardName: null, setName: null, setCode: null, collectorNumber: null, rarity: null };
  if (!title) return result;

  let workingTitle = title.trim();
  const bracketMatch = workingTitle.match(/\[([A-Z0-9]+)-(\d+[a-z]?)\]$/i);
  if (bracketMatch) {
    result.setCode = bracketMatch[1].toLowerCase();
    result.collectorNumber = bracketMatch[2];
    workingTitle = workingTitle.replace(/\s*\[[^\]]+\]$/, '').trim();
  }

  const rarityMatch = workingTitle.match(/\(([^)]+)\)$/);
  if (rarityMatch) {
    const rarityText = rarityMatch[1].toLowerCase();
    if (rarityText.includes('mythic')) result.rarity = 'mythic';
    else if (rarityText === 'rare') result.rarity = 'rare';
    else if (rarityText === 'uncommon') result.rarity = 'uncommon';
    else if (rarityText === 'common') result.rarity = 'common';
    else result.rarity = rarityText;
    workingTitle = workingTitle.replace(/\s*\([^)]+\)$/, '').trim();
  }

  const dashIndex = workingTitle.indexOf(' - ');
  if (dashIndex > 0) {
    result.cardName = workingTitle.substring(0, dashIndex).trim();
    result.setName = workingTitle.substring(dashIndex + 3).trim();
  } else {
    result.cardName = workingTitle;
  }

  const versionMatch = result.cardName?.match(/^(.+?)\s*\(V\.\d+\)$/i);
  if (versionMatch) result.cardName = versionMatch[1].trim();

  return result;
}

function parseVariantOptions(variant) {
  const result = { language: 'en', condition: 'NM', finish: 'nonfoil' };
  const options = variant.options || [];
  const variantTitle = (variant.title || '').toLowerCase();

  for (const option of options) {
    const opt = option.toLowerCase();
    if (opt.includes('foil') && !opt.includes('non')) result.finish = 'foil';
    if (opt.includes('etched')) result.finish = 'etched';
    if (opt.includes('near mint') || opt === 'nm') result.condition = 'NM';
    else if (opt.includes('lightly played') || opt === 'lp') result.condition = 'LP';
    else if (opt.includes('moderately played') || opt === 'mp') result.condition = 'MP';
    else if (opt.includes('heavily played') || opt === 'hp') result.condition = 'HP';
    if (opt === 'japanese' || opt === 'jp') result.language = 'ja';
    else if (opt === 'german') result.language = 'de';
    else if (opt === 'french') result.language = 'fr';
  }

  if (variantTitle.includes('foil') && result.finish === 'nonfoil') result.finish = 'foil';
  if (variantTitle.includes('etched')) result.finish = 'etched';

  return result;
}

function normalizeCardName(name) {
  if (!name) return '';
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
}

function matchToScryfall(parsed, scryfallData) {
  if (!scryfallData) return null;

  let setCode = parsed.setCode;
  const normalizedName = normalizeCardName(parsed.cardName);

  if (setCode && MULTI_SET_MAPPINGS[setCode]) {
    for (const trySet of MULTI_SET_MAPPINGS[setCode]) {
      if (parsed.collectorNumber) {
        const match = scryfallData.bySetNumber.get(`${trySet}-${parsed.collectorNumber}`);
        if (match && normalizeCardName(match.name) === normalizedName) return match;
      }
      if (parsed.cardName) {
        const match = scryfallData.byNameSet.get(`${parsed.cardName.toLowerCase()}-${trySet}`);
        if (match) return match;
      }
    }
  }

  if (setCode && SET_CODE_OVERRIDES[setCode]) setCode = SET_CODE_OVERRIDES[setCode];

  if (setCode && parsed.collectorNumber) {
    let match = scryfallData.bySetNumber.get(`${setCode}-${parsed.collectorNumber}`);
    if (match) return match;
    const numNoZero = parsed.collectorNumber.replace(/^0+/, '');
    if (numNoZero !== parsed.collectorNumber) {
      match = scryfallData.bySetNumber.get(`${setCode}-${numNoZero}`);
      if (match) return match;
    }
  }

  if (parsed.cardName && setCode) {
    const match = scryfallData.byNameSet.get(`${parsed.cardName.toLowerCase()}-${setCode}`);
    if (match) return match;
  }

  if (parsed.cardName) return scryfallData.byName.get(parsed.cardName.toLowerCase());
  return null;
}

function transformToCard(product, variant, parsed, variantOptions, scryfallCard) {
  const price = parseFloat(variant.price) || 0;
  const compareAt = variant.compare_at_price ? parseFloat(variant.compare_at_price) : null;
  const quantity = variant.inventory_quantity ?? 0;
  const inStock = variant.available !== false && quantity > 0;

  return {
    id: `cc-${product.id}-${variant.id}`,
    oracle_id: scryfallCard?.oracle_id || null,
    scryfall_id: scryfallCard?.id || null,
    name: parsed.cardName || product.title,
    set: parsed.setCode || 'unknown',
    set_name: parsed.setName || scryfallCard?.set_name || null,
    collector_number: parsed.collectorNumber || '0',
    rarity: parsed.rarity || scryfallCard?.rarity || 'unknown',
    mana_cost: scryfallCard?.mana_cost || null,
    cmc: scryfallCard?.cmc ?? null,
    type_line: scryfallCard?.type_line || null,
    oracle_text: scryfallCard?.oracle_text || null,
    power: scryfallCard?.power || null,
    toughness: scryfallCard?.toughness || null,
    colors: scryfallCard?.colors || [],
    color_identity: scryfallCard?.color_identity || [],
    keywords: scryfallCard?.keywords || [],
    legalities: scryfallCard?.legalities || {},
    image_uris: scryfallCard?.image_uris || { small: product.images?.[0]?.src, normal: product.images?.[0]?.src },
    card_faces: scryfallCard?.card_faces || null,
    layout: scryfallCard?.layout || 'normal',
    cryptic_cabin: {
      product_id: product.id,
      variant_id: variant.id,
      inventory_item_id: variant.inventory_item_id || null,
      sku: variant.sku || null,
      handle: product.handle,
      url: `https://tcg.crypticcabin.com/products/${product.handle}`,
      price_gbp: price,
      compare_at_price_gbp: compareAt,
      currency: 'GBP',
      quantity,
      in_stock: inStock,
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
  };
}

function isMtgProduct(product) {
  const productType = (product.product_type || '').toLowerCase();
  const tags = (product.tags || '').toLowerCase();
  return productType.includes('magic') || tags.includes('magic') || tags.includes('mtg');
}

async function loadScryfallCache() {
  const store = getBlobStore(BULK_DATA_STORE);

  try {
    const cached = await store.get(SCRYFALL_BLOB_KEY, { type: 'json' });
    if (cached && cached.bySetNumber) {
      console.log(`Loaded Scryfall cache (${cached.entries} entries)`);
      return {
        bySetNumber: new Map(cached.bySetNumber),
        byNameSet: new Map(cached.byNameSet),
        byName: new Map(cached.byName)
      };
    }
  } catch (e) {
    console.log('No Scryfall cache available');
  }

  return null;
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Verify signature
  const signature = event.headers['x-shopify-hmac-sha256'];
  if (SHOPIFY_WEBHOOK_SECRET && !signature) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Missing signature' }) };
  }

  if (signature && !verifyWebhookSignature(event.body, signature)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid signature' }) };
  }

  // Determine webhook topic from header
  const topic = event.headers['x-shopify-topic'];
  console.log(`📦 Product webhook: ${topic}`);

  try {
    const product = JSON.parse(event.body);
    const productId = product.id;

    if (!productId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing product id' }) };
    }

    // Skip non-MTG products
    if (topic !== 'products/delete' && !isMtgProduct(product)) {
      console.log(`Skipping non-MTG product: ${product.title}`);
      return { statusCode: 200, body: JSON.stringify({ success: true, skipped: true, reason: 'non-mtg' }) };
    }

    const store = getBlobStore(BULK_DATA_STORE);

    // Load existing bulk data
    let bulkData;
    try {
      bulkData = await store.get(BULK_DATA_KEY, { type: 'json' });
    } catch (e) {
      console.error('Failed to load bulk data:', e.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load bulk data' }) };
    }

    if (!bulkData || !bulkData.data) {
      console.error('Bulk data not initialized');
      return { statusCode: 500, body: JSON.stringify({ error: 'Bulk data not initialized' }) };
    }

    const originalCount = bulkData.data.length;
    let action = 'none';
    let cardsAffected = 0;

    if (topic === 'products/delete') {
      // Remove all variants for this product
      const before = bulkData.data.length;
      bulkData.data = bulkData.data.filter(card => card.cryptic_cabin?.product_id !== productId);
      cardsAffected = before - bulkData.data.length;
      action = 'deleted';
      console.log(`Deleted ${cardsAffected} cards for product ${productId}`);

    } else if (topic === 'products/create' || topic === 'products/update') {
      // Load Scryfall data for matching
      const scryfallData = await loadScryfallCache();

      // Remove existing entries for this product (for update)
      bulkData.data = bulkData.data.filter(card => card.cryptic_cabin?.product_id !== productId);

      // Parse and add all variants
      const parsed = parseProductTitle(product.title);
      const newCards = [];

      for (const variant of product.variants || []) {
        const variantOptions = parseVariantOptions(variant);
        const scryfallCard = matchToScryfall(parsed, scryfallData);
        const card = transformToCard(product, variant, parsed, variantOptions, scryfallCard);
        newCards.push(card);
      }

      bulkData.data.push(...newCards);
      cardsAffected = newCards.length;
      action = topic === 'products/create' ? 'created' : 'updated';
      console.log(`${action} ${cardsAffected} cards for product: ${product.title}`);
    }

    // Update statistics
    const inStock = bulkData.data.filter(c => c.cryptic_cabin?.in_stock).length;
    bulkData.total_cards = bulkData.data.length;
    bulkData.statistics.total_listings = bulkData.data.length;
    bulkData.statistics.in_stock = inStock;
    bulkData.generated_at = new Date().toISOString();

    // Sort by name
    bulkData.data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Save back to blob
    await store.setJSON(BULK_DATA_KEY, bulkData);

    console.log(`✅ Bulk data updated: ${originalCount} → ${bulkData.data.length} cards`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        action,
        product_id: productId,
        cards_affected: cardsAffected,
        total_cards: bulkData.data.length,
        in_stock: inStock
      })
    };

  } catch (error) {
    console.error('Webhook error:', error.message, error.stack);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error', details: error.message }) };
  }
};
