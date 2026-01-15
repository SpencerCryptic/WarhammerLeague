/**
 * Cart Import API - Netlify Function
 *
 * Accepts POST requests with card lists and returns a Shopify cart URL.
 * Supports multiple formats: Scryfall IDs, Oracle IDs, Set+Collector, Names, Plain text.
 *
 * POST /api/cart/import - Import cards, return cart URL
 * GET /api/cart/import - Redirect to cart with query params
 *
 * Live Inventory: Reads real-time inventory from Netlify Blobs (updated via Shopify webhook)
 */

const { getStore } = require('@netlify/blobs');

// Config
const INVENTORY_URL = 'https://leagues.crypticcabin.com/bulk-data/cryptic-cabin-inventory.json'; // Fallback
const STORE_URL = 'https://tcg.crypticcabin.com';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const LIVE_INVENTORY_STORE = 'live-inventory';
const BULK_DATA_STORE = 'bulk-data';
const BLOB_KEY = 'inventory';

// Netlify Blobs config (needed for serverless functions)
const SITE_ID = process.env.CC_SITE_ID;
const BLOBS_TOKEN = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_ACCESS_TOKEN;

/**
 * Get blob store with proper config
 */
function getBlobStore(storeName) {
  const options = { name: storeName };
  if (SITE_ID) options.siteID = SITE_ID;
  if (BLOBS_TOKEN) options.token = BLOBS_TOKEN;
  return getStore(options);
}

// In-memory cache (persists across warm function invocations)
let inventoryCache = null;
let cacheTimestamp = 0;
let liveInventoryCache = null;
let liveInventoryCacheTimestamp = 0;
const LIVE_CACHE_DURATION = 30 * 1000; // 30 seconds for live data

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://www.moxfield.com',
  'https://moxfield.com',
  'https://www.archidekt.com',
  'https://archidekt.com',
  'https://www.edhrec.com',
  'https://edhrec.com',
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
 * Load live inventory from Netlify Blobs
 * Returns a map of inventory_item_id -> available quantity
 */
async function getLiveInventory() {
  const now = Date.now();

  // Use short cache for live data
  if (liveInventoryCache && (now - liveInventoryCacheTimestamp) < LIVE_CACHE_DURATION) {
    return liveInventoryCache;
  }

  try {
    const store = getBlobStore(LIVE_INVENTORY_STORE);
    const data = await store.get(BLOB_KEY, { type: 'json' });

    if (data) {
      liveInventoryCache = data;
      liveInventoryCacheTimestamp = now;
      console.log(`Live inventory loaded: ${Object.keys(data).length} items tracked`);
      return data;
    }
  } catch (error) {
    console.log('No live inventory blob found, using static data only');
  }

  return null;
}

/**
 * Load bulk data from Blobs or fallback to static URL
 * Prefers blob if it has more than 3000 cards (sanity check)
 */
async function loadBulkData() {
  let blobData = null;
  let staticData = null;

  // Try loading from Blobs
  try {
    const store = getBlobStore(BULK_DATA_STORE);
    blobData = await store.get(BLOB_KEY, { type: 'json' });
    if (blobData?.data) {
      console.log(`Blob bulk data available: ${blobData.data.length} cards`);
    }
  } catch (error) {
    console.log('Blob bulk data not available');
  }

  // Always fetch static as fallback/comparison
  try {
    const response = await fetch(INVENTORY_URL);
    staticData = await response.json();
    console.log(`Static bulk data available: ${staticData.data?.length || 0} cards`);
  } catch (error) {
    console.log('Static URL fetch failed');
  }

  // Use whichever has more cards (sanity check for incomplete data)
  const blobCount = blobData?.data?.length || 0;
  const staticCount = staticData?.data?.length || 0;

  if (blobCount >= staticCount && blobCount > 0) {
    console.log('Using blob data (more complete)');
    return blobData;
  } else if (staticCount > 0) {
    console.log('Using static data (more complete)');
    return staticData;
  }

  throw new Error('No bulk data available from blob or static URL');
}

/**
 * Apply live inventory updates to a card
 * Overrides quantity from static JSON with real-time blob data
 */
function applyLiveInventory(card, liveInventory) {
  if (!liveInventory || !card.cryptic_cabin?.inventory_item_id) {
    return card;
  }

  const liveData = liveInventory[card.cryptic_cabin.inventory_item_id];
  if (liveData) {
    // Create a new card object with updated inventory
    return {
      ...card,
      cryptic_cabin: {
        ...card.cryptic_cabin,
        quantity: liveData.available,
        in_stock: liveData.available > 0,
        live_updated_at: liveData.updated_at
      }
    };
  }

  return card;
}

