/**
 * Bulk Data Filtered API — Faceted Search for Collection Pages
 *
 * GET /api/bulk-data/filtered
 *
 * Serves paginated, filtered product data with cross-filtered facet counts.
 * Designed for the client-side collection filter JS that bypasses Shopify's
 * 5,000 product collection filter limit.
 *
 * Query params:
 *   Filters:  set, rarity, colors, card_type, cmc, keywords, q, finish,
 *             condition, in_stock, min_price, max_price
 *   Sort:     sort (name|price|set|cmc|rarity), dir (asc|desc)
 *   Paging:   page (default 1), page_size (default 24, max 100)
 *   Options:  facets (true|false, default true)
 *             dedupe (true|false, default true — group variants by product_id)
 */

const { getStore } = require('@netlify/blobs');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);

const SITE_ID = process.env.CC_SITE_ID;
const BLOBS_TOKEN = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_ACCESS_TOKEN;
const STATIC_URL = 'https://leagues.crypticcabin.com/bulk-data/cryptic-cabin-inventory.json';

function getBlobStore(name) {
  const options = { name };
  if (SITE_ID) options.siteID = SITE_ID;
  if (BLOBS_TOKEN) options.token = BLOBS_TOKEN;
  return getStore(options);
}

// ── Data loading (same as production bulk-data.js) ──────────────────

let dataCache = null;
let dataCacheTime = 0;
const DATA_CACHE_TTL = 60_000; // 1 minute in-memory cache

async function loadData() {
  if (dataCache && Date.now() - dataCacheTime < DATA_CACHE_TTL) {
    return dataCache;
  }

  let bulkData = null;

  // Try blob store
  try {
    const store = getBlobStore('bulk-data');
    bulkData = await store.get('inventory', { type: 'json' });
  } catch (e) {
    console.log('Blob load failed:', e.message);
  }

  // Fallback to static file
  if (!bulkData) {
    const res = await fetch(STATIC_URL);
    if (res.ok) bulkData = await res.json();
  }

  if (!bulkData) throw new Error('Bulk data unavailable');

  // Apply live inventory overlay
  try {
    const liveStore = getBlobStore('live-inventory');
    const liveInventory = await liveStore.get('inventory', { type: 'json' });
    if (liveInventory) {
      for (const card of bulkData.data) {
        const itemId = card.cryptic_cabin?.inventory_item_id;
        if (itemId && liveInventory[itemId]) {
          const live = liveInventory[itemId];
          card.cryptic_cabin.quantity = live.available;
          card.cryptic_cabin.in_stock = live.available > 0;
          card.cryptic_cabin.last_updated = live.updated_at;
        }
      }
    }
  } catch (e) {
    console.log('Live inventory overlay skipped:', e.message);
  }

  dataCache = bulkData;
  dataCacheTime = Date.now();
  return bulkData;
}

// ── Helpers ──────────────────────────────────────────────────────────

const KNOWN_TYPES = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land', 'Battle'];

function extractCardTypes(typeLine) {
  if (!typeLine) return [];
  const main = typeLine.split(' \u2014 ')[0].split(' // ')[0];
  return KNOWN_TYPES.filter(t => main.includes(t));
}

function cmcBucket(cmc) {
  if (cmc == null) return null;
  const n = Math.floor(Number(cmc));
  return n >= 7 ? '7+' : String(n);
}

const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, mythic: 3 };

// ── Filtering ────────────────────────────────────────────────────────

