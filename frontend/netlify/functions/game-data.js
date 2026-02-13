/**
 * Game Data API — Netlify Function
 *
 * Returns latest set info and featured/popular cards for each TCG game.
 * Cross-references external game APIs with the shop's bulk data inventory.
 *
 * GET /api/game-data?game=mtg
 * GET /api/game-data?game=fab
 * GET /api/game-data?game=yugioh
 *
 * External sources:
 *   MTG     → Scryfall API (sets + popular cards by EDHREC rank)
 *   FaB     → GitHub fab-cube/flesh-and-blood-cards (sets) + shop inventory
 *   Yu-Gi-Oh → YGOProDeck API (sets + staple cards)
 */

const INVENTORY_URL = 'https://leagues.crypticcabin.com/bulk-data/cryptic-cabin-inventory.json';
const USER_AGENT = 'CrypticCabin-GameData/1.0';

// ── Caching ─────────────────────────────────────────────────────────

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const INVENTORY_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const cache = {};       // { mtg: { data, timestamp }, ... }
let inventoryCache = null;
let inventoryCacheTs = 0;

// ── CORS ────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=3600'
};

function ok(body) {
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function err(status, message) {
  return { statusCode: status, headers: CORS_HEADERS, body: JSON.stringify({ error: message }) };
}

// ── Helpers ─────────────────────────────────────────────────────────

async function fetchJSON(url, headers) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, ...headers }
  });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

async function getInventory() {
  const now = Date.now();
  if (inventoryCache && (now - inventoryCacheTs) < INVENTORY_CACHE_TTL) {
    return inventoryCache;
  }

  console.log('[game-data] Loading shop inventory...');
  const data = await fetchJSON(INVENTORY_URL);

  // Build name index for cross-referencing
  const byName = new Map();
  for (const card of data.data || []) {
    if (!card.name) continue;
    const key = card.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(card);
  }

  inventoryCache = { data: data.data || [], byName };
  inventoryCacheTs = now;
  return inventoryCache;
}

/**
 * Find a card in shop inventory by name, prefer in-stock with lowest price
 */
function findInShop(inventory, cardName) {
  const matches = inventory.byName.get(cardName.toLowerCase());
  if (!matches || matches.length === 0) return null;

  // Prefer in-stock, then cheapest
  const sorted = matches.slice().sort((a, b) => {
    const aStock = a.cryptic_cabin?.in_stock ? 0 : 1;
    const bStock = b.cryptic_cabin?.in_stock ? 0 : 1;
    if (aStock !== bStock) return aStock - bStock;
    return (a.cryptic_cabin?.price_gbp || 999) - (b.cryptic_cabin?.price_gbp || 999);
  });

  const card = sorted[0];
  const cc = card.cryptic_cabin || {};
  return {
    name: card.name,
    imageUrl: card.image_uris?.normal || card.image_uris?.small || null,
    price: cc.price_gbp || null,
    inStock: cc.in_stock || false,
    set: card.set,
    setName: card.set_name,
    shopUrl: cc.handle ? '/products/' + cc.handle : null
  };
}

// ── MTG — Scryfall ──────────────────────────────────────────────────

async function getMtgData() {
  const [setsData, inventory] = await Promise.all([
    fetchJSON('https://api.scryfall.com/sets'),
    getInventory()
  ]);

  // Find latest expansion set (released or upcoming within 6 months)
  const now = new Date();
  const sixMonthsAhead = new Date(now);
  sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);
  const cutoff = sixMonthsAhead.toISOString().slice(0, 10);

  const expansions = (setsData.data || [])
    .filter(s =>
      (s.set_type === 'expansion' || s.set_type === 'masters' || s.set_type === 'draft_innovation') &&
      s.released_at &&
      s.released_at <= cutoff &&
      s.card_count > 0
    )
    .sort((a, b) => b.released_at.localeCompare(a.released_at));

  const latestSet = expansions[0] || null;

  // Fetch popular Standard cards by EDHREC rank
  let featuredCards = [];
  try {
    const popular = await fetchJSON(
      'https://api.scryfall.com/cards/search?q=f%3Astandard+game%3Apaper&order=edhrec&dir=asc&page=1'
    );

    const topNames = (popular.data || []).slice(0, 30).map(c => c.name);

    for (const name of topNames) {
      if (featuredCards.length >= 6) break;
      const found = findInShop(inventory, name);
      if (found && found.imageUrl) {
        featuredCards.push(found);
      }
    }
  } catch (e) {
    console.warn('[game-data] MTG popular cards fetch failed:', e.message);
  }

  // Clean up set name — strip "Magic: The Gathering" prefix
  let setName = latestSet?.name || '';
  setName = setName.replace(/^Magic:\s*The Gathering\s*[-|:]?\s*/, '') || setName;

  return {
    game: 'mtg',
    latestSet: latestSet ? {
      name: setName,
      code: latestSet.code,
      releaseDate: latestSet.released_at,
      cardCount: latestSet.card_count,
      iconUrl: latestSet.icon_svg_uri || null
    } : null,
    featuredCards
  };
}

