/**
 * Cryptic Cabin - Scryfall-Compatible Bulk Data Generator
 * 
 * Tailored to tcg.crypticcabin.com exact product structure:
 * 
 * Title: "Card Name - Set Name (Rarity) [SET-NUMBER]"
 * Example: "Qarsi Revenant - Buy a Box Promos (Rare) [BABP-426]"
 * 
 * Variants:
 * - Language: English, Japanese, etc.
 * - Condition: Near Mint, Lightly Played, etc.
 * - Edition: Normal, Foil Normal, Etched, etc.
 * 
 * Only processes Magic: The Gathering cards.
 * Runs daily via Netlify scheduled functions.
 */

const fetch = require('node-fetch');
const fs = require('fs').promises;
const zlib = require('zlib');

// Configuration
const CONFIG = {
  shopify: {
    store: process.env.SHOPIFY_STORE || 'cryptic-cabin-tcg',
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    apiVersion: process.env.SHOPIFY_API_VERSION || '2025-10'
  },
  output: {
    dir: process.env.OUTPUT_DIR || './data',
    filename: 'cryptic-cabin-inventory.json'
  },
  collection: 'magic-single'
};

// Map your set codes to Scryfall codes where they differ
const SET_CODE_OVERRIDES = {
  // Promos
  'babp': 'pbook', // Buy a Box - adjust as needed
  // Note: ltrh (Holiday Release) contains cards from both ltr AND ltc sets - handled specially in matchToScryfall
  'znl': 'plst',
  'sldfs': 'sld',

  // X-prefix extras (extended art, showcase, bonus sheets) map to base sets
  'xafc': 'afc',
  'xafr': 'afr',
  'xbrc': 'brc',
  'xbro': 'bro',
  'xclb': 'clb',
  'xcmm': 'cmm',
  'xcmr': 'cmr',
  'xdmu': 'dmu',
  'xdsk': 'dsk',
  'xeoc': 'eoc',
  'xeoe': 'eoe',
  'xfin': 'fin',
  'xlci': 'lci',
  'xln': 'xln',   // This IS a real Scryfall set code (Ixalan promos)
  'xltc': 'ltc',
  'xltr': 'ltr',
  'xm3c': 'm3c',
  'xmat': 'mat',
  'xmh3': 'mh3',
  'xmid': 'mid',
  'xmkm': 'mkm',
  'xmom': 'mom',
  'xncc': 'ncc',
  'xneo': 'neo',
  'xotj': 'otj',
  'xpip': 'pip',
  'xrvr': 'rvr',
  'xsld': 'sld',
  'xsnc': 'snc',
  'xtdm': 'tdm',
  'xtla': 'tla',
  'xunf': 'unf',
  'xvow': 'vow',
  'xwho': 'who',
  'xwoc': 'woc',
  'xwoe': 'woe'
};

/**
 * Parse product title
 * Format: "Card Name - Set Name (Rarity) [SET-NUMBER]"
 */
function parseProductTitle(title) {
  const result = {
    cardName: null,
    setName: null,
    setCode: null,
    collectorNumber: null,
    rarity: null
  };

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
    else if (rarityText.includes('special') || rarityText.includes('bonus')) result.rarity = 'special';
    else result.rarity = rarityText;
    workingTitle = workingTitle.replace(/\s*\([^)]+\)$/, '').trim();
  }

  // Split by " - " for card name and set name
  const dashIndex = workingTitle.indexOf(' - ');
  if (dashIndex > 0) {
    result.cardName = workingTitle.substring(0, dashIndex).trim();
    result.setName = workingTitle.substring(dashIndex + 3).trim();
  } else {
    result.cardName = workingTitle;
  }

  // Handle version indicators: "Card Name (V.1)"
  const versionMatch = result.cardName?.match(/^(.+?)\s*\(V\.\d+\)$/i);
  if (versionMatch) {
    result.cardName = versionMatch[1].trim();
  }

  return result;
}

/**
 * Parse variant options (Language, Condition, Edition)
 */
