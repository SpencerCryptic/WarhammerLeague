const https = require('https');

const EMBED_COLOR = 0x00b4d8;
const STORE_DOMAIN = 'crypticcabin.com';

/**
 * Shopify Predictive Search API — same as the website search bar.
 * Public endpoint, no authentication needed.
 */
function predictiveSearch(query, limit = 5) {
  const params = `q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=${limit}`;
  return new Promise((resolve, reject) => {
    https.get(`https://${STORE_DOMAIN}/search/suggest.json?${params}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse Shopify response')); }
      });
    }).on('error', reject);
  });
}

async function handleStock(query) {
  try {
    const result = await predictiveSearch(query);
    const products = result?.resources?.results?.products || [];

    if (products.length === 0) {
      return {
        type: 4,
        data: {
          embeds: [{
            title: `No results for "${query}"`,
            description: 'Try a different search term or check the store directly.',
            color: EMBED_COLOR,
            url: `https://${STORE_DOMAIN}/search?q=${encodeURIComponent(query)}`
          }]
        }
      };
    }

    const fields = products.map(product => {
      const price = product.price;
      // Shopify returns price in minor units (pence) as a string like "3655"
      // or as a formatted string — handle both
      let priceStr;
      if (price && typeof price === 'string' && !price.includes('.')) {
        const pence = parseInt(price, 10);
        priceStr = `\u00A3${(pence / 100).toFixed(2)}`;
      } else if (price) {
        priceStr = `\u00A3${parseFloat(price).toFixed(2)}`;
      } else {
        priceStr = 'Price N/A';
      }

      const available = product.available;
      const stockStatus = available ? 'In Stock' : 'Out of Stock';
      const handle = product.handle || product.url?.split('/products/')[1];

      return {
        name: product.title,
        value: `${priceStr} \u00B7 ${stockStatus}\n[View Product](https://${STORE_DOMAIN}/products/${handle})`,
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
          url: `https://${STORE_DOMAIN}/search?q=${encodeURIComponent(query)}`
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