/**
 * Load inventory with caching
 */
async function getInventory() {
  const now = Date.now();

  // Load live inventory in parallel with static data check
  const liveInventoryPromise = getLiveInventory();

  if (inventoryCache && (now - cacheTimestamp) < CACHE_DURATION) {
    // Apply live inventory updates if available
    const liveInventory = await liveInventoryPromise;
    if (liveInventory) {
      inventoryCache.liveInventory = liveInventory;
    }
    return inventoryCache;
  }

  console.log('Fetching fresh inventory data...');
  const [data, liveInventory] = await Promise.all([
    loadBulkData(),
    liveInventoryPromise
  ]);

  // Build lookup indexes for fast matching
  const inventory = {
    raw: data,
    liveInventory: liveInventory,
    byScryfall: new Map(),
    byOracle: new Map(),
    bySetCollector: new Map(),
    byName: new Map(),
    byInventoryItemId: new Map()
  };

  for (const card of data.data) {
    // Index by Scryfall ID (exact card)
    if (card.scryfall_id) {
      inventory.byScryfall.set(card.scryfall_id, card);
    }

    // Index by Oracle ID (any printing of this card)
    if (card.oracle_id) {
      if (!inventory.byOracle.has(card.oracle_id)) {
        inventory.byOracle.set(card.oracle_id, []);
      }
      inventory.byOracle.get(card.oracle_id).push(card);
    }

    // Index by set + collector number
    if (card.set && card.collector_number) {
      const key = `${card.set.toLowerCase()}-${card.collector_number}`;
      inventory.bySetCollector.set(key, card);
    }

    // Index by name (lowercase, for fuzzy matching)
    if (card.name) {
      const nameLower = card.name.toLowerCase();
      if (!inventory.byName.has(nameLower)) {
        inventory.byName.set(nameLower, []);
      }
      inventory.byName.get(nameLower).push(card);
    }

    // Index by inventory_item_id for live updates
    if (card.cryptic_cabin?.inventory_item_id) {
      inventory.byInventoryItemId.set(card.cryptic_cabin.inventory_item_id, card);
    }
  }

  inventoryCache = inventory;
  cacheTimestamp = now;
  console.log(`Inventory loaded: ${data.data.length} cards indexed`);

  return inventory;
}

/**
 * Filter cards by finish preference
 * @param {Array} cards - Cards to filter
 * @param {string} finish - Preferred finish: 'foil', 'nonfoil', 'etched', or null for any
 * @param {number} quantity - Required quantity (used for sorting preference, not filtering)
 * @param {Object} liveInventory - Live inventory data from blob
 * @returns {Array} Filtered and sorted cards
 */
function filterByFinish(cards, finish, quantity, liveInventory) {
  // Apply live inventory updates to each card
  const cardsWithLiveData = cards.map(c => applyLiveInventory(c, liveInventory));

  // Filter to in-stock cards only (partial fulfillment handled later)
  let filtered = cardsWithLiveData.filter(c =>
    c.cryptic_cabin?.in_stock &&
    c.cryptic_cabin.quantity > 0
  );

  // If finish preference specified, try to match it
  if (finish) {
    const finishLower = finish.toLowerCase();
    const withFinish = filtered.filter(c => c.cryptic_cabin?.finish === finishLower);
    if (withFinish.length > 0) {
      filtered = withFinish;
    }
    // If no match for preferred finish, fall back to any available
  }

  // Sort by price (cheapest first)
  return filtered.sort((a, b) => a.cryptic_cabin.price_gbp - b.cryptic_cabin.price_gbp);
}

/**
 * Find best available card match
 * Priority: exact scryfall_id > set+collector > oracle_id (cheapest in stock) > name (cheapest in stock)
 * Supports finish preference: 'foil', 'nonfoil', 'etched'
 * Uses live inventory data from Netlify Blobs for real-time availability
 */
