import https from 'https';

const FLAVOUR_LINES = [
  'The dice gods have spoken.',
  'Another victory for the Cryptic Cabin annals.',
  'For the Emperor. Or Chaos. We don\'t judge.',
  'The battle report has been filed.',
  'Honour has been satisfied.',
  'The battlefield has been cleared.',
  'Let the record show: there was glory this day.',
  'Skulls for the standings page!',
  'The war council has noted this engagement.',
  'A worthy contest. The archives are updated.',
];

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://leagues.crypticcabin.com';

interface MatchWebhookData {
  winnerName: string;
  winnerFaction: string;
  loserName: string;
  loserFaction: string;
  winnerScore?: number;
  loserScore?: number;
  isDraw: boolean;
  gameSystem: string;
  leagueName: string;
  leagueDocumentId: string;
  round?: number;
}

export function postMatchResultToDiscord(data: MatchWebhookData) {
  const webhookUrl = process.env.DISCORD_RESULTS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const flavour = FLAVOUR_LINES[Math.floor(Math.random() * FLAVOUR_LINES.length)];
  const datePlayed = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const standingsUrl = `${FRONTEND_URL}/leagues/${data.leagueDocumentId}`;

  const fields: Array<{ name: string; value: string; inline: boolean }> = [];

  if (data.isDraw) {
    fields.push(
      { name: '🤝 Draw', value: `**${data.winnerName}** (${data.winnerFaction}) vs **${data.loserName}** (${data.loserFaction})`, inline: false }
    );
  } else {
    fields.push(
      { name: '🏆 Winner', value: `**${data.winnerName}** — ${data.winnerFaction}`, inline: true },
      { name: '⚔️ Opponent', value: `**${data.loserName}** — ${data.loserFaction}`, inline: true }
    );
  }

  if (data.winnerScore !== undefined && data.loserScore !== undefined) {
    fields.push(
      { name: '📊 Score', value: `${data.winnerScore} — ${data.loserScore}`, inline: true }
    );
  }

  fields.push(
    { name: '🎮 Game System', value: data.gameSystem || 'Not specified', inline: true },
    { name: '📅 Date Played', value: datePlayed, inline: true }
  );

  if (data.round) {
    fields.push({ name: '🔄 Round', value: `${data.round}`, inline: true });
  }

  const embed = {
    title: `${data.leagueName} — Match Result`,
    description: `*${flavour}*`,
    color: 0x7c3aed,
    fields,
    url: standingsUrl,
    footer: { text: 'Cryptic Cabin Leagues · View Standings ↗' },
    timestamp: new Date().toISOString(),
  };

  const postData = JSON.stringify({
    embeds: [embed],
  });

  try {
    const url = new URL(webhookUrl);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      }
    }, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        let body = '';
        res.on('data', (chunk: Buffer) => body += chunk);
        res.on('end', () => console.error('Discord webhook error:', res.statusCode, body));
      }
    });
    req.on('error', (err: Error) => console.error('Discord webhook request error:', err.message));
    req.write(postData);
    req.end();
  } catch (err) {
    console.error('Discord webhook error:', err);
  }
}
