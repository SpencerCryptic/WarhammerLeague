/**
 * Process Product Queue - Background Worker
 *
 * Receives a batch of queued products (already deduplicated by product ID
 * from the blob queue). For each product:
 * 1. Check if already enriched (has oracle_id metafield in Shopify)
 * 2. Parse title -> Scryfall lookup -> build metafields
 * 3. Batch update Shopify metafields
 *
 * Rate limits: 110ms between Scryfall calls, 500ms between Shopify writes.
 * Runs as a background function with 15 min timeout.
 */

const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'cryptic-cabin-tcg';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2025-10';

// Rate limiting
const SCRYFALL_DELAY_MS = 110;     // Stay under 10 req/s
const SHOPIFY_WRITE_DELAY_MS = 500;

// --- Set code mappings ---
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Title parsing ---
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

  const versionMatch = result.cardName?.match(/^(.+?)\s*\(V\.\d+\)$/i);
  if (versionMatch) result.cardName = versionMatch[1].trim();

  return result;
}

// --- Scryfall lookup ---
function resolveSetCode(setCode) {
  if (!setCode) return null;
  return SET_CODE_OVERRIDES[setCode] || setCode;
}

async function lookupScryfall(parsed) {
  const headers = { 'User-Agent': 'CrypticCabin-QueueWorker/1.0' };
  let setCode = parsed.setCode;

  if (setCode && MULTI_SET_MAPPINGS[setCode]) {
    for (const trySet of MULTI_SET_MAPPINGS[setCode]) {
      const card = await tryScryfallLookup(parsed.cardName, trySet, parsed.collectorNumber, headers);
      if (card) return card;
    }
  }

  setCode = resolveSetCode(setCode);

  if (setCode && parsed.collectorNumber) {
    const card = await scryfallFetch(
      `https://api.scryfall.com/cards/${encodeURIComponent(setCode)}/${encodeURIComponent(parsed.collectorNumber)}`,
      headers
    );
    if (card) return card;

    const numNoZero = parsed.collectorNumber.replace(/^0+/, '');
    if (numNoZero !== parsed.collectorNumber) {
      const card2 = await scryfallFetch(
        `https://api.scryfall.com/cards/${encodeURIComponent(setCode)}/${encodeURIComponent(numNoZero)}`,
        headers
      );
      if (card2) return card2;
    }
  }

  if (parsed.cardName && setCode) {
    const card = await scryfallFetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(parsed.cardName)}&set=${encodeURIComponent(setCode)}`,
      headers
    );
    if (card) return card;
  }

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
      await sleep(1000);
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

// --- Build metafields ---
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
  add('id', card.id, 'single_line_text_field');
  add('oracle_id', card.oracle_id, 'single_line_text_field');

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

// --- Shopify GraphQL with retry ---
async function shopifyGraphQL(query, variables) {
  const url = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      },
      body: JSON.stringify({ query, variables })
    });
    if (!res.ok) {
      if (res.status === 429 && attempt < 4) {
        const wait = Math.pow(2, attempt + 1) * 1000;
        console.warn(`Rate limited (429), retrying in ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      const text = await res.text();
      throw new Error(`Shopify API ${res.status}: ${text}`);
    }
    const result = await res.json();
    if (result.errors) {
      const isThrottled = result.errors.some(e => e.extensions?.code === 'THROTTLED');
      if (isThrottled && attempt < 4) {
        const wait = Math.pow(2, attempt + 1) * 1000;
        console.warn(`Throttled, retrying in ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      throw new Error(JSON.stringify(result.errors));
    }
    return result;
  }
}

// --- Check if product already has oracle_id in Shopify ---
async function productHasOracleId(productId) {
  const query = `{
    product(id: "gid://shopify/Product/${productId}") {
      metafield(namespace: "custom", key: "oracle_id") {
        value
      }
    }
  }`;
  try {
    const result = await shopifyGraphQL(query, {});
    return !!result.data?.product?.metafield?.value;
  } catch (e) {
    console.warn(`Failed to check oracle_id for product ${productId}:`, e.message);
    return false;
  }
}

// --- Update product metafields ---
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

  const result = await shopifyGraphQL(mutation, variables);
  const userErrors = result.data?.productUpdate?.userErrors || [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map(e => `${e.field}: ${e.message}`).join(', '));
  }
  return result;
}

// --- Main handler ---
exports.handler = async (event, context) => {
  console.log('Product queue background worker started at', new Date().toISOString());

  if (!SHOPIFY_ACCESS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SHOPIFY_ACCESS_TOKEN not set' }) };
  }

  let products;
  try {
    const body = JSON.parse(event.body || '{}');
    products = body.products || [];
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (products.length === 0) {
    console.log('No products to process');
    return { statusCode: 200, body: JSON.stringify({ message: 'No products', stats: {} }) };
  }

  console.log(`Processing ${products.length} queued products`);

  const stats = { total: products.length, skippedEnriched: 0, enriched: 0, scryfallMisses: 0, parseFailures: 0, failed: 0 };

  for (const entry of products) {
    try {
      // Skip if already enriched (breaks feedback loop at processing time)
      const alreadyEnriched = await productHasOracleId(entry.product_id);
      if (alreadyEnriched) {
        stats.skippedEnriched++;
        continue;
      }

      // Parse title
      const parsed = parseProductTitle(entry.title);
      if (!parsed.cardName) {
        stats.parseFailures++;
        continue;
      }

      // Scryfall lookup
      const scryfallCard = await lookupScryfall(parsed);
      await sleep(SCRYFALL_DELAY_MS);

      if (!scryfallCard) {
        stats.scryfallMisses++;
        if (stats.scryfallMisses <= 10) {
          console.warn(`No Scryfall match: "${entry.title}"`);
        }
        continue;
      }

      // Build and write metafields
      const metafields = buildMetafields(scryfallCard);
      if (metafields.length === 0) continue;

      await updateProductMetafields(entry.product_id, metafields);
      stats.enriched++;
      console.log(`Enriched product ${entry.product_id}: "${parsed.cardName}" (${metafields.length} metafields)`);

      await sleep(SHOPIFY_WRITE_DELAY_MS);
    } catch (error) {
      stats.failed++;
      console.error(`Failed product ${entry.product_id} ("${entry.title}"):`, error.message);
    }
  }

  console.log('Queue processing complete. Stats:', JSON.stringify(stats));

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, stats })
  };
};
