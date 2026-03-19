const https = require('https');

const EMBED_COLOR = 0x7c3aed;

function strapiGet(path) {
  const baseUrl = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_API_URL || 'https://accessible-positivity-e213bb2958.strapiapp.com';
  if (!baseUrl) return Promise.reject(new Error('STRAPI_URL not configured'));

  const url = new URL(path, baseUrl);
  const headers = {};
  if (process.env.STRAPI_API_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.STRAPI_API_TOKEN}`;
  }

  return new Promise((resolve, reject) => {
    const mod = url.protocol === 'https:' ? https : require('http');
    mod.get(url.toString(), { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse Strapi response')); }
      });
    }).on('error', reject);
  });
}

async function handleEvents(location) {
  if (!process.env.STRAPI_URL) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Events Unavailable',
          description: 'Strapi backend is not configured.',
          color: EMBED_COLOR
        }]
      }
    };
  }

  try {
    const now = new Date().toISOString();
    let queryParams = `filters[startDate][$gte]=${now}&sort=startDate:asc&pagination[limit]=6`;

    if (location) {
      // Filter by store location if provided
      const locationMap = {
        'bracknell': 'Bracknell',
        'bristol': 'Bristol'
      };
      const mapped = locationMap[location.toLowerCase()];
      if (mapped) {
        queryParams += `&filters[location][$eqi]=${mapped}`;
      }
    }

    // Try common Strapi event content type names
    let result;
    try {
      result = await strapiGet(`/api/events?${queryParams}&populate=*`);
    } catch (e) {
      // Fallback: try singular
      result = await strapiGet(`/api/event?${queryParams}&populate=*`);
    }

    const events = result?.data || [];

    if (events.length === 0) {
      const locationStr = location ? ` in ${location}` : '';
      return {
        type: 4,
        data: {
          embeds: [{
            title: 'Upcoming Events',
            description: `No upcoming events found${locationStr}. Check back soon!`,
            color: EMBED_COLOR,
            url: 'https://leagues.crypticcabin.com'
          }]
        }
      };
    }

    const fields = events.slice(0, 6).map(event => {
      const attrs = event.attributes || event;
      const date = attrs.startDate || attrs.date || attrs.eventDate;
      const dateStr = date ? new Date(date).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }) : 'TBD';

      const details = [
        dateStr,
        attrs.location && `Location: ${attrs.location}`,
        attrs.gameSystem && `Game: ${attrs.gameSystem}`,
        attrs.entryFee && `Entry: ${attrs.entryFee}`,
      ].filter(Boolean).join('\n');

      return {
        name: attrs.name || attrs.title || 'Unnamed Event',
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
          url: 'https://leagues.crypticcabin.com'
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
          description: 'Could not fetch events. Please try again later.',
          color: EMBED_COLOR
        }]
      }
    };
  }
}

module.exports = { handleEvents };
