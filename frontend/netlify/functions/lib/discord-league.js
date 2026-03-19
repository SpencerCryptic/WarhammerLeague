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

async function handleLeague(gameSystem) {
  try {
    const result = await fetchJSON(`${STRAPI_BASE}/api/leagues/dashboard`);
    const data = result?.data || {};

    // Combine current and upcoming leagues
    let leagues = [
      ...(data.currentLeagues || []),
      ...(data.upcomingLeagues || []),
    ];

    // Filter by game system if specified
    if (gameSystem) {
      const mapped = SYSTEM_MAP[gameSystem.toLowerCase()] || gameSystem;
      leagues = leagues.filter(l =>
        (l.gameSystem || '').toLowerCase() === mapped.toLowerCase()
      );
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

    // Limit to 3 leagues (Discord embed limit considerations)
    const embeds = leagues.slice(0, 3).map(league => {
      const players = (league.league_players || [])
        .sort((a, b) => (b.rankingPoints || 0) - (a.rankingPoints || 0))
        .slice(0, 10);

      const standingsLines = players.map((p, i) => {
        const medal = i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : `${i + 1}.`;
        const record = `${p.wins || 0}W/${p.draws || 0}D/${p.losses || 0}L`;
        const faction = p.faction ? ` \u00B7 ${p.faction}` : '';
        return `${medal} **${p.leagueName || 'Unknown'}** \u2014 ${p.rankingPoints || 0}pts (${record})${faction}`;
      }).join('\n');

      const status = league.statusleague === 'ongoing' ? 'Active' : 'Upcoming';
      const leagueId = league.documentId || league.id;

      return {
        title: league.name || 'Unnamed League',
        description: standingsLines || 'No players yet.',
        color: EMBED_COLOR,
        fields: [
          { name: 'Game System', value: league.gameSystem || 'Not specified', inline: true },
          { name: 'Status', value: status, inline: true },
          { name: 'Format', value: (league.format || 'round_robin').replace(/_/g, ' '), inline: true }
        ],
        url: `${FRONTEND_URL}/leagues/${leagueId}`,
        footer: { text: 'Cryptic Cabin Leagues \u00B7 leagues.crypticcabin.com' }
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
