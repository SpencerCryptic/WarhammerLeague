const https = require('https');

const EMBED_COLOR = 0x10b981;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://leagues.crypticcabin.com';

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

async function handleLeague(gameSystem) {
  if (!process.env.STRAPI_URL) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'League Standings Unavailable',
          description: 'Strapi backend is not configured.',
          color: EMBED_COLOR
        }]
      }
    };
  }

  try {
    // Fetch ongoing leagues
    let leagueQuery = 'filters[statusleague][$eq]=ongoing&sort=createdAt:desc&pagination[limit]=3&populate[league_players][sort]=rankingPoints:desc&populate[league_players][pagination][limit]=10&populate[league_players][fields][0]=leagueName&populate[league_players][fields][1]=faction&populate[league_players][fields][2]=wins&populate[league_players][fields][3]=draws&populate[league_players][fields][4]=losses&populate[league_players][fields][5]=rankingPoints';

    if (gameSystem) {
      // Map common shorthand to actual enum values
      const systemMap = {
        '40k': 'Warhammer: 40,000',
        'aos': 'Age of Sigmar',
        'sigmar': 'Age of Sigmar',
        'heresy': 'Horus Heresy',
        'killteam': 'Kill Team',
        'bloodbowl': 'Blood Bowl',
        'oldworld': 'The Old World',
      };
      const mapped = systemMap[gameSystem.toLowerCase()] || gameSystem;
      leagueQuery += `&filters[gameSystem][$eqi]=${encodeURIComponent(mapped)}`;
    }

    const result = await strapiGet(`/api/leagues?${leagueQuery}`);
    const leagues = result?.data || [];

    if (leagues.length === 0) {
      const systemStr = gameSystem ? ` for ${gameSystem}` : '';
      return {
        type: 4,
        data: {
          embeds: [{
            title: 'League Standings',
            description: `No active leagues found${systemStr}.\n\n[View all leagues](${FRONTEND_URL}/leagues)`,
            color: EMBED_COLOR
          }]
        }
      };
    }

    const embeds = leagues.map(league => {
      const attrs = league.attributes || league;
      const players = (attrs.league_players?.data || attrs.league_players || [])
        .map(p => p.attributes || p)
        .sort((a, b) => (b.rankingPoints || 0) - (a.rankingPoints || 0))
        .slice(0, 10);

      const standingsLines = players.map((p, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const record = `${p.wins || 0}W/${p.draws || 0}D/${p.losses || 0}L`;
        return `${medal} **${p.leagueName}** — ${p.rankingPoints || 0}pts (${record})${p.faction ? ` · ${p.faction}` : ''}`;
      }).join('\n');

      const leagueId = league.documentId || league.id;

      return {
        title: attrs.name || 'Unnamed League',
        description: standingsLines || 'No players yet.',
        color: EMBED_COLOR,
        fields: [
          { name: 'Game System', value: attrs.gameSystem || 'Not specified', inline: true },
          { name: 'Format', value: attrs.format?.replace(/_/g, ' ') || 'Round Robin', inline: true }
        ],
        url: `${FRONTEND_URL}/leagues/${leagueId}`,
        footer: { text: 'Cryptic Cabin Leagues · leagues.crypticcabin.com' }
      };
    });

    return {
      type: 4,
      data: { embeds }
    };
  } catch (err) {
    console.error('League standings error:', err);
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'League Standings Error',
          description: `Something went wrong. [View standings online](${FRONTEND_URL}/leagues).`,
          color: EMBED_COLOR
        }]
      }
    };
  }
}

module.exports = { handleLeague };
