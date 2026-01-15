/**
 * Bulk Data Refresh - Background Function
 *
 * This is the actual worker that generates bulk data.
 * Called by the scheduled trigger function.
 * Runs as a background function with 15 min timeout.
 */

const { getStore } = require('@netlify/blobs');

// Config
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'cryptic-cabin-tcg';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';
const SITE_ID = process.env.CC_SITE_ID;
const BLOBS_TOKEN = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_ACCESS_TOKEN;

const BLOB_STORE_NAME = 'bulk-data';
const BLOB_KEY = 'inventory';
const SCRYFALL_BLOB_KEY = 'scryfall-cache';
const SCRYFALL_CACHE_HOURS = 24; // Refresh Scryfall data daily

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

function getBlobStore(name = BLOB_STORE_NAME) {
  const options = { name };
  if (SITE_ID) options.siteID = SITE_ID;
  if (BLOBS_TOKEN) options.token = BLOBS_TOKEN;
  return getStore(options);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

async function fetchProducts() {
  const products = [];
  let url = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`;

  console.log('Fetching Shopify products...');

  while (url) {
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log('Rate limited, waiting 2s...');
        await sleep(2000);
        continue;
      }
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.products || data.products.length === 0) break;

    const mtgProducts = data.products.filter(p =>
      p.product_type?.toLowerCase().includes('magic') ||
      p.tags?.toLowerCase().includes('magic') ||
      p.tags?.toLowerCase().includes('mtg')
    );

    products.push(...mtgProducts);
    console.log(`Fetched ${products.length} MTG products...`);

    const linkHeader = response.headers.get('Link');
    url = null;
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) url = nextMatch[1];
    }

    await sleep(250);
  }

  console.log(`Total products fetched: ${products.length}`);
  return products;
}

async function loadScryfallData() {
  console.log('Loading Scryfall data...');

  const store = getBlobStore();

  // Check if we have cached Scryfall data
  try {
    const cached = await store.get(SCRYFALL_BLOB_KEY, { type: 'json' });
    if (cached && cached.cached_at) {
      const cacheAge = (Date.now() - new Date(cached.cached_at).getTime()) / (1000 * 60 * 60);
      if (cacheAge < SCRYFALL_CACHE_HOURS) {
        console.log(`Using cached Scryfall data (${cacheAge.toFixed(1)}h old, ${cached.entries} entries)`);

        // Rebuild maps from cached arrays
        const scryfallData = {
          bySetNumber: new Map(cached.bySetNumber),
          byNameSet: new Map(cached.byNameSet),
          byName: new Map(cached.byName)
        };
        return scryfallData;
      }
      console.log(`Scryfall cache expired (${cacheAge.toFixed(1)}h old), refreshing...`);
    }
  } catch (e) {
    console.log('No Scryfall cache found, downloading fresh...');
  }

  // Download fresh Scryfall data
  const bulkResponse = await fetch('https://api.scryfall.com/bulk-data/default-cards', {
    headers: { 'User-Agent': 'CrypticCabin-BulkData/1.0' }
  });

  if (!bulkResponse.ok) throw new Error('Failed to fetch Scryfall bulk info');

  const bulkInfo = await bulkResponse.json();
  console.log(`Downloading ${(bulkInfo.size / 1024 / 1024).toFixed(0)}MB from Scryfall...`);

  const dataResponse = await fetch(bulkInfo.download_uri, {
    headers: { 'User-Agent': 'CrypticCabin-BulkData/1.0' }
  });

  if (!dataResponse.ok) throw new Error('Failed to download Scryfall data');

  const cards = await dataResponse.json();
  console.log(`Loaded ${cards.length} Scryfall cards`);

  const scryfallData = {
    bySetNumber: new Map(),
    byNameSet: new Map(),
    byName: new Map()
  };

  for (const card of cards) {
    if (!card.games?.includes('paper')) continue;

    scryfallData.bySetNumber.set(`${card.set}-${card.collector_number}`.toLowerCase(), card);

    const nameSetKey = `${card.name.toLowerCase()}-${card.set}`;
    if (!scryfallData.byNameSet.has(nameSetKey)) scryfallData.byNameSet.set(nameSetKey, card);

    const nameKey = card.name.toLowerCase();
    const existing = scryfallData.byName.get(nameKey);
    if (!existing || new Date(card.released_at) > new Date(existing.released_at)) {
      scryfallData.byName.set(nameKey, card);
    }
  }

  console.log(`Built ${scryfallData.bySetNumber.size} lookup entries`);

  // Cache for future runs (convert Maps to arrays for JSON storage)
  try {
    await store.setJSON(SCRYFALL_BLOB_KEY, {
      cached_at: new Date().toISOString(),
      entries: scryfallData.bySetNumber.size,
      bySetNumber: Array.from(scryfallData.bySetNumber.entries()),
      byNameSet: Array.from(scryfallData.byNameSet.entries()),
      byName: Array.from(scryfallData.byName.entries())
    });
    console.log('Scryfall data cached for future runs');
  } catch (e) {
    console.log('Failed to cache Scryfall data:', e.message);
  }

  return scryfallData;
}

async function generateBulkData() {
  const startTime = Date.now();

  const products = await fetchProducts();
  const scryfallData = await loadScryfallData();

  const cards = [];
  const stats = { matched: 0, unmatched: 0, inStock: 0 };

  console.log('Processing products...');

  for (const product of products) {
    const parsed = parseProductTitle(product.title);

    for (const variant of product.variants || []) {
      const variantOptions = parseVariantOptions(variant);
      const scryfallCard = matchToScryfall(parsed, scryfallData);

      if (scryfallCard) stats.matched++;
      else stats.unmatched++;

      const card = transformToCard(product, variant, parsed, variantOptions, scryfallCard);
      cards.push(card);

      if (card.cryptic_cabin.in_stock) stats.inStock++;
    }
  }

  cards.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const bulkData = {
    object: 'list',
    total_cards: cards.length,
    has_more: false,
    data_source: 'cryptic_cabin',
    store_name: 'Cryptic Cabin',
    store_url: 'https://tcg.crypticcabin.com',
    generated_at: new Date().toISOString(),
    statistics: {
      products_processed: products.length,
      total_listings: cards.length,
      scryfall_matched: stats.matched,
      match_rate: `${((stats.matched / cards.length) * 100).toFixed(1)}%`,
      in_stock: stats.inStock
    },
    data: cards
  };

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Generated ${cards.length} cards in ${duration}s`);

  return bulkData;
}

exports.handler = async (event, context) => {
  console.log('🔄 Bulk data background refresh started');
  console.log('Time:', new Date().toISOString());

  if (!SHOPIFY_ACCESS_TOKEN) {
    console.error('SHOPIFY_ACCESS_TOKEN not configured');
    return { statusCode: 500, body: JSON.stringify({ error: 'SHOPIFY_ACCESS_TOKEN not configured' }) };
  }

  try {
    const bulkData = await generateBulkData();

    const store = getBlobStore();
    await store.setJSON(BLOB_KEY, bulkData);

    console.log('✅ Bulk data saved to Blobs');
    console.log(`   ${bulkData.total_cards} cards, ${bulkData.statistics.in_stock} in stock`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        total_cards: bulkData.total_cards,
        in_stock: bulkData.statistics.in_stock,
        match_rate: bulkData.statistics.match_rate,
        generated_at: bulkData.generated_at
      })
    };

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `⚠️ Bulk data refresh failed: ${error.message}` })
      }).catch(() => {});
    }

    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