function applyFilter(cards, key, value) {
  if (!value) return cards;
  switch (key) {
    case 'set':
      return cards.filter(c => c.set === value.toLowerCase());
    case 'rarity':
      return cards.filter(c => c.rarity === value.toLowerCase());
    case 'colors': {
      const cols = value.toUpperCase().split(',').filter(Boolean);
      return cards.filter(c => {
        if (!c.color_identity?.length) return cols.includes('C');
        return cols.some(col => c.color_identity.includes(col));
      });
    }
    case 'card_type': {
      const types = value.split(',');
      return cards.filter(c => {
        const ct = extractCardTypes(c.type_line);
        return types.some(t => ct.includes(t));
      });
    }
    case 'cmc': {
      const buckets = value.split(',');
      return cards.filter(c => buckets.includes(cmcBucket(c.cmc)));
    }
    case 'keywords': {
      const kws = value.split(',').map(k => k.toLowerCase());
      return cards.filter(c =>
        c.keywords?.some(k => kws.includes(k.toLowerCase()))
      );
    }
    case 'q': {
      const q = value.toLowerCase();
      return cards.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.type_line?.toLowerCase().includes(q) ||
        c.oracle_text?.toLowerCase().includes(q)
      );
    }
    case 'finish':
      return cards.filter(c => c.cryptic_cabin?.finish === value.toLowerCase());
    case 'condition':
      return cards.filter(c => c.cryptic_cabin?.condition === value.toUpperCase());
    case 'in_stock':
      return value === 'true'
        ? cards.filter(c => c.cryptic_cabin?.in_stock)
        : cards;
    case 'min_price': {
      const min = parseFloat(value);
      return cards.filter(c => (c.cryptic_cabin?.price_gbp || 0) >= min);
    }
    case 'max_price': {
      const max = parseFloat(value);
      return cards.filter(c => (c.cryptic_cabin?.price_gbp || 0) <= max);
    }
    default:
      return cards;
  }
}

function applyAllFilters(cards, filters) {
  for (const [key, value] of Object.entries(filters)) {
    cards = applyFilter(cards, key, value);
  }
  return cards;
}

// ── Facet computation (cross-filtered) ───────────────────────────────

const FACET_DIMENSIONS = ['rarity', 'set', 'colors', 'card_type', 'cmc', 'finish', 'keywords'];

function computeFacets(allCards, activeFilters) {
  const facets = {};

  for (const dim of FACET_DIMENSIONS) {
    // Apply all filters EXCEPT this dimension
    const otherFilters = { ...activeFilters };
    delete otherFilters[dim];
    // Also exclude price from facet computation
    delete otherFilters.min_price;
    delete otherFilters.max_price;
    const subset = applyAllFilters(allCards, otherFilters);

    switch (dim) {
      case 'rarity': {
        const counts = {};
        for (const c of subset) {
          if (c.rarity) counts[c.rarity] = (counts[c.rarity] || 0) + 1;
        }
        facets.rarity = Object.entries(counts)
          .map(([value, count]) => ({
            value,
            label: value.charAt(0).toUpperCase() + value.slice(1),
            count
          }))
          .sort((a, b) => (RARITY_ORDER[a.value] ?? 99) - (RARITY_ORDER[b.value] ?? 99));
        break;
      }

      case 'set': {
        const counts = {};
        const names = {};
        for (const c of subset) {
          if (c.set) {
            counts[c.set] = (counts[c.set] || 0) + 1;
            if (c.set_name && !names[c.set]) names[c.set] = c.set_name;
          }
        }
        facets.set = Object.entries(counts)
          .map(([value, count]) => ({
            value,
            label: names[value] || value.toUpperCase(),
            count
          }))
          .sort((a, b) => b.count - a.count);
        break;
      }

      case 'colors': {
        const counts = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
        for (const c of subset) {
          if (!c.color_identity?.length) {
            counts.C++;
          } else {
            for (const col of c.color_identity) {
              if (counts[col] !== undefined) counts[col]++;
            }
          }
        }
        const colorLabels = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colourless' };
        facets.colors = Object.entries(counts)
          .map(([value, count]) => ({ value, label: colorLabels[value], count }));
        break;
      }

      case 'card_type': {
        const counts = {};
        for (const c of subset) {
          for (const t of extractCardTypes(c.type_line)) {
            counts[t] = (counts[t] || 0) + 1;
          }
        }
        facets.card_type = Object.entries(counts)
          .map(([value, count]) => ({ value, label: value, count }))
          .sort((a, b) => b.count - a.count);
        break;
      }

      case 'cmc': {
        const counts = {};
        for (const c of subset) {
          const b = cmcBucket(c.cmc);
          if (b !== null) counts[b] = (counts[b] || 0) + 1;
        }
        const order = ['0', '1', '2', '3', '4', '5', '6', '7+'];
        facets.cmc = order
          .filter(v => counts[v])
          .map(value => ({ value, label: value, count: counts[value] }));
        break;
      }

      case 'finish': {
        const counts = {};
        for (const c of subset) {
          const f = c.cryptic_cabin?.finish;
          if (f) counts[f] = (counts[f] || 0) + 1;
        }
        facets.finish = Object.entries(counts)
          .map(([value, count]) => ({
            value,
            label: value.charAt(0).toUpperCase() + value.slice(1),
            count
          }));
        break;
      }

      case 'keywords': {
        const counts = {};
        for (const c of subset) {
          if (c.keywords?.length) {
            for (const kw of c.keywords) {
              counts[kw] = (counts[kw] || 0) + 1;
            }
          }
        }
        facets.keywords = Object.entries(counts)
          .map(([value, count]) => ({ value, label: value, count }))
          .sort((a, b) => b.count - a.count);
        break;
      }
    }
  }

  return facets;
}

