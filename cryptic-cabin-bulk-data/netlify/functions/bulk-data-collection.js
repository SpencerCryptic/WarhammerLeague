/**
 * Netlify Function: Collection Lookup
 * 
 * POST /api/bulk-data/collection
 * 
 * Batch lookup cards by identifiers (like Scryfall /cards/collection)
 * 
 * Body: {
 *   identifiers: [
 *     { scryfall_id: "xxx" },
 *     { name: "Lightning Bolt" },
 *     { name: "Sol Ring", set: "cmm" },
 *     { set: "mh3", collector_number: "224" }
 *   ]
 * }
 */

const fs = require('fs');
const path = require('path');

let cachedData = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const { identifiers } = body;

    if (!identifiers || !Array.isArray(identifiers)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'identifiers array required' }) };
    }

    if (identifiers.length > 75) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Maximum 75 identifiers per request' }) };
    }

    const bulkData = loadData();
    const found = [];
    const notFound = [];

    for (const identifier of identifiers) {
      let match = null;

      // Match by Scryfall ID (exact)
      if (identifier.scryfall_id) {
        match = bulkData.data.find(c => c.scryfall_id === identifier.scryfall_id);
      }
      // Match by Oracle ID (all printings - return first in-stock or first match)
      else if (identifier.oracle_id) {
        const matches = bulkData.data.filter(c => c.oracle_id === identifier.oracle_id);
        match = matches.find(c => c.cryptic_cabin?.in_stock) || matches[0];
      }
      // Match by set + collector number
      else if (identifier.set && identifier.collector_number) {
        match = bulkData.data.find(c =>
          c.set === identifier.set.toLowerCase() &&
          c.collector_number === String(identifier.collector_number)
        );
      }
      // Match by name + set
      else if (identifier.name && identifier.set) {
        const matches = bulkData.data.filter(c =>
          c.name?.toLowerCase() === identifier.name.toLowerCase() &&
          c.set === identifier.set.toLowerCase()
        );
        // Prefer in-stock
        match = matches.find(c => c.cryptic_cabin?.in_stock) || matches[0];
      }
      // Match by name only (return cheapest in-stock)
      else if (identifier.name) {
        const matches = bulkData.data.filter(c =>
          c.name?.toLowerCase() === identifier.name.toLowerCase()
        );
        // Sort by: in_stock desc, then price asc
        matches.sort((a, b) => {
          if (a.cryptic_cabin?.in_stock && !b.cryptic_cabin?.in_stock) return -1;
          if (!a.cryptic_cabin?.in_stock && b.cryptic_cabin?.in_stock) return 1;
          return (a.cryptic_cabin?.price_gbp || 0) - (b.cryptic_cabin?.price_gbp || 0);
        });
        match = matches[0];
      }

      if (match) {
        found.push(match);
      } else {
        notFound.push(identifier);
      }
    }

    // Calculate total price for found cards
    const totalPrice = found.reduce((sum, card) => {
      return sum + (card.cryptic_cabin?.in_stock ? (card.cryptic_cabin?.price_gbp || 0) : 0);
    }, 0);

    const inStockCount = found.filter(c => c.cryptic_cabin?.in_stock).length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        object: 'list',
        total_cards: found.length,
        not_found: notFound,
        summary: {
          requested: identifiers.length,
          found: found.length,
          not_found: notFound.length,
          in_stock: inStockCount,
          out_of_stock: found.length - inStockCount,
          total_price_gbp: totalPrice.toFixed(2),
          currency: 'GBP'
        },
        data: found
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
