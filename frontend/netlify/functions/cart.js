/**
 * Cart API Documentation Endpoint
 *
 * GET /api/cart - Returns API documentation
 */

exports.handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin || '';

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      name: 'Cryptic Cabin Cart Import API',
      version: '1.0.0',
      description: 'Import decklists from Moxfield, Archidekt, and other deck builders',
      endpoints: {
        'POST /api/cart/import': {
          description: 'Import cards to cart',
          body: {
            cards: [
              { scryfall_id: 'string', quantity: 'number', finish: 'foil|nonfoil|etched (optional)' },
              { oracle_id: 'string', quantity: 'number', finish: 'foil|nonfoil|etched (optional)' },
              { name: 'string', set: 'string?', collector_number: 'string?', quantity: 'number', finish: 'foil|nonfoil|etched (optional)' }
            ],
            decklist: 'Plain text decklist string (alternative to cards array)',
            source: 'Affiliate source for tracking (e.g., "moxfield", "archidekt")'
          },
          notes: 'finish filters by card finish. source adds affiliate tracking to cart URL as Shopify cart attributes.'
        },
        'GET /api/cart/import': {
          description: 'Redirect to cart with cards',
          query: 'cards=scryfall_id:qty,scryfall_id:qty'
        },
        'GET /api/cart/lookup': {
          description: 'Check if a card is in stock',
          query: 'scryfall_id=xxx OR oracle_id=xxx OR name=xxx OR set=xxx&collector_number=xxx'
        }
      },
      store: {
        name: 'Cryptic Cabin',
        url: 'https://tcg.crypticcabin.com',
        inventory_url: 'https://leagues.crypticcabin.com/bulk-data/cryptic-cabin-inventory.json'
      },
      allowed_origins: [
        'moxfield.com',
        'archidekt.com',
        'mtggoldfish.com',
        'deckstats.net',
        'manabox.app',
        'fabrary.net'
      ],
      contact: 'contact@crypticcabin.com'
    }, null, 2)
  };
};
