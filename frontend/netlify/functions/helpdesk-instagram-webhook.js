/**
 * Helpdesk Instagram Webhook - Netlify Function
 *
 * Handles Instagram DM webhook:
 * - GET: Verification challenge from Meta
 * - POST: Incoming DMs from customers
 *
 * Requirements:
 * - Instagram Business/Professional account
 * - Connected to Facebook Page
 * - Meta App with instagram_manage_messages permission
 */

const STRAPI_URL = process.env.STRAPI_URL || 'https://accessible-positivity-e213bb2958.strapiapp.com';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

const INSTAGRAM_VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || process.env.MESSENGER_VERIFY_TOKEN;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.MESSENGER_PAGE_ACCESS_TOKEN;

/**
 * Get Instagram user info
 */
async function getInstagramUser(userId) {
  if (!INSTAGRAM_ACCESS_TOKEN) return null;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${userId}?fields=username,name&access_token=${INSTAGRAM_ACCESS_TOKEN}`
    );

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to get Instagram user:', error);
  }

  return null;
}

/**
 * Find or create a ticket for this Instagram conversation
 */
async function findOrCreateTicket(userId, userName) {
  const headers = {
    'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json'
  };

  // Search for existing open ticket from this user
  const searchResponse = await fetch(
    `${STRAPI_URL}/api/support-tickets?filters[channel][$eq]=instagram&filters[channelId][$eq]=${userId}&filters[status][$ne]=closed&sort=createdAt:desc&pagination[limit]=1`,
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
        subject: `Instagram DM from ${userName}`,
        status: 'open',
        priority: 'medium',
        channel: 'instagram',
        channelId: userId,
        customerName: userName,
        lastMessageAt: new Date().toISOString()
      }
    })
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create ticket: ${error}`);
  }

  const createData = await createResponse.json();
  console.log(`Created Instagram ticket: ${createData.data.id} for ${userId}`);
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

  console.log(`Added Instagram message to ticket ${ticket.id}`);
}

/**
 * Process incoming Instagram message
 */
async function processMessage(messagingEvent) {
  const senderId = messagingEvent.sender.id;
  const message = messagingEvent.message;

  if (!message || message.is_echo) {
    return; // Skip echo messages (our own messages)
  }

  // Get sender info
  const userInfo = await getInstagramUser(senderId);
  const senderName = userInfo?.username || userInfo?.name || `User ${senderId}`;

  // Find or create ticket
  const ticket = await findOrCreateTicket(senderId, senderName);

  // Extract message content
  let content = message.text || '';

  // Handle attachments
  const attachments = [];
  if (message.attachments) {
    for (const att of message.attachments) {
      attachments.push({
        type: att.type,
        url: att.payload?.url
      });
      if (!content) {
        content = `[${att.type} attachment]`;
      }
    }
  }

  // Handle story replies
  if (message.reply_to?.story) {
    content = `[Reply to story] ${content}`;
  }

  // Handle story mentions
  if (messagingEvent.message?.attachments?.[0]?.type === 'story_mention') {
    content = '[Story mention]';
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

    if (mode === 'subscribe' && token === INSTAGRAM_VERIFY_TOKEN) {
      console.log('Instagram webhook verified');
      return {
        statusCode: 200,
        body: challenge
      };
    } else {
      console.log('Instagram webhook verification failed');
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

      // Instagram webhooks come with object: 'instagram'
      if (body.object !== 'instagram') {
        return { statusCode: 404, headers, body: 'Not found' };
      }

      // Process each entry
      for (const entry of body.entry || []) {
        // Instagram uses 'messaging' array like Messenger
        for (const messagingEvent of entry.messaging || []) {
          if (messagingEvent.message) {
            await processMessage(messagingEvent);
          }
        }
      }

      // Always respond with 200 to acknowledge receipt
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'ok' })
      };

    } catch (error) {
      console.error('Instagram webhook error:', error);

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
