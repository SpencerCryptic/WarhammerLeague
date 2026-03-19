const https = require('https');

const EMBED_COLOR = 0x00b4d8;

// Game keyword -> Shopify product_type / tag filters
const GAME_FILTERS = {
  '40k': 'Warhammer 40,000',
  'warhammer': 'Warhammer',
  'sigmar': 'Age of Sigmar',
  'aos': 'Age of Sigmar',
  'mtg': 'Magic: The Gathering',
  'magic': 'Magic: The Gathering',
  'pokemon': 'Pokemon',
  'yugioh': 'Yu-Gi-Oh',
  'lorcana': 'Lorcana',
  'heresy': 'Horus Heresy',
  'killteam': 'Kill Team',
  'kill team': 'Kill Team',
  'bloodbowl': 'Blood Bowl',
  'blood bowl': 'Blood Bowl',
};

function shopifyGraphQL(domain, token, query, variables) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query, variables });
    const req = https.request({
      hostname: domain,
      path: '/api/2024-01/graphql.json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token,
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse Shopify response')); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function handleStock(query) {
  const domain = process.env.SHOPIFY_DOMAIN || 'crypticcabin.myshopify.com';
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;

  if (!token) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Stock Search Unavailable',
          description: 'Shopify integration is not configured.',
          color: EMBED_COLOR
        }]
      }
    };
  }

  // Detect game keywords for filtering
  const lowerQuery = query.toLowerCase();
  let productTypeFilter = '';
  for (const [keyword, gameType] of Object.entries(GAME_FILTERS)) {
    if (lowerQuery.includes(keyword)) {
      productTypeFilter = ` product_type:${gameType}`;
      break;
    }
  }

  const gqlQuery = `
    query searchProducts($query: String!) {
      search(first: 5, query: $query, types: PRODUCT) {
        edges {
          node {
            ... on Product {
              title
              handle
              productType
              availableForSale
              totalInventory
              variants(first: 10) {
                edges {
                  node {
                    title
                    price { amount currencyCode }
                    availableForSale
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const result = await shopifyGraphQL(domain, token, gqlQuery, {
      query: query + productTypeFilter
    });

    const products = (result?.data?.search?.edges || []).filter(e => e.node.title);

    if (products.length === 0) {
      return {
        type: 4,
        data: {
          embeds: [{
            title: `No results for "${query}"`,
            description: 'Try a different search term or check the store directly.',
            color: EMBED_COLOR,
            url: `https://crypticcabin.com/search?q=${encodeURIComponent(query)}`
          }]
        }
      };
    }

    const fields = products.map(({ node }) => {
      const variants = node.variants.edges;
      const prices = variants.map(v => parseFloat(v.node.price.amount));
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceStr = minPrice === maxPrice
        ? `\u00A3${minPrice.toFixed(2)}`
        : `\u00A3${minPrice.toFixed(2)} - \u00A3${maxPrice.toFixed(2)}`;

      const stockStatus = node.availableForSale ? 'In Stock' : 'Out of Stock';
      const variantCount = variants.length > 1 ? ` (${variants.length} variants)` : '';

      return {
        name: node.title,
        value: `${priceStr} \u00B7 ${stockStatus}${variantCount}\n[View Product](https://crypticcabin.com/products/${node.handle})`,
        inline: false
      };
    });

    return {
      type: 4,
      data: {
        embeds: [{
          title: `Stock Search: "${query}"`,
          color: EMBED_COLOR,
          fields,
          footer: { text: 'Cryptic Cabin \u00B7 crypticcabin.com' },
          url: `https://crypticcabin.com/search?q=${encodeURIComponent(query)}`
        }]
      }
    };
  } catch (err) {
    console.error('Stock search error:', err);
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Stock Search Error',
          description: 'Something went wrong searching the store. Please try again later.',
          color: EMBED_COLOR
        }]
      }
    };
  }
}

module.exports = { handleStock };
