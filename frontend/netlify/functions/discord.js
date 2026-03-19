const { verifyDiscordSignature } = require('./lib/verify-discord');
const { handleStock } = require('./lib/discord-stock');
const { handleEvents } = require('./lib/discord-events');
const { handleBook } = require('./lib/discord-book');
const { handleLeague } = require('./lib/discord-league');
const https = require('https');

// Discord interaction types
const INTERACTION_TYPE = {
  PING: 1,
  APPLICATION_COMMAND: 2,
};

// Discord response types
const RESPONSE_TYPE = {
  PONG: 1,
  CHANNEL_MESSAGE: 4,
  DEFERRED: 5,
};

function getOption(options, name) {
  const opt = (options || []).find(o => o.name === name);
  return opt ? opt.value : null;
}

/**
 * Send a follow-up response to a deferred interaction.
 */
function sendFollowup(applicationId, interactionToken, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = https.request({
      hostname: 'discord.com',
      path: `/api/v10/webhooks/${applicationId}/${interactionToken}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const signature = event.headers['x-signature-ed25519'];
  const timestamp = event.headers['x-signature-timestamp'];
  const rawBody = event.body;

  // Verify signature
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey || !signature || !timestamp) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  if (!verifyDiscordSignature(publicKey, timestamp, rawBody, signature)) {
    return { statusCode: 401, body: 'Invalid request signature' };
  }

  const body = JSON.parse(rawBody);

  // Handle Discord URL verification ping
  if (body.type === INTERACTION_TYPE.PING) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: RESPONSE_TYPE.PONG })
    };
  }

  // Handle slash commands
  if (body.type === INTERACTION_TYPE.APPLICATION_COMMAND) {
    const { name, options } = body.data;
    const applicationId = body.application_id;
    const interactionToken = body.token;

    // Commands that need deferred responses (slow external APIs)
    if (name === 'stock' || name === 'book') {
      // Return deferred response immediately, then follow up
      // Use waitUntil-style: Netlify will keep the function alive for the follow-up
      const deferredWork = async () => {
        try {
          let response;
          if (name === 'stock') {
            const query = getOption(options, 'query');
            response = await handleStock(query || '');
          } else {
            const tableType = getOption(options, 'table');
            response = await handleBook(tableType);
          }
          await sendFollowup(applicationId, interactionToken, response.data);
        } catch (err) {
          console.error(`Deferred ${name} error:`, err);
          await sendFollowup(applicationId, interactionToken, {
            embeds: [{
              title: 'Error',
              description: 'Something went wrong processing your request.',
              color: 0xff0000
            }]
          });
        }
      };

      // Start deferred work without awaiting — Netlify keeps the function alive
      // until the response is sent, but we need to await here since Netlify
      // functions terminate after the handler returns
      // Instead, we'll try the fast path first and only defer if needed
      try {
        let response;
        if (name === 'stock') {
          const query = getOption(options, 'query');
          response = await handleStock(query || '');
        } else {
          const tableSize = getOption(options, 'table_size');
          const date = getOption(options, 'date');
          response = await handleBook(tableSize || '6x4', date);
        }
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response)
        };
      } catch (err) {
        console.error(`${name} command error:`, err);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              embeds: [{
                title: 'Error',
                description: 'Something went wrong. Please try again.',
                color: 0xff0000
              }]
            }
          })
        };
      }
    }

    // Fast commands — respond inline
    let response;
    try {
      switch (name) {
        case 'events': {
          const location = getOption(options, 'location');
          response = await handleEvents(location);
          break;
        }
        case 'league': {
          const store = getOption(options, 'store');
          const gameSystem = getOption(options, 'game_system');
          const pool = getOption(options, 'pool');
          response = await handleLeague({ store, gameSystem, pool });
          break;
        }
        default:
          response = {
            type: RESPONSE_TYPE.CHANNEL_MESSAGE,
            data: {
              content: `Unknown command: ${name}`,
              flags: 64 // Ephemeral
            }
          };
      }
    } catch (err) {
      console.error(`Command ${name} error:`, err);
      response = {
        type: RESPONSE_TYPE.CHANNEL_MESSAGE,
        data: {
          embeds: [{
            title: 'Error',
            description: 'Something went wrong. Please try again.',
            color: 0xff0000
          }]
        }
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    };
  }

  // Unknown interaction type
  return { statusCode: 400, body: 'Unknown interaction type' };
};