// ── FaB — GitHub fab-cube ───────────────────────────────────────────

async function getFabData() {
  const [setsData, inventory] = await Promise.all([
    fetchJSON('https://raw.githubusercontent.com/the-fab-cube/flesh-and-blood-cards/develop/json/english/set.json'),
    getInventory()
  ]);

  // Find latest set by release date
  const setEntries = [];
  for (const set of setsData || []) {
    if (!set.printings || set.printings.length === 0) continue;
    // Get the most recent printing date
    let latestDate = null;
    for (const p of set.printings) {
      if (p.initial_release_date && (!latestDate || p.initial_release_date > latestDate)) {
        latestDate = p.initial_release_date;
      }
    }
    if (latestDate) {
      setEntries.push({
        name: set.name,
        code: set.id,
        releaseDate: latestDate,
        cardCount: null // Not readily available from this API
      });
    }
  }

  setEntries.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  const latestSet = setEntries[0] || null;

  // Featured cards: pull from shop inventory for recent FaB sets
  // Look for FaB cards (not MTG) that are rares/mythics and in stock
  let featuredCards = [];
  const recentSetNames = setEntries.slice(0, 3).map(s => s.name.toLowerCase());

  const fabCards = inventory.data
    .filter(c => {
      if (!c.set_name) return false;
      const sn = c.set_name.toLowerCase();
      return recentSetNames.some(rs => sn.includes(rs));
    })
    .filter(c => c.cryptic_cabin?.in_stock && c.image_uris?.normal)
    .sort((a, b) => (b.cryptic_cabin?.price_gbp || 0) - (a.cryptic_cabin?.price_gbp || 0));

  for (const card of fabCards.slice(0, 6)) {
    const cc = card.cryptic_cabin || {};
    featuredCards.push({
      name: card.name,
      imageUrl: card.image_uris?.normal || card.image_uris?.small || null,
      price: cc.price_gbp || null,
      inStock: true,
      set: card.set,
      setName: card.set_name,
      shopUrl: cc.handle ? '/products/' + cc.handle : null
    });
  }

  return {
    game: 'fab',
    latestSet: latestSet ? {
      name: latestSet.name,
      code: latestSet.code,
      releaseDate: latestSet.releaseDate,
      cardCount: latestSet.cardCount,
      iconUrl: null
    } : null,
    featuredCards
  };
}

// ── Yu-Gi-Oh — YGOProDeck ───────────────────────────────────────────

async function getYugiohData() {
  const [setsData, inventory] = await Promise.all([
    fetchJSON('https://db.ygoprodeck.com/api/v7/cardsets.php'),
    getInventory()
  ]);

  // Find latest set by TCG date (filter out tiny promo sets)
  const sets = (setsData || [])
    .filter(s => s.tcg_date && s.num_of_cards > 20)
    .sort((a, b) => b.tcg_date.localeCompare(a.tcg_date));

  const latestSet = sets[0] || null;

  // Fetch staple/popular cards
  let featuredCards = [];
  try {
    const staples = await fetchJSON(
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?staple=yes&num=30&offset=0'
    );

    const stapleNames = (staples.data || []).slice(0, 30).map(c => c.name);

    for (const name of stapleNames) {
      if (featuredCards.length >= 6) break;
      const found = findInShop(inventory, name);
      if (found && found.imageUrl) {
        featuredCards.push(found);
      }
    }
  } catch (e) {
    console.warn('[game-data] YGO staples fetch failed:', e.message);
  }

  return {
    game: 'yugioh',
    latestSet: latestSet ? {
      name: latestSet.set_name,
      code: latestSet.set_code,
      releaseDate: latestSet.tcg_date,
      cardCount: latestSet.num_of_cards,
      iconUrl: latestSet.set_image || null
    } : null,
    featuredCards
  };
}

// ── Handler ─────────────────────────────────────────────────────────

const GAME_HANDLERS = {
  mtg: getMtgData,
  fab: getFabData,
  yugioh: getYugiohData
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return err(405, 'Method not allowed');
  }

  const params = event.queryStringParameters || {};
  const game = (params.game || '').toLowerCase();

  if (!GAME_HANDLERS[game]) {
    return err(400, 'Invalid game. Use: mtg, fab, or yugioh');
  }

  // Check cache
  const now = Date.now();
  if (cache[game] && (now - cache[game].timestamp) < CACHE_TTL) {
    console.log(`[game-data] Serving ${game} from cache`);
    return ok(cache[game].data);
  }

  try {
    console.log(`[game-data] Fetching fresh data for ${game}...`);
    const data = await GAME_HANDLERS[game]();

    // Cache the result
    cache[game] = { data, timestamp: now };

    return ok(data);
  } catch (e) {
    console.error(`[game-data] Error fetching ${game}:`, e.message);

    // Return stale cache if available
    if (cache[game]) {
      console.log(`[game-data] Returning stale cache for ${game}`);
      return ok(cache[game].data);
    }

    return err(500, 'Failed to fetch game data');
  }
};