function findCard(inventory, query) {
  const finish = query.finish || null;
  const quantity = query.quantity || 1;
  const liveInventory = inventory.liveInventory;

  // 1. Exact Scryfall ID match
  if (query.scryfall_id) {
    let card = inventory.byScryfall.get(query.scryfall_id);
    if (card) {
      card = applyLiveInventory(card, liveInventory);
      if (card.cryptic_cabin?.in_stock) {
        // For exact scryfall_id, ignore finish preference (they want this specific card)
        return card;
      }
    }
  }

  // 2. Set + Collector Number match
  if (query.set && query.collector_number) {
    const key = `${query.set.toLowerCase()}-${query.collector_number}`;
    let card = inventory.bySetCollector.get(key);
    if (card) {
      card = applyLiveInventory(card, liveInventory);
      if (card.cryptic_cabin?.in_stock) {
        return card;
      }
    }
  }

  // 3. Oracle ID match (find cheapest in stock, respecting finish preference)
  if (query.oracle_id) {
    const cards = inventory.byOracle.get(query.oracle_id) || [];
    const filtered = filterByFinish(cards, finish, quantity, liveInventory);

    if (filtered.length > 0) {
      return filtered[0];
    }
  }

  // 4. Name match (find cheapest in stock, respecting finish preference)
  if (query.name) {
    const nameLower = query.name.toLowerCase();
    const cards = inventory.byName.get(nameLower) || [];
    const filtered = filterByFinish(cards, finish, quantity, liveInventory);

    if (filtered.length > 0) {
      return filtered[0];
    }
  }

  // 5. Fuzzy name match (contains)
  if (query.name) {
    const nameLower = query.name.toLowerCase();
    for (const [cardName, cards] of inventory.byName) {
      if (cardName.includes(nameLower) || nameLower.includes(cardName)) {
        const filtered = filterByFinish(cards, finish, quantity, liveInventory);

        if (filtered.length > 0) {
          return filtered[0];
        }
      }
    }
  }

  return null;
}

/**
 * Build Shopify cart URL
 */
/**
 * Build Shopify cart URL with optional affiliate tracking
 * Uses /cart/add to add items then redirects to /cart (not checkout)
 * @param {Array} items - Cart items with variant_id and quantity
 * @param {string} source - Affiliate source (e.g., 'moxfield', 'archidekt')
 */
function buildCartUrl(items, source = null) {
  if (items.length === 0) {
    return `${STORE_URL}/cart`;
  }

  // Build query params for /cart/add
  // Format: /cart/add?id[]=VARIANT&quantity[]=QTY&id[]=VARIANT2&quantity[]=QTY2
  const params = new URLSearchParams();

  for (const item of items) {
    params.append('id[]', item.variant_id);
    params.append('quantity[]', item.quantity);
  }

  // Add affiliate tracking as cart attributes
  if (source) {
    const timestamp = Date.now();
    params.append('attributes[affiliate_source]', source);
    params.append('attributes[affiliate_timestamp]', timestamp);
  }

  // Redirect to cart page after adding (not checkout)
  params.append('return_to', '/cart');

  return `${STORE_URL}/cart/add?${params.toString()}`;
}

/**
 * Parse plain text decklist
 * Supports formats:
 * - "4 Lightning Bolt"
 * - "4x Lightning Bolt"
 * - "Lightning Bolt x4"
 * - "1 Lightning Bolt (M10) 123"
 */
function parseDecklistText(text) {
  const cards = [];
  const lines = text.split('\n');

  for (let line of lines) {
    line = line.trim();

    // Skip empty lines, comments, section headers
    if (!line || line.startsWith('//') || line.startsWith('#')) continue;
    if (/^(Deck|Sideboard|Commander|Companion|Maybeboard):?$/i.test(line)) continue;

    // Try to parse quantity and name
    let quantity = 1;
    let name = line;
    let set = null;
    let collectorNumber = null;

    // Match "4 Card Name" or "4x Card Name"
    const prefixMatch = line.match(/^(\d+)x?\s+(.+)$/i);
    if (prefixMatch) {
      quantity = parseInt(prefixMatch[1]);
      name = prefixMatch[2];
    }

    // Match "Card Name x4"
    const suffixMatch = name.match(/^(.+?)\s+x(\d+)$/i);
    if (suffixMatch) {
      name = suffixMatch[1];
      quantity = parseInt(suffixMatch[2]);
    }

    // Extract set code if present: "Card Name (SET)" or "Card Name (SET) 123"
    const setMatch = name.match(/^(.+?)\s*\(([A-Z0-9]{3,5})\)\s*(\d+)?$/i);
    if (setMatch) {
      name = setMatch[1].trim();
      set = setMatch[2].toLowerCase();
      collectorNumber = setMatch[3] || null;
    }

    cards.push({
      name: name.trim(),
      quantity: quantity,
      set: set,
      collector_number: collectorNumber
    });
  }

  return cards;
}

