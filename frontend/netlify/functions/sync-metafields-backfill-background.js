/**
 * Metafield Backfill - Background Worker
 *
 * Fetches MTG products from Shopify, looks up each card on Scryfall,
 * and pushes metafields. Processes products in batches with cursor-based
 * progress tracking so it can resume across invocations.
 *
 * At 5k products this completes in one run (~10 min).
 * At 300k products it processes ~4k per run and resumes on next trigger.
 *
 * Trigger: POST to /api/sync-metafields-backfill (manual) or scheduled.
 *
 * Required env vars:
 * - SHOPIFY_ACCESS_TOKEN
 * - SHOPIFY_STORE (default: cryptic-cabin-tcg)
 * - CC_SITE_ID / NETLIFY_BLOBS_TOKEN (for progress tracking)
 */

const { getStore } = require('@netlify/blobs');

const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'cryptic-cabin-tcg';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2025-10';
const SITE_ID = process.env.CC_SITE_ID;
const BLOBS_TOKEN = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_ACCESS_TOKEN;

// Processing limits per invocation
const MAX_SCRYFALL_PER_RUN = 4000; // ~7 min at 100ms spacing
const SCRYFALL_DELAY_MS = 110;     // Stay under 10 req/s
const SHOPIFY_BATCH_SIZE = 25;
const SHOPIFY_BATCH_DELAY_MS = 500;

// Set code mappings (same as webhook and bulk-data-refresh)
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

function getBlobStore() {
  const options = { name: 'backfill-progress' };
  if (SITE_ID) options.siteID = SITE_ID;
  if (BLOBS_TOKEN) options.token = BLOBS_TOKEN;
  return getStore(options);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Title parsing ---
function parseProductTitle(title) {
  const result = { cardName: null, setCode: null, collectorNumber: null };
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
  } else {
    result.cardName = working;
  }

  const versionMatch = result.cardName?.match(/^(.+?)\s*\(V\.\d+\)$/i);
  if (versionMatch) result.cardName = versionMatch[1].trim();

  return result;
}

// --- Scryfall lookup ---
async function lookupScryfall(parsed) {
  const headers = { 'User-Agent': 'CrypticCabin-Backfill/1.0' };
  let setCode = parsed.setCode;

  if (setCode && MULTI_SET_MAPPINGS[setCode]) {
    for (const trySet of MULTI_SET_MAPPINGS[setCode]) {
      const card = await tryScryfallLookup(parsed.cardName, trySet, parsed.collectorNumber, headers);
      if (card) return card;
    }
  }

  if (setCode && SET_CODE_OVERRIDES[setCode]) setCode = SET_CODE_OVERRIDES[setCode];

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
      await sleep(1000); // Back off on rate limit
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    if (data.object === 'error') return null;
    return data;
  } catch {
    return null;
  }
}

// --- Metafield builder (same as webhook / sync-metafields) ---
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