function parseVariantOptions(variant) {
  const result = {
    language: 'en',
    condition: 'NM',
    finish: 'nonfoil'
  };

  const options = variant.options || [];
  const variantTitle = (variant.title || '').toLowerCase();

  for (const option of options) {
    const opt = option.toLowerCase();

    // Edition/Finish
    if (opt.includes('foil') && !opt.includes('non')) {
      result.finish = 'foil';
    }
    if (opt.includes('etched')) {
      result.finish = 'etched';
    }

    // Condition
    if (opt.includes('near mint') || opt === 'nm') result.condition = 'NM';
    else if (opt.includes('lightly played') || opt === 'lp') result.condition = 'LP';
    else if (opt.includes('moderately played') || opt === 'mp') result.condition = 'MP';
    else if (opt.includes('heavily played') || opt === 'hp') result.condition = 'HP';
    else if (opt.includes('damaged') || opt === 'dmg') result.condition = 'DMG';

    // Language
    if (opt === 'japanese' || opt === 'jp') result.language = 'ja';
    else if (opt === 'german' || opt === 'de') result.language = 'de';
    else if (opt === 'french' || opt === 'fr') result.language = 'fr';
    else if (opt === 'italian' || opt === 'it') result.language = 'it';
    else if (opt === 'spanish' || opt === 'es') result.language = 'es';
    else if (opt === 'portuguese' || opt === 'pt') result.language = 'pt';
    else if (opt === 'russian' || opt === 'ru') result.language = 'ru';
    else if (opt === 'korean' || opt === 'ko') result.language = 'ko';
    else if (opt.includes('chinese')) result.language = 'zhs';
  }

  // Fallback: check variant title
  if (variantTitle.includes('foil') && result.finish === 'nonfoil') {
    result.finish = 'foil';
  }
  if (variantTitle.includes('etched')) {
    result.finish = 'etched';
  }

  return result;
}

/**
 * Fetch all MTG products with inventory
 */
async function fetchProducts() {
  const useAdminAPI = !!CONFIG.shopify.accessToken;
  const products = [];

  console.log('Fetching Magic: The Gathering products...');

  if (!useAdminAPI) {
    console.warn('⚠️  No SHOPIFY_ACCESS_TOKEN - inventory quantities will be unavailable');
    console.warn('   Set SHOPIFY_ACCESS_TOKEN env var for accurate stock levels\n');
  }

  if (useAdminAPI) {
    // Use Admin API for accurate inventory
    return await fetchProductsAdminAPI();
  } else {
    // Use public storefront API (no inventory data)
    return await fetchProductsStorefrontAPI();
  }
}

/**
 * Fetch via Shopify Admin API (with inventory)
 */
async function fetchProductsAdminAPI() {
  const products = [];
  let url = `https://${CONFIG.shopify.store}.myshopify.com/admin/api/${CONFIG.shopify.apiVersion}/products.json?limit=250&status=active`;

  console.log(`  Using Admin API with inventory tracking`);
  console.log(`  Store: ${CONFIG.shopify.store}`);
  console.log(`  API Version: ${CONFIG.shopify.apiVersion}`);
  console.log(`  Token present: ${!!CONFIG.shopify.accessToken}`);
  console.log(`  Token length: ${CONFIG.shopify.accessToken?.length || 0}`);
  console.log(`  Request URL: ${url}`);

  while (url) {
    try {
      // Try X-Shopify-Access-Token header first
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': CONFIG.shopify.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || 2;
          console.log(`  Rate limited, waiting ${retryAfter}s...`);
          await sleep(retryAfter * 1000);
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      if (!data.products || data.products.length === 0) break;

      // Filter for MTG products (assuming they have 'magic' in product_type or tags)
      const mtgProducts = data.products.filter(p =>
        p.product_type?.toLowerCase().includes('magic') ||
        p.tags?.toLowerCase().includes('magic') ||
        p.tags?.toLowerCase().includes('mtg')
      );

      products.push(...mtgProducts);
      console.log(`  Fetched ${mtgProducts.length}/${data.products.length} MTG products (total: ${products.length})`);

      // Get next page from Link header (cursor-based pagination)
      const linkHeader = response.headers.get('Link');
      url = null;
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (nextMatch) url = nextMatch[1];
      }

      await sleep(500); // Rate limit protection
    } catch (error) {
      console.error(`  Error fetching products:`, error.message);
      if (products.length === 0) throw error;
      break;
    }
  }

  console.log(`Total MTG products from Admin API: ${products.length}`);
  return products;
}

