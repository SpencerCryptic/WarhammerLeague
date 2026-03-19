const https = require('https');

const EMBED_COLOR = 0x10b981;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://leagues.crypticcabin.com';
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

// Map shorthand to actual enum values
const SYSTEM_MAP = {
  '40k': 'Warhammer: 40,000',
  'aos': 'Age of Sigmar',
  'sigmar': 'Age of Sigmar',
  'heresy': 'Warhammer: The Horus Heresy',
  'killteam': 'Kill Team',
  'bloodbowl': 'Blood Bowl',
  'oldworld': 'The Old World',
  'asoiaf': 'A Song of Ice and Fire',
};

async function handleLeague(gameSystem, search) {
  try {
    // Query leagues API directly with full player stats
    let query = 'filters[statusleague]=ongoing&pagination[limit]=10' +
      '&fields[0]=name&fields[1]=gameSystem&fields[2]=format&fields[3]=statusleague' +
      '&populate[league_players][fields][0]=leagueName&populate[league_players][fields][1]=faction' +
      '&populate[league_players][fields][2]=wins&populate[league_players][fields][3]=draws' +
      '&populate[league_players][fields][4]=losses&populate[league_players][fields][5]=rankingPoints' +
      '&sort=name:asc';

    if (gameSystem) {
      const mapped = SYSTEM_MAP[gameSystem.toLowerCase()] || gameSystem;
      query += `&filters[gameSystem][$eqi]=${encodeURIComponent(mapped)}`;
    }

    const result = await fetchJSON(`${STRAPI_BASE}/api/leagues?${query}`);
    let leagues = result?.data || [];

    // Filter by name/pool search term
    if (search) {
      const term = search.toLowerCase();
      leagues = leagues.filter(l => (l.name || '').toLowerCase().includes(term));
    }

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

    // Show top 3 leagues, top 5 players each to keep it readable
    const embeds = leagues.slice(0, 3).map(league => {
      const players = (league.league_players || [])
        .sort((a, b) => (b.rankingPoints || 0) - (a.rankingPoints || 0))
        .slice(0, 5);

      const standingsLines = players.map((p, i) => {
        const medal = i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : `${i + 1}.`;
        const record = `${p.wins || 0}W/${p.draws || 0}D/${p.losses || 0}L`;
        const faction = p.faction ? ` \u00B7 ${p.faction}` : '';
        return `${medal} **${p.leagueName || 'Unknown'}** \u2014 ${p.rankingPoints || 0}pts (${record})${faction}`;
      }).join('\n');

      const leagueId = league.documentId || league.id;

      return {
        title: league.name || 'Unnamed League',
        description: standingsLines || 'No players yet.',
        color: EMBED_COLOR,
        fields: [
          { name: 'Game System', value: league.gameSystem || 'Not specified', inline: true },
          { name: 'Format', value: (league.format || 'round_robin').replace(/_/g, ' '), inline: true }
        ],
        url: `${FRONTEND_URL}/leagues/${leagueId}`,
        footer: { text: 'Cryptic Cabin Leagues \u00B7 leagues.crypticcabin.com' }
      };
    });

    // If there are more leagues than shown
    if (leagues.length > 3) {
      embeds.push({
        title: `+${leagues.length - 3} more leagues`,
        description: `[View all leagues](${FRONTEND_URL}/leagues)`,
        color: EMBED_COLOR,
        fields: [],
        url: `${FRONTEND_URL}/leagues`,
        footer: { text: '' }
      });
    }

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