// --- Shopify helpers ---
async function shopifyGraphQL(query, variables) {
  const url = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
    },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API ${res.status}: ${text}`);
  }
  const result = await res.json();
  if (result.errors) throw new Error(JSON.stringify(result.errors));
  return result;
}

async function fetchProductPage(cursor) {
  const afterClause = cursor ? `, after: "${cursor}"` : '';
  const query = `{
    products(first: 250${afterClause}, query: "tag:magic OR tag:mtg OR product_type:magic") {
      edges {
        cursor
        node {
          id
          title
          productType
          tags
          metafield(namespace: "custom", key: "oracle_id") {
            value
          }
        }
      }
      pageInfo { hasNextPage }
    }
  }`;
  return shopifyGraphQL(query, {});
}

function extractNumericId(gid) {
  const match = gid.match(/\/(\d+)$/);
  return match ? match[1] : gid;
}

async function updateProductBatch(batch) {
  if (batch.length === 0) return [];

  const mutationParts = batch.map((_, i) => `
    product${i}: productUpdate(input: $input${i}) {
      product { id }
      userErrors { field message }
    }
  `);

  const mutation = `
    mutation batchUpdate(${batch.map((_, i) => `$input${i}: ProductInput!`).join(', ')}) {
      ${mutationParts.join('\n')}
    }
  `;

  const variables = {};
  batch.forEach((item, i) => {
    variables[`input${i}`] = {
      id: item.gid,
      metafields: item.metafields
    };
  });

  const result = await shopifyGraphQL(mutation, variables);

  return batch.map((item, i) => {
    const errors = result.data?.[`product${i}`]?.userErrors || [];
    return { title: item.title, success: errors.length === 0, errors };
  });
}

// --- Main handler ---
exports.handler = async (event, context) => {
  console.log('Metafield backfill started at', new Date().toISOString());

  if (!SHOPIFY_ACCESS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SHOPIFY_ACCESS_TOKEN not set' }) };
  }

  const stats = { scanned: 0, needsEnrichment: 0, enriched: 0, scryfallMisses: 0, failed: 0, alreadyDone: 0 };
  let scryfallCalls = 0;

  // Load progress cursor from previous run
  let startCursor = null;
  const store = getBlobStore();
  try {
    const progress = await store.get('cursor', { type: 'json' });
    if (progress?.cursor) {
      startCursor = progress.cursor;
      console.log(`Resuming from cursor: ${startCursor}`);
    }
  } catch {
    // No previous progress, start from beginning
  }

  let cursor = startCursor;
  let hasNextPage = true;
  let pendingBatch = [];

  try {
    while (hasNextPage && scryfallCalls < MAX_SCRYFALL_PER_RUN) {
      const result = await fetchProductPage(cursor);
      const edges = result.data?.products?.edges || [];
      hasNextPage = result.data?.products?.pageInfo?.hasNextPage || false;

      for (const edge of edges) {
        const product = edge.node;
        cursor = edge.cursor;
        stats.scanned++;

        // Skip if oracle_id metafield already populated
        if (product.metafield?.value) {
          stats.alreadyDone++;
          continue;
        }

        // Skip non-MTG (safety check beyond GraphQL query filter)
        const tags = (product.tags || []).join(',').toLowerCase();
        const type = (product.productType || '').toLowerCase();
        if (!type.includes('magic') && !tags.includes('magic') && !tags.includes('mtg')) {
          continue;
        }

        stats.needsEnrichment++;

        // Parse and lookup on Scryfall
        const parsed = parseProductTitle(product.title);
        if (!parsed.cardName) continue;

        const scryfallCard = await lookupScryfall(parsed);
        scryfallCalls++;
        await sleep(SCRYFALL_DELAY_MS);

        if (!scryfallCard) {
          stats.scryfallMisses++;
          if (stats.scryfallMisses <= 10) {
            console.warn(`No match: "${product.title}"`);
          }
          continue;
        }

        const metafields = buildMetafields(scryfallCard);
        if (metafields.length === 0) continue;

        pendingBatch.push({
          gid: product.id,
          title: product.title,
          metafields
        });

        // Flush batch when full
        if (pendingBatch.length >= SHOPIFY_BATCH_SIZE) {
          const results = await updateProductBatch(pendingBatch);
          for (const r of results) {
            if (r.success) stats.enriched++;
            else stats.failed++;
          }
          pendingBatch = [];
          await sleep(SHOPIFY_BATCH_DELAY_MS);
        }
      }

      // Save progress after each page
      await store.setJSON('cursor', { cursor, timestamp: new Date().toISOString(), stats });

      if (stats.scanned % 500 === 0) {
        console.log(`Progress: scanned=${stats.scanned} enriched=${stats.enriched} skipped=${stats.alreadyDone}`);
      }
    }

    // Flush remaining batch
    if (pendingBatch.length > 0) {
      const results = await updateProductBatch(pendingBatch);
      for (const r of results) {
        if (r.success) stats.enriched++;
        else stats.failed++;
      }
    }

    // Clear progress if we've processed everything
    if (!hasNextPage) {
      await store.setJSON('cursor', { cursor: null, completed: new Date().toISOString(), stats });
      console.log('Backfill complete - all products processed');
    } else {
      console.log(`Paused at cursor ${cursor} - hit Scryfall call limit (${scryfallCalls}). Re-trigger to continue.`);
    }

    console.log('Stats:', JSON.stringify(stats));

    return {
      statusCode: 200,
      body: JSON.stringify({
        complete: !hasNextPage,
        stats,
        scryfallCalls,
        resumeCursor: hasNextPage ? cursor : null
      })
    };
  } catch (error) {
    // Save progress even on error so we can resume
    if (cursor) {
      try {
        await store.setJSON('cursor', { cursor, error: error.message, timestamp: new Date().toISOString(), stats });
      } catch { /* best effort */ }
    }
    console.error('Backfill error:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message, stats }) };
  }
};