/**
 * Fetch via public storefront API (no inventory)
 */
async function fetchProductsStorefrontAPI() {
  const products = [];
  let page = 1;
  const limit = 250;

  while (true) {
    const url = `https://tcg.crypticcabin.com/collections/${CONFIG.collection}/products.json?limit=${limit}&page=${page}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CrypticCabin-BulkDataGenerator/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.log('  Rate limited, waiting 3s...');
          await sleep(3000);
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.products || data.products.length === 0) break;

      products.push(...data.products);
      console.log(`  Page ${page}: ${data.products.length} products (total: ${products.length})`);

      if (data.products.length < limit) break;
      page++;
      await sleep(500);
    } catch (error) {
      console.error(`  Error page ${page}:`, error.message);
      if (page > 1) break;
      throw error;
    }
  }

  console.log(`Total products from Storefront API: ${products.length}`);
  return products;
}

/**
 * Download Scryfall bulk data
 */
let scryfallCache = null;

async function loadScryfallData() {
  if (scryfallCache) return scryfallCache;

  console.log('\nLoading Scryfall data...');

  try {
    const bulkResponse = await fetch('https://api.scryfall.com/bulk-data/default-cards', {
      headers: { 'User-Agent': 'CrypticCabin-BulkDataGenerator/1.0', 'Accept': 'application/json' }
    });

    if (!bulkResponse.ok) {
      console.warn('  Could not fetch Scryfall bulk data info');
      return null;
    }

    const bulkInfo = await bulkResponse.json();
    console.log(`  Downloading ${(bulkInfo.size / 1024 / 1024).toFixed(1)}MB...`);

    const dataResponse = await fetch(bulkInfo.download_uri, {
      headers: { 'User-Agent': 'CrypticCabin-BulkDataGenerator/1.0' }
    });

    if (!dataResponse.ok) {
      console.warn('  Could not download Scryfall data');
      return null;
    }

    const cards = await dataResponse.json();
    console.log(`  Loaded ${cards.length.toLocaleString()} cards`);

    // Build lookup maps
    scryfallCache = {
      bySetNumber: new Map(),
      byNameSet: new Map(),
      byName: new Map()
    };

    for (const card of cards) {
      if (!card.games?.includes('paper')) continue;

      const setNumKey = `${card.set}-${card.collector_number}`.toLowerCase();
      scryfallCache.bySetNumber.set(setNumKey, card);

      const nameSetKey = `${card.name.toLowerCase()}-${card.set}`;
      if (!scryfallCache.byNameSet.has(nameSetKey)) {
        scryfallCache.byNameSet.set(nameSetKey, card);
      }

      const nameKey = card.name.toLowerCase();
      const existing = scryfallCache.byName.get(nameKey);
      if (!existing || new Date(card.released_at) > new Date(existing.released_at)) {
        scryfallCache.byName.set(nameKey, card);
      }
    }

    console.log(`  Built ${scryfallCache.bySetNumber.size.toLocaleString()} lookup entries`);
    return scryfallCache;
  } catch (error) {
    console.error('  Error:', error.message);
    return null;
  }
}

// Sets that can map to multiple Scryfall sets (check all and verify by name)
const MULTI_SET_MAPPINGS = {
  'ltrh': ['ltr', 'ltc']  // LotR Holiday Release contains cards from both main set and Commander
};

/**
 * Normalize card name for comparison (handle special characters)
 */
function normalizeCardName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
    .replace(/[^a-z0-9\s]/g, '')      // Remove special chars
    .trim();
}

/**
 * Match card to Scryfall
 */
function matchToScryfall(parsed, scryfallData) {
  if (!scryfallData) return null;

  let setCode = parsed.setCode;
  const normalizedName = normalizeCardName(parsed.cardName);

  // Handle sets that map to multiple Scryfall sets
  if (setCode && MULTI_SET_MAPPINGS[setCode]) {
    const possibleSets = MULTI_SET_MAPPINGS[setCode];

    // Try each possible set with collector number
    if (parsed.collectorNumber) {
      for (const trySet of possibleSets) {
        const key = `${trySet}-${parsed.collectorNumber}`;
        const match = scryfallData.bySetNumber.get(key);
        // Verify the name matches (to avoid wrong card with same collector number)
        if (match && normalizeCardName(match.name) === normalizedName) {
          return match;
        }
      }
    }

    // Try name + each possible set
    if (parsed.cardName) {
      for (const trySet of possibleSets) {
        const match = scryfallData.byNameSet.get(`${parsed.cardName.toLowerCase()}-${trySet}`);
        if (match) return match;
      }
    }
  }

  // Standard single-set mapping
  if (setCode && SET_CODE_OVERRIDES[setCode]) {
    setCode = SET_CODE_OVERRIDES[setCode];
  }

  // Try set + collector number
  if (setCode && parsed.collectorNumber) {
    const key = `${setCode}-${parsed.collectorNumber}`;
    let match = scryfallData.bySetNumber.get(key);
    if (match) return match;

    // Try without leading zeros
    const numNoZero = parsed.collectorNumber.replace(/^0+/, '');
    if (numNoZero !== parsed.collectorNumber) {
      match = scryfallData.bySetNumber.get(`${setCode}-${numNoZero}`);
      if (match) return match;
    }
  }

  // Try name + set
  if (parsed.cardName && setCode) {
    const match = scryfallData.byNameSet.get(`${parsed.cardName.toLowerCase()}-${setCode}`);
    if (match) return match;
  }

  // Fallback: name only
  if (parsed.cardName) {
    return scryfallData.byName.get(parsed.cardName.toLowerCase());
  }

  return null;
}

/**
 * Transform to Scryfall-compatible format
 */
function transformToCard(product, variant, parsed, variantOptions, scryfallCard) {
  const price = parseFloat(variant.price) || 0;
  const compareAt = variant.compare_at_price ? parseFloat(variant.compare_at_price) : null;
  const quantity = variant.inventory_quantity ?? 0;
  const inStock = variant.available !== false && quantity > 0;
  const id = `cc-${product.id}-${variant.id}`;

  return {
    // Identifiers
    id,
    oracle_id: scryfallCard?.oracle_id || null,
    scryfall_id: scryfallCard?.id || null,

    // Card info
    name: parsed.cardName || product.title,
    set: parsed.setCode || 'unknown',
    set_name: parsed.setName || scryfallCard?.set_name || null,
    collector_number: parsed.collectorNumber || '0',
    rarity: parsed.rarity || scryfallCard?.rarity || 'unknown',

    // Game data
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

    // Images
    image_uris: scryfallCard?.image_uris || {
      small: product.images?.[0]?.src || null,
      normal: product.images?.[0]?.src || null,
      large: product.images?.[0]?.src || null
    },
    card_faces: scryfallCard?.card_faces || null,
    full_art: scryfallCard?.full_art || false,
    layout: scryfallCard?.layout || 'normal',

    // Cryptic Cabin data
    cryptic_cabin: {
      product_id: product.id,
      variant_id: variant.id,
      inventory_item_id: variant.inventory_item_id || null,
      sku: variant.sku || null,
      handle: product.handle,
      url: `https://tcg.crypticcabin.com/products/${product.handle}`,
      variant_url: product.variants?.length > 1
        ? `https://tcg.crypticcabin.com/products/${product.handle}?variant=${variant.id}`
        : `https://tcg.crypticcabin.com/products/${product.handle}`,
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

    // Scryfall-style prices
    prices: {
      gbp: variantOptions.finish === 'nonfoil' && price > 0 ? price.toFixed(2) : null,
      gbp_foil: variantOptions.finish === 'foil' && price > 0 ? price.toFixed(2) : null,
      gbp_etched: variantOptions.finish === 'etched' && price > 0 ? price.toFixed(2) : null
    },

    finishes: [variantOptions.finish],
    lang: variantOptions.language,
    released_at: scryfallCard?.released_at || null,
    scryfall_uri: scryfallCard?.scryfall_uri || null,
    purchase_uris: {
      cryptic_cabin: `https://tcg.crypticcabin.com/products/${product.handle}`
    }
  };
}

