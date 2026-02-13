/**
 * Shopify Product Webhook - Lightweight Scryfall Enrichment
 *
 * On product create/update, looks up the single card on Scryfall's REST API
 * and writes metafields to Shopify. No bulk data loading, no Netlify Blobs -
 * just two fast HTTP calls per event (~1-2s).
 *
 * The scheduled sync-metafields job (twice daily) acts as a safety net for
 * any events this webhook misses.
 *
 * Webhook Setup in Shopify:
 * Settings > Notifications > Webhooks > Create webhook
 * - Events: Product creation, Product update
 * - URL: https://leagues.crypticcabin.com/api/shopify-product-webhook
 * - Format: JSON
 */

const crypto = require('crypto');

// --- Config ---
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'cryptic-cabin-tcg';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2025-10';

// --- Set code mappings (same as bulk-data-refresh) ---
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

// --- HMAC verification (same pattern as inventory webhook) ---
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

// --- Title parsing (same as bulk-data-refresh) ---
function parseProductTitle(title) {
  const result = { cardName: null, setName: null, setCode: null, collectorNumber: null };
  if (!title) return result;

  let working = title.trim();

  const bracketMatch = working.match(/\[([A-Z0-9]+)-(\d+[a-z]?)\]$/i);
  if (bracketMatch) {
    result.setCode = bracketMatch[1].toLowerCase();
    result.collectorNumber = bracketMatch[2];
    working = working.replace(/\s*\[[^\]]+\]$/, '').trim();
  }

  // Strip rarity suffix
  const rarityMatch = working.match(/\(([^)]+)\)$/);
  if (rarityMatch) {
    working = working.replace(/\s*\([^)]+\)$/, '').trim();
  }

  const dashIndex = working.indexOf(' - ');
  if (dashIndex > 0) {
    result.cardName = working.substring(0, dashIndex).trim();
    result.setName = working.substring(dashIndex + 3).trim();
  } else {
    result.cardName = working;
  }

  // Strip version suffixes like (V.2)
  const versionMatch = result.cardName?.match(/^(.+?)\s*\(V\.\d+\)$/i);
  if (versionMatch) result.cardName = versionMatch[1].trim();

  return result;
}

// --- Resolve set code through overrides ---
function resolveSetCode(setCode) {
  if (!setCode) return null;
  return SET_CODE_OVERRIDES[setCode] || setCode;
}

// --- Scryfall single-card lookup ---
async function lookupScryfall(parsed) {
  const headers = { 'User-Agent': 'CrypticCabin-Webhook/1.0' };
  let setCode = parsed.setCode;

  // Try multi-set mappings first
  if (setCode && MULTI_SET_MAPPINGS[setCode]) {
    for (const trySet of MULTI_SET_MAPPINGS[setCode]) {
      const card = await tryScryfallLookup(parsed.cardName, trySet, parsed.collectorNumber, headers);
      if (card) return card;
    }
  }

  // Apply set code overrides
  setCode = resolveSetCode(setCode);

  // 1. Set + collector number (most reliable)
  if (setCode && parsed.collectorNumber) {
    const card = await scryfallFetch(
      `https://api.scryfall.com/cards/${encodeURIComponent(setCode)}/${encodeURIComponent(parsed.collectorNumber)}`,
      headers
    );
    if (card) return card;

    // Try without leading zeros
    const numNoZero = parsed.collectorNumber.replace(/^0+/, '');
    if (numNoZero !== parsed.collectorNumber) {
      const card2 = await scryfallFetch(
        `https://api.scryfall.com/cards/${encodeURIComponent(setCode)}/${encodeURIComponent(numNoZero)}`,
        headers
      );
      if (card2) return card2;
    }
  }

  // 2. Exact name + set
  if (parsed.cardName && setCode) {
    const card = await scryfallFetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(parsed.cardName)}&set=${encodeURIComponent(setCode)}`,
      headers
    );
    if (card) return card;
  }

  // 3. Exact name only (latest printing)
  if (parsed.cardName) {
    return scryfallFetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(parsed.cardName)}`,
      headers
    );
  }

  return null;
}

async function tryScryfallLookup(cardName, setCode, collectorNumber, headers) {
  if (collectorNumber) {
    const card = await scryfallFetch(
      `https://api.scryfall.com/cards/${encodeURIComponent(setCode)}/${encodeURIComponent(collectorNumber)}`,
      headers
    );
    if (card) return card;
  }
  if (cardName) {
    return scryfallFetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&set=${encodeURIComponent(setCode)}`,
      headers
    );
  }
  return null;
}

async function scryfallFetch(url, headers) {
  try {
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      console.warn('Scryfall rate limited');
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    if (data.object === 'error') return null;
    return data;
  } catch (e) {
    console.error('Scryfall fetch error:', e.message);
    return null;
  }
}

// --- Build metafields (same logic as sync-metafields-background) ---
function buildMetafields(card) {
  const metafields = [];

  const add = (key, value, type) => {
    if (value === null || value === undefined || value === '') return;
    let formattedValue;
    if (type.startsWith('list.')) {
      if (!Array.isArray(value) || value.length === 0) return;
      formattedValue = JSON.stringify(value);
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
  add('id', card.id, 'single_line_text_field');
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

// --- Shopify GraphQL ---
async function updateProductMetafields(productId, metafields) {
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

  const url = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
    },
    body: JSON.stringify({ query: mutation, variables })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API ${res.status}: ${text}`);
  }

  const result = await res.json();
  const userErrors = result.data?.productUpdate?.userErrors || [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map(e => `${e.field}: ${e.message}`).join(', '));
  }
  return result;
}

// --- Filter: is this an MTG product? ---
function isMTGProduct(product) {
  const type = (product.product_type || '').toLowerCase();
  const tags = (product.tags || (Array.isArray(product.tags) ? product.tags.join(',') : '')).toLowerCase();
  return type.includes('magic') || tags.includes('magic') || tags.includes('mtg');
}

// --- Handler ---
exports.handler = async (event) => {
  // Always return 200 to prevent Shopify retry storms
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

    if (!SHOPIFY_ACCESS_TOKEN) {
      console.error('SHOPIFY_ACCESS_TOKEN not configured');
      return ok('skipped: no Shopify token');
    }

    // Parse title and look up on Scryfall
    const parsed = parseProductTitle(product.title);
    if (!parsed.cardName) return ok('skipped: could not parse card name');

    console.log(`Processing: "${product.title}" -> card="${parsed.cardName}" set=${parsed.setCode || '?'} #${parsed.collectorNumber || '?'}`);

    const scryfallCard = await lookupScryfall(parsed);
    if (!scryfallCard) {
      console.warn(`No Scryfall match for "${parsed.cardName}" (set=${parsed.setCode})`);
      return ok('skipped: no Scryfall match', { card: parsed.cardName });
    }

    // Build and push metafields
    const metafields = buildMetafields(scryfallCard);
    if (metafields.length === 0) return ok('skipped: no metafields to set');

    await updateProductMetafields(product.id, metafields);
    console.log(`Updated ${metafields.length} metafields for product ${product.id} ("${parsed.cardName}")`);

    return ok('processed', {
      product_id: product.id,
      card: parsed.cardName,
      scryfall_id: scryfallCard.id,
      metafields_set: metafields.length
    });
  } catch (error) {
    // Always 200 - log the error but don't trigger retries
    console.error('Webhook error:', error.message);
    return ok('error: ' + error.message);
  }
};
