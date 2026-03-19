const https = require('https');

const EMBED_COLOR = 0xf59e0b;

function appointoGet(path) {
  const token = process.env.APPOINTO_TOKEN;
  if (!token) return Promise.reject(new Error('APPOINTO_TOKEN not configured'));

  return new Promise((resolve, reject) => {
    https.get(`https://app.appointo.me/api${path}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse Appointo response')); }
      });
    }).on('error', reject);
  });
}

const TABLE_SIZE_MAP = {
  '6x4': ['6x4', '6-x-4', 'table-hire-6x4', 'standard'],
  '4x4': ['4x4', '4-x-4', 'table-hire-4x4'],
};

async function handleBook(tableSize, date) {
  if (!process.env.APPOINTO_TOKEN) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Table Booking',
          description: 'Table booking integration is not configured yet.\n\nVisit the store to book directly:',
          color: EMBED_COLOR,
          url: 'https://crypticcabin.com/collections/table-hire',
          footer: { text: 'Cryptic Cabin · Table Hire' }
        }]
      }
    };
  }

  try {
    // Get available products from Appointo
    const products = await appointoGet('/products');

    // Find matching table product
    const sizeTerms = TABLE_SIZE_MAP[tableSize.toLowerCase()] || [tableSize.toLowerCase()];
    const matched = (products.data || products || []).find(p => {
      const handle = (p.handle || p.title || '').toLowerCase();
      return sizeTerms.some(term => handle.includes(term));
    });

    if (!matched) {
      return {
        type: 4,
        data: {
          embeds: [{
            title: `Table Hire: ${tableSize}`,
            description: `Couldn't find a "${tableSize}" table. Available sizes: 6x4 (standard wargaming), 4x4.\n\n[Browse Table Hire](https://crypticcabin.com/collections/table-hire)`,
            color: EMBED_COLOR
          }]
        }
      };
    }

    const handle = matched.handle || matched.title?.toLowerCase().replace(/\s+/g, '-');
    const bookingUrl = `https://crypticcabin.com/collections/table-hire/products/${handle}`;

    // If a date is provided, try to get available slots
    if (date) {
      try {
        const productId = matched.id || matched.product_id;
        const slots = await appointoGet(`/products/${productId}/slots?date=${date}`);
        const available = (slots.data || slots || []).filter(s => s.available !== false);

        if (available.length === 0) {
          return {
            type: 4,
            data: {
              embeds: [{
                title: `Table Hire: ${tableSize} — ${date}`,
                description: `No available slots on ${date}.\n\nTry a different date or [book online](${bookingUrl}).`,
                color: EMBED_COLOR
              }]
            }
          };
        }

        const slotLines = available.slice(0, 8).map(s => {
          const time = s.start_time || s.time || s.slot;
          return `• ${time}`;
        }).join('\n');

        return {
          type: 4,
          data: {
            embeds: [{
              title: `Table Hire: ${tableSize} — ${date}`,
              description: `**Available Slots:**\n${slotLines}`,
              color: EMBED_COLOR,
              url: bookingUrl,
              footer: { text: 'Click the title to book · Cryptic Cabin' }
            }]
          }
        };
      } catch (slotErr) {
        console.error('Slot fetch error:', slotErr);
        // Fall through to basic product info
      }
    }

    // Return basic product info + booking link
    return {
      type: 4,
      data: {
        embeds: [{
          title: `Table Hire: ${tableSize}`,
          description: `**${matched.title || tableSize}**\n\nBook your table online:`,
          color: EMBED_COLOR,
          url: bookingUrl,
          fields: [
            { name: 'Book Now', value: `[${bookingUrl}](${bookingUrl})`, inline: false }
          ],
          footer: { text: 'Cryptic Cabin · Table Hire' }
        }]
      }
    };
  } catch (err) {
    console.error('Book command error:', err);
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Table Booking Error',
          description: 'Something went wrong. [Book directly on the website](https://crypticcabin.com/collections/table-hire).',
          color: EMBED_COLOR
        }]
      }
    };
  }
}

module.exports = { handleBook };
