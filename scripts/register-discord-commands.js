#!/usr/bin/env node

/**
 * Register Discord slash commands for Cryptic Cabin Bot.
 *
 * Usage:
 *   node scripts/register-discord-commands.js          # Guild commands (fast, for testing)
 *   node scripts/register-discord-commands.js --global  # Global commands (takes ~1 hour to propagate)
 *
 * Required env vars: DISCORD_APP_ID, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID (for guild mode)
 */

// Load .env file manually (no dotenv dependency)
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  });
}

const https = require('https');

const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const isGlobal = process.argv.includes('--global');

if (!APP_ID || !BOT_TOKEN) {
  console.error('Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN in environment.');
  process.exit(1);
}

if (!isGlobal && !GUILD_ID) {
  console.error('Missing DISCORD_GUILD_ID for guild registration. Use --global for global commands.');
  process.exit(1);
}

const commands = [
  {
    name: 'stock',
    description: 'Search Cryptic Cabin store for products',
    options: [
      {
        name: 'query',
        description: 'Product name or keyword (e.g. "space marines", "mtg modern horizons")',
        type: 3, // STRING
        required: true,
      }
    ]
  },
  {
    name: 'events',
    description: 'Show upcoming Cryptic Cabin events',
    options: [
      {
        name: 'location',
        description: 'Filter by store location',
        type: 3, // STRING
        required: false,
        choices: [
          { name: 'Bracknell', value: 'bracknell' },
          { name: 'Bristol', value: 'bristol' },
        ]
      }
    ]
  },
  {
    name: 'book',
    description: 'Check table hire availability and book a gaming table',
    options: [
      {
        name: 'table_size',
        description: 'Table size',
        type: 3, // STRING
        required: true,
        choices: [
          { name: '6x4 (Standard Wargaming)', value: '6x4' },
          { name: '4x4', value: '4x4' },
        ]
      },
      {
        name: 'date',
        description: 'Date to check (YYYY-MM-DD)',
        type: 3, // STRING
        required: false,
      }
    ]
  },
  {
    name: 'league',
    description: 'Show current league standings',
    options: [
      {
        name: 'game_system',
        description: 'Filter by game system',
        type: 3, // STRING
        required: false,
        choices: [
          { name: 'Warhammer 40K', value: '40k' },
          { name: 'Age of Sigmar', value: 'aos' },
          { name: 'Horus Heresy', value: 'heresy' },
          { name: 'Kill Team', value: 'killteam' },
          { name: 'Blood Bowl', value: 'bloodbowl' },
          { name: 'The Old World', value: 'oldworld' },
        ]
      }
    ]
  }
];

const apiPath = isGlobal
  ? `/api/v10/applications/${APP_ID}/commands`
  : `/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`;

const postData = JSON.stringify(commands);

const req = https.request({
  hostname: 'discord.com',
  path: apiPath,
  method: 'PUT',
  headers: {
    'Authorization': `Bot ${BOT_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      const registered = JSON.parse(data);
      console.log(`Successfully registered ${registered.length} ${isGlobal ? 'global' : 'guild'} commands:`);
      registered.forEach(cmd => console.log(`  /${cmd.name} — ${cmd.description}`));
    } else {
      console.error(`Failed (HTTP ${res.statusCode}):`);
      console.error(data);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
  process.exit(1);
});

req.write(postData);
req.end();
