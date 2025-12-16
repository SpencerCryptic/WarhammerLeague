/**
 * Cart Lookup API - Netlify Function
 *
 * Check if a card is in stock without creating a cart.
 *
 * GET /api/cart/lookup?scryfall_id=xxx
 * GET /api/cart/lookup?oracle_id=xxx
 * GET /api/cart/lookup?name=xxx
 * GET /api/cart/lookup?set=xxx&collector_number=xxx
 */

// Config
const INVENTORY_URL = 'https://leagues.crypticcabin.com/bulk-data/cryptic-cabin-inventory.json';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// In-memory cache (persists across warm function invocations)
let inventoryCache = null;
let cacheTimestamp = 0;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://www.moxfield.com',
  'https://moxfield.com',
  'https://www.archidekt.com',
  'https://archidekt.com',
  'https://www.mtggoldfish.com',
  'https://mtggoldfish.com',
  'https://deckstats.net',
  'https://www.manabox.app',
  'https://manabox.app',
  'https://fabrary.net',
  'https://www.fabrary.net',
  'https://tcg.crypticcabin.com',
  'https://leagues.crypticcabin.com'
];

/**
 * Load inventory with caching
 */
async function getInventory() {
  const now = Date.now();

  if (inventoryCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return inventoryCache;
  }

  console.log('Fetching fresh inventory data...');
  const response = await fetch(INVENTORY_URL);
  const data = await response.json();

  // Build lookup indexes for fast matching
  const inventory = {
    raw: data,
    byScryfall: new Map(),
    byOracle: new Map(),
    bySetCollector: new Map(),
    byName: new Map()
  };

  for (const card of data.data) {
    if (card.scryfall_id) {
      inventory.byScryfall.set(card.scryfall_id, card);
    }

    if (card.oracle_id) {
      if (!inventory.byOracle.has(card.oracle_id)) {
        inventory.byOracle.set(card.oracle_id, []);
      }
      inventory.byOracle.get(card.oracle_id).push(card);
    }

    if (card.set && card.collector_number) {
      const key = `${card.set.toLowerCase()}-${card.collector_number}`;
      inventory.bySetCollector.set(key, card);
    }

    if (card.name) {
      const nameLower = card.name.toLowerCase();
      if (!inventory.byName.has(nameLower)) {
        inventory.byName.set(nameLower, []);
      }
      inventory.byName.get(nameLower).push(card);
    }
  }

  inventoryCache = inventory;
  cacheTimestamp = now;

  return inventory;
}

/**
 * Find best available card match
 */
function findCard(inventory, query) {
  // 1. Exact Scryfall ID match
  if (query.scryfall_id) {
    const card = inventory.byScryfall.get(query.scryfall_id);
    if (card) return card;
  }

  // 2. Set + Collector Number match
  if (query.set && query.collector_number) {
    const key = `${query.set.toLowerCase()}-${query.collector_number}`;
    const card = inventory.bySetCollector.get(key);
    if (card) return card;
  }

  // 3. Oracle ID match (find cheapest in stock, or any if none in stock)
  if (query.oracle_id) {
    const cards = inventory.byOracle.get(query.oracle_id) || [];
    if (cards.length > 0) {
      const inStock = cards
        .filter(c => c.cryptic_cabin?.in_stock)
        .sort((a, b) => a.cryptic_cabin.price_gbp - b.cryptic_cabin.price_gbp);
      return inStock.length > 0 ? inStock[0] : cards[0];
    }
  }

  // 4. Name match (find cheapest in stock)
  if (query.name) {
    const nameLower = query.name.toLowerCase();
    const cards = inventory.byName.get(nameLower) || [];
    if (cards.length > 0) {
      const inStock = cards
        .filter(c => c.cryptic_cabin?.in_stock)
        .sort((a, b) => a.cryptic_cabin.price_gbp - b.cryptic_cabin.price_gbp);
      return inStock.length > 0 ? inStock[0] : cards[0];
    }
  }

  return null;
}

/**
 * Get CORS headers
 */
function getCorsHeaders(origin) {
  const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
                    (origin && origin.match(/^http:\/\/localhost:\d+$/));

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };
}

/**
 * Netlify Function Handler
 */
exports.handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin || '';

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: getCorsHeaders(origin),
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const inventory = await getInventory();
    const params = event.queryStringParameters || {};

    const query = {
      scryfall_id: params.scryfall_id,
      oracle_id: params.oracle_id,
      name: params.name,
      set: params.set,
      collector_number: params.collector_number
    };

    // Check if any query param was provided
    if (!query.scryfall_id && !query.oracle_id && !query.name && !(query.set && query.collector_number)) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({
          success: false,
          error: 'Provide scryfall_id, oracle_id, name, or set+collector_number'
        })
      };
    }

    const card = findCard(inventory, query);

    if (card) {
      return {
        statusCode: 200,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({
          success: true,
          found: true,
          card: {
            name: card.name,
            set: card.set,
            set_name: card.set_name,
            collector_number: card.collector_number,
            scryfall_id: card.scryfall_id,
            oracle_id: card.oracle_id,
            price_gbp: card.cryptic_cabin?.price_gbp,
            quantity: card.cryptic_cabin?.quantity,
            in_stock: card.cryptic_cabin?.in_stock,
            condition: card.cryptic_cabin?.condition,
            finish: card.cryptic_cabin?.finish,
            url: card.cryptic_cabin?.url,
            image: card.image_uris?.normal || card.cryptic_cabin?.image
          }
        })
      };
    } else {
      return {
        statusCode: 200,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({
          success: true,
          found: false,
          query: query
        })
      };
    }

  } catch (error) {
    console.error('Lookup error:', error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({
        success: false,
        error: 'Failed to lookup card'
      })
    };
  }
};
