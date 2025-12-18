/**
 * Helpdesk Messenger Webhook - Netlify Function
 *
 * Handles Facebook Messenger webhook:
 * - GET: Verification challenge from Meta
 * - POST: Incoming messages from customers
 */

const STRAPI_URL = process.env.STRAPI_URL || 'https://accessible-positivity-e213bb2958.strapiapp.com';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

const MESSENGER_VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN;
const MESSENGER_PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
const MESSENGER_APP_SECRET = process.env.MESSENGER_APP_SECRET;

/**
 * Get user profile from Facebook
 */
async function getUserProfile(psid) {
  if (!MESSENGER_PAGE_ACCESS_TOKEN) return null;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${psid}?fields=first_name,last_name,profile_pic&access_token=${MESSENGER_PAGE_ACCESS_TOKEN}`
    );

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to get user profile:', error);
  }

  return null;
}

/**
 * Find or create a ticket for this Messenger conversation
 */
async function findOrCreateTicket(psid, senderName) {
  const headers = {
    'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json'
  };

  // Search for existing open ticket from this PSID
  const searchResponse = await fetch(
    `${STRAPI_URL}/api/support-tickets?filters[channel][$eq]=messenger&filters[channelId][$eq]=${psid}&filters[status][$ne]=closed&sort=createdAt:desc&pagination[limit]=1`,
    { headers }
  );

  if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    if (searchData.data?.length > 0) {
      return searchData.data[0];
    }
  }

  // Create new ticket
  const createResponse = await fetch(`${STRAPI_URL}/api/support-tickets`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        subject: `Messenger conversation with ${senderName}`,
        status: 'open',
        priority: 'medium',
        channel: 'messenger',
        channelId: psid,
        customerName: senderName,
        lastMessageAt: new Date().toISOString()
      }
    })
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create ticket: ${error}`);
  }

  const createData = await createResponse.json();
  console.log(`Created Messenger ticket: ${createData.data.id} for ${psid}`);
  return createData.data;
}

/**
 * Add a message to a ticket
 */
async function addMessageToTicket(ticket, content, senderName, messageId, attachments = []) {
  const headers = {
    'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json'
  };

  // Check for duplicate message
  const dupCheck = await fetch(
    `${STRAPI_URL}/api/ticket-messages?filters[messageId][$eq]=${encodeURIComponent(messageId)}`,
    { headers }
  );

  if (dupCheck.ok) {
    const dupData = await dupCheck.json();
    if (dupData.data?.length > 0) {
      console.log('Duplicate message, skipping:', messageId);
      return;
    }
  }

  const response = await fetch(`${STRAPI_URL}/api/ticket-messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        ticket: ticket.id,
        content: content,
        direction: 'inbound',
        senderType: 'customer',
        senderName: senderName,
        messageId: messageId,
        attachments: attachments
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add message: ${error}`);
  }

  // Update ticket's lastMessageAt
  await fetch(`${STRAPI_URL}/api/support-tickets/${ticket.documentId || ticket.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      data: {
        lastMessageAt: new Date().toISOString()
      }
    })
  });

  console.log(`Added Messenger message to ticket ${ticket.id}`);
}

/**
 * Process incoming Messenger message
 */
async function processMessage(messagingEvent) {
  const senderId = messagingEvent.sender.id;
  const message = messagingEvent.message;

  if (!message || message.is_echo) {
    return; // Skip echo messages (our own messages)
  }

  // Get sender profile
  const profile = await getUserProfile(senderId);
  const senderName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : `User ${senderId}`;

  // Find or create ticket
  const ticket = await findOrCreateTicket(senderId, senderName);

  // Extract message content
  let content = message.text || '';

  // Handle attachments
  const attachments = [];
  if (message.attachments) {
    for (const att of message.attachments) {
      if (att.type === 'image' || att.type === 'video' || att.type === 'file') {
        attachments.push({
          type: att.type,
          url: att.payload?.url
        });
        if (!content) {
          content = `[${att.type} attachment]`;
        }
      } else if (att.type === 'location') {
        content = `[Location: ${att.payload?.coordinates?.lat}, ${att.payload?.coordinates?.long}]`;
      }
    }
  }

  // Handle stickers
  if (message.sticker_id) {
    content = content || '[Sticker]';
  }

  if (content) {
    await addMessageToTicket(ticket, content, senderName, message.mid, attachments);
  }
}

/**
 * Netlify Function Handler
 */
exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json'
  };

  // GET: Webhook verification
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const mode = params['hub.mode'];
    const token = params['hub.verify_token'];
    const challenge = params['hub.challenge'];

    if (mode === 'subscribe' && token === MESSENGER_VERIFY_TOKEN) {
      console.log('Messenger webhook verified');
      return {
        statusCode: 200,
        body: challenge
      };
    } else {
      console.log('Messenger webhook verification failed');
      return {
        statusCode: 403,
        body: 'Verification failed'
      };
    }
  }

  // POST: Incoming webhook event
  if (event.httpMethod === 'POST') {
    if (!STRAPI_API_TOKEN) {
      console.error('Strapi API token not configured');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured' }) };
    }

    try {
      const body = JSON.parse(event.body || '{}');

      // Verify this is from a Page subscription
      if (body.object !== 'page') {
        return { statusCode: 404, headers, body: 'Not found' };
      }

      // Process each entry
      for (const entry of body.entry || []) {
        for (const messagingEvent of entry.messaging || []) {
          if (messagingEvent.message) {
            await processMessage(messagingEvent);
          }
          // Could also handle postbacks, reactions, etc.
        }
      }

      // Always respond with 200 to acknowledge receipt
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'ok' })
      };

    } catch (error) {
      console.error('Messenger webhook error:', error);

      // Still return 200 to prevent Meta from retrying
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'error', message: error.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
