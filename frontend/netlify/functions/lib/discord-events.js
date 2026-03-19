const https = require('https');

const EMBED_COLOR = 0x7c3aed;
const STRAPI_BASE = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_API_URL || 'https://accessible-positivity-e213bb2958.strapiapp.com';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse response')); }
      });
    }).on('error', reject);
  });
}

async function handleEvents(location) {
  try {
    // Use the same store-events endpoint as the frontend (fetches from Mahina)
    const result = await fetchJSON(`${STRAPI_BASE}/api/leagues/store-events`);
    let events = result?.data || [];

    // Filter by location if provided
    if (location) {
      const loc = location.toLowerCase();
      events = events.filter(e => {
        const eventLoc = (e.location || '').toLowerCase();
        return eventLoc.includes(loc);
      });
    }

    // Strapi store-events endpoint already returns upcoming events only

    if (events.length === 0) {
      const locationStr = location ? ` in ${location}` : '';
      return {
        type: 4,
        data: {
          embeds: [{
            title: 'Upcoming Events',
            description: `No upcoming events found${locationStr}. Check back soon!`,
            color: EMBED_COLOR,
            url: 'https://crypticcabin.com/pages/events'
          }]
        }
      };
    }

    const fields = events.slice(0, 6).map(event => {
      const details = [
        event.date,
        event.location && `Cryptic Cabin ${event.location}`,
        event.gameType && `Type: ${event.gameType}`,
      ].filter(Boolean).join('\n');

      return {
        name: event.title || 'Unnamed Event',
        value: details || 'No details available',
        inline: false
      };
    });

    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Upcoming Events',
          color: EMBED_COLOR,
          fields,
          footer: { text: 'Cryptic Cabin Events' },
          url: 'https://crypticcabin.com/pages/events'
        }]
      }
    };
  } catch (err) {
    console.error('Events fetch error:', err);
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Events Error',
          description: 'Could not fetch events. [View events online](https://crypticcabin.com/pages/events).',
          color: EMBED_COLOR
        }]
      }
    };
  }
}

module.exports = { handleEvents };