/**
 * Main generation
 */
async function generateBulkData() {
  const startTime = Date.now();

  console.log('═'.repeat(60));
  console.log('  Cryptic Cabin MTG Bulk Data Generator');
  console.log('═'.repeat(60));
  console.log(`  Started: ${new Date().toISOString()}\n`);

  const products = await fetchProducts();
  const scryfallData = await loadScryfallData();

  const cards = [];
  const stats = {
    products: products.length,
    variants: 0,
    matched: 0,
    unmatched: 0,
    inStock: 0,
    outOfStock: 0,
    byCondition: {},
    byFinish: {}
  };

  console.log('\nProcessing...');

  for (const product of products) {
    const parsed = parseProductTitle(product.title);

    for (const variant of product.variants || []) {
      stats.variants++;
      const variantOptions = parseVariantOptions(variant);
      const scryfallCard = matchToScryfall(parsed, scryfallData);

      if (scryfallCard) stats.matched++;
      else stats.unmatched++;

      const card = transformToCard(product, variant, parsed, variantOptions, scryfallCard);
      cards.push(card);

      if (card.cryptic_cabin.in_stock) stats.inStock++;
      else stats.outOfStock++;

      stats.byCondition[variantOptions.condition] = (stats.byCondition[variantOptions.condition] || 0) + 1;
      stats.byFinish[variantOptions.finish] = (stats.byFinish[variantOptions.finish] || 0) + 1;
    }
  }

  // Sort
  cards.sort((a, b) => {
    const nameCompare = (a.name || '').localeCompare(b.name || '');
    if (nameCompare !== 0) return nameCompare;
    const setCompare = (a.set || '').localeCompare(b.set || '');
    if (setCompare !== 0) return setCompare;
    return (parseInt(a.collector_number) || 0) - (parseInt(b.collector_number) || 0);
  });

  const bulkData = {
    object: 'list',
    total_cards: cards.length,
    has_more: false,
    data_source: 'cryptic_cabin',
    store_name: 'Cryptic Cabin',
    store_url: 'https://tcg.crypticcabin.com',
    locations: [
      { name: 'Bracknell', address: '11D Moss End Garden Village, RG42 6EJ' },
      { name: 'Bristol', address: '76 High Street, Hanham, BS15 3DS' }
    ],
    generated_at: new Date().toISOString(),
    statistics: {
      products_processed: stats.products,
      total_listings: stats.variants,
      scryfall_matched: stats.matched,
      scryfall_unmatched: stats.unmatched,
      match_rate: `${((stats.matched / stats.variants) * 100).toFixed(1)}%`,
      in_stock: stats.inStock,
      out_of_stock: stats.outOfStock,
      by_condition: stats.byCondition,
      by_finish: stats.byFinish
    },
    data: cards
  };

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '═'.repeat(60));
  console.log('  Complete');
  console.log('═'.repeat(60));
  console.log(`  Products:  ${stats.products.toLocaleString()}`);
  console.log(`  Listings:  ${stats.variants.toLocaleString()}`);
  console.log(`  Matched:   ${stats.matched.toLocaleString()} (${((stats.matched / stats.variants) * 100).toFixed(1)}%)`);
  console.log(`  In Stock:  ${stats.inStock.toLocaleString()}`);
  console.log(`  Duration:  ${duration}s`);

  return bulkData;
}

/**
 * Save to files
 */
async function saveBulkData(bulkData, outputDir = CONFIG.output.dir) {
  const outputPath = `${outputDir}/${CONFIG.output.filename}`;
  await fs.mkdir(outputDir, { recursive: true });

  const json = JSON.stringify(bulkData);
  await fs.writeFile(outputPath, json, 'utf8');
  await fs.writeFile(`${outputPath}.gz`, zlib.gzipSync(json));

  const jsonStats = await fs.stat(outputPath);
  const gzStats = await fs.stat(`${outputPath}.gz`);

  console.log(`\n  Saved: ${outputPath}`);
  console.log(`    JSON: ${(jsonStats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`    Gzip: ${(gzStats.size / 1024 / 1024).toFixed(2)} MB`);

  return outputPath;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    const bulkData = await generateBulkData();
    await saveBulkData(bulkData, process.argv[2] || CONFIG.output.dir);
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

module.exports = { generateBulkData, saveBulkData, parseProductTitle, parseVariantOptions, CONFIG };

if (require.main === module) {
  main();
}