// ── Sorting ──────────────────────────────────────────────────────────

function sortCards(cards, sortBy, sortDir) {
  const dir = sortDir === 'desc' ? -1 : 1;
  return cards.slice().sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'price':
        aVal = a.cryptic_cabin?.price_gbp || 0;
        bVal = b.cryptic_cabin?.price_gbp || 0;
        return dir * (aVal - bVal);
      case 'set':
        aVal = a.set || '';
        bVal = b.set || '';
        return dir * aVal.localeCompare(bVal);
      case 'cmc':
        aVal = a.cmc ?? 0;
        bVal = b.cmc ?? 0;
        return dir * (aVal - bVal);
      case 'rarity':
        aVal = RARITY_ORDER[a.rarity] ?? 99;
        bVal = RARITY_ORDER[b.rarity] ?? 99;
        return dir * (aVal - bVal);
      default: // name
        aVal = a.name || '';
        bVal = b.name || '';
        return dir * aVal.localeCompare(bVal);
    }
  });
}

// ── Deduplication ────────────────────────────────────────────────────

function dedupeByProduct(cards) {
  const seen = new Map();
  for (const card of cards) {
    const pid = card.cryptic_cabin?.product_id;
    if (!pid) continue;
    const existing = seen.get(pid);
    if (!existing) {
      seen.set(pid, card);
    } else {
      // Prefer in-stock, then cheapest
      const eInStock = existing.cryptic_cabin?.in_stock;
      const cInStock = card.cryptic_cabin?.in_stock;
      if (cInStock && !eInStock) {
        seen.set(pid, card);
      } else if (cInStock === eInStock) {
        const ePrice = existing.cryptic_cabin?.price_gbp || Infinity;
        const cPrice = card.cryptic_cabin?.price_gbp || Infinity;
        if (cPrice < ePrice) seen.set(pid, card);
      }
    }
  }
  return Array.from(seen.values());
}

// ── Handler ──────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const bulkData = await loadData();
    const params = event.queryStringParameters || {};

    // Extract filter params
    const filterKeys = ['set', 'rarity', 'colors', 'card_type', 'cmc', 'keywords', 'q', 'finish', 'condition', 'in_stock', 'min_price', 'max_price'];
    const activeFilters = {};
    for (const key of filterKeys) {
      if (params[key]) activeFilters[key] = params[key];
    }

    // Dedupe variants by product_id (default true)
    let allCards = params.dedupe === 'false'
      ? bulkData.data
      : dedupeByProduct(bulkData.data);

    // Compute facets before filtering + pagination (but after dedupe)
    const includeFacets = params.facets !== 'false';
    const facets = includeFacets ? computeFacets(allCards, activeFilters) : undefined;

    // Apply all filters
    let cards = applyAllFilters(allCards, activeFilters);

    // Sort
    const sortBy = params.sort || 'name';
    const sortDir = params.dir || 'asc';
    cards = sortCards(cards, sortBy, sortDir);

    // Paginate
    const page = Math.max(1, parseInt(params.page) || 1);
    const pageSize = Math.min(Math.max(1, parseInt(params.page_size) || 24), 100);
    const start = (page - 1) * pageSize;
    const paged = cards.slice(start, start + pageSize);
    const hasMore = start + pageSize < cards.length;

    const body = JSON.stringify({
      object: 'list',
      total_cards: cards.length,
      has_more: hasMore,
      page,
      page_size: pageSize,
      facets,
      data: paged
    });

    // Compress if client accepts it
    const acceptsGzip = (event.headers['accept-encoding'] || '').includes('gzip');
    if (acceptsGzip && body.length > 1000) {
      const compressed = await gzip(Buffer.from(body));
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Encoding': 'gzip' },
        body: compressed.toString('base64'),
        isBase64Encoded: true
      };
    }

    return { statusCode: 200, headers, body };

  } catch (error) {
    console.error('Error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