/**
 * Get CORS headers
 */
function getCorsHeaders(origin) {
  const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
                    (origin && origin.match(/^http:\/\/localhost:\d+$/));

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };
}

/**
 * Handle POST - Import cards and return cart URL
 */
async function handlePost(body, origin) {
  const inventory = await getInventory();
  let cards = [];

  // Get affiliate source for tracking (e.g., 'moxfield', 'archidekt')
  const source = body.source || null;

  // Parse input format
  if (body.cards && Array.isArray(body.cards)) {
    cards = body.cards;
  } else if (body.decklist && typeof body.decklist === 'string') {
    cards = parseDecklistText(body.decklist);
  } else {
    return {
      statusCode: 400,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({
        success: false,
        error: 'Invalid request. Provide "cards" array or "decklist" string.'
      })
    };
  }

  const found = [];
  const notFound = [];
  const cartItems = [];
  let totalPrice = 0;

  for (const query of cards) {
    const quantity = Math.min(query.quantity || 1, 99); // Cap at 99
    const card = findCard(inventory, query);

    if (card) {
      const availableQty = Math.min(quantity, card.cryptic_cabin.quantity);

      found.push({
        requested: query,
        matched: {
          name: card.name,
          set: card.set,
          set_name: card.set_name,
          collector_number: card.collector_number,
          scryfall_id: card.scryfall_id,
          finish: card.cryptic_cabin.finish,
          condition: card.cryptic_cabin.condition,
          price_gbp: card.cryptic_cabin.price_gbp,
          available_quantity: card.cryptic_cabin.quantity,
          quantity_added: availableQty,
          url: card.cryptic_cabin.url
        }
      });

      if (availableQty > 0) {
        cartItems.push({
          variant_id: card.cryptic_cabin.variant_id,
          quantity: availableQty
        });
        totalPrice += card.cryptic_cabin.price_gbp * availableQty;
      }

      // Track if we couldn't fulfill full quantity
      if (availableQty < quantity) {
        notFound.push({
          ...query,
          reason: `Only ${availableQty} available (requested ${quantity})`
        });
      }
    } else {
      notFound.push({
        ...query,
        reason: 'Not found in inventory or out of stock'
      });
    }
  }

  const cartUrl = buildCartUrl(cartItems, source);

  return {
    statusCode: 200,
    headers: getCorsHeaders(origin),
    body: JSON.stringify({
      success: true,
      cart_url: cartUrl,
      redirect_url: cartUrl,
      found: found,
      not_found: notFound,
      summary: {
        total_cards_requested: cards.reduce((sum, c) => sum + (c.quantity || 1), 0),
        total_cards_found: cartItems.reduce((sum, c) => sum + c.quantity, 0),
        total_price_gbp: Math.round(totalPrice * 100) / 100,
        items_in_cart: cartItems.length
      }
    })
  };
}

/**
 * Handle GET - Redirect to cart
 */
async function handleGet(queryParams, origin) {
  const inventory = await getInventory();
  const cards = [];

  // Get affiliate source for tracking
  const source = queryParams.source || null;

  // Parse query string format: cards=id:qty,id:qty
  if (queryParams.cards) {
    const pairs = queryParams.cards.split(',');
    for (const pair of pairs) {
      const [id, qty] = pair.split(':');
      if (id) {
        cards.push({
          scryfall_id: id.trim(),
          quantity: parseInt(qty) || 1
        });
      }
    }
  }

  const cartItems = [];

  for (const query of cards) {
    const card = findCard(inventory, query);
    if (card && card.cryptic_cabin?.in_stock) {
      const availableQty = Math.min(query.quantity, card.cryptic_cabin.quantity);
      if (availableQty > 0) {
        cartItems.push({
          variant_id: card.cryptic_cabin.variant_id,
          quantity: availableQty
        });
      }
    }
  }

  const cartUrl = buildCartUrl(cartItems, source);

  return {
    statusCode: 302,
    headers: {
      ...getCorsHeaders(origin),
      'Location': cartUrl
    },
    body: ''
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

  try {
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      return await handlePost(body, origin);
    } else if (event.httpMethod === 'GET') {
      return await handleGet(event.queryStringParameters || {}, origin);
    } else {
      return {
        statusCode: 405,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
  } catch (error) {
    console.error('Cart import error:', error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({
        success: false,
        error: 'Failed to process cart import'
      })
    };
  }
};
