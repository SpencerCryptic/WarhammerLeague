/**
 * Netlify Function: Bulk Data API
 * 
 * GET /api/bulk-data - List all cards (paginated)
 * GET /api/bulk-data?set=mh3 - Filter by set
 * GET /api/bulk-data?q=bolt - Search by name
 * GET /api/bulk-data?in_stock=true - In-stock only
 */

const fs = require('fs');
const path = require('path');

let cachedData = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function loadData() {
  if (cachedData && Date.now() - cacheTime < CACHE_TTL) {
    return cachedData;
  }

  const paths = [
    path.join(__dirname, '../../public/bulk-data/cryptic-cabin-inventory.json'),
    '/var/task/public/bulk-data/cryptic-cabin-inventory.json'
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      cachedData = JSON.parse(fs.readFileSync(p, 'utf8'));
      cacheTime = Date.now();
      return cachedData;
    }
  }
  throw new Error('Bulk data not found');
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const bulkData = loadData();
    let cards = bulkData.data;
    const params = event.queryStringParameters || {};

    // Filters
    if (params.scryfall_id) {
      cards = cards.filter(c => c.scryfall_id === params.scryfall_id);
    }
    if (params.oracle_id) {
      cards = cards.filter(c => c.oracle_id === params.oracle_id);
    }
    if (params.set) {
      cards = cards.filter(c => c.set === params.set.toLowerCase());
    }
    if (params.q) {
      const q = params.q.toLowerCase();
      cards = cards.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.type_line?.toLowerCase().includes(q) ||
        c.oracle_text?.toLowerCase().includes(q)
      );
    }
    if (params.in_stock === 'true') {
      cards = cards.filter(c => c.cryptic_cabin?.in_stock);
    }
    if (params.condition) {
      cards = cards.filter(c => c.cryptic_cabin?.condition === params.condition.toUpperCase());
    }
    if (params.finish) {
      cards = cards.filter(c => c.cryptic_cabin?.finish === params.finish.toLowerCase());
    }
    if (params.rarity) {
      cards = cards.filter(c => c.rarity === params.rarity.toLowerCase());
    }
    if (params.min_price) {
      const min = parseFloat(params.min_price);
      cards = cards.filter(c => (c.cryptic_cabin?.price_gbp || 0) >= min);
    }
    if (params.max_price) {
      const max = parseFloat(params.max_price);
      cards = cards.filter(c => (c.cryptic_cabin?.price_gbp || 0) <= max);
    }
    if (params.colors) {
      const colors = params.colors.toUpperCase().split('');
      cards = cards.filter(c => {
        if (!c.color_identity?.length) return colors.includes('C');
        return colors.some(col => c.color_identity.includes(col));
      });
    }

    // Sort
    const sortBy = params.sort || 'name';
    const sortDir = params.dir === 'desc' ? -1 : 1;
    cards.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'price':
          aVal = a.cryptic_cabin?.price_gbp || 0;
          bVal = b.cryptic_cabin?.price_gbp || 0;
          break;
        case 'set':
          aVal = a.set || '';
          bVal = b.set || '';
          break;
        default:
          aVal = a.name || '';
          bVal = b.name || '';
      }
      return sortDir * (typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal);
    });

    // Pagination
    const page = Math.max(1, parseInt(params.page) || 1);
    const pageSize = Math.min(Math.max(1, parseInt(params.page_size) || 175), 1000);
    const start = (page - 1) * pageSize;
    const paged = cards.slice(start, start + pageSize);
    const hasMore = start + pageSize < cards.length;

    // Build next_page URL with filters
    let nextPage = null;
    if (hasMore) {
      const filterKeys = Object.keys(params).filter(k => !['page', 'page_size'].includes(k));
      const filterParams = filterKeys.map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
      nextPage = `/api/bulk-data?page=${page + 1}&page_size=${pageSize}${filterParams ? '&' + filterParams : ''}`;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        object: 'list',
        total_cards: cards.length,
        has_more: hasMore,
        next_page: nextPage,
        data: paged,
        generated_at: bulkData.generated_at
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
