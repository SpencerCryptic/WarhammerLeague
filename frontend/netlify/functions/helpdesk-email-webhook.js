/**
 * Helpdesk Email Webhook - Netlify Function
 *
 * Receives forwarded emails and creates tickets.
 *
 * Supports:
 * - Zapier/Make webhook format
 * - Simple JSON format
 * - Form-encoded format
 */

const STRAPI_URL = process.env.STRAPI_URL || 'https://accessible-positivity-e213bb2958.strapiapp.com';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const WEBHOOK_SECRET = process.env.HELPDESK_WEBHOOK_SECRET;

// Hardcoded blocklist as fallback (Strapi blocklist takes priority)
const DEFAULT_BLOCKLIST = [
  'noreply@crypticcabin.com',
  'service@paypal.co.uk',
  'notify-noreply@google.com',
  'sales@nextdaycatering.co.uk',
  'neil.jagger@battlefront.co.nz',
  'no-reply@accounts.google.com',
  'support@stripe.com',
  'shopify-capital-offers@email.shopify.com',
  'shopper@worldpay.com',
  'george@blissdistribution.co.uk',
  'accounts@asmodee.co.uk',
  'info@londoncardshow.co.uk',
  'noreply@youtube.com',
  'store+95349997945@t.shopifyemail.com',
  'no-reply@goaffpro.com',
  'hello@info.tide.co',
  'store+88385716565@m.shopifyemail.com',
  'rob.d@steamforged.com',
  'help@japan2uk.com',
  'siegestudiosuk@39695361.mailchimpapp.com',
  'donotreply.sales@asmodee.co.uk',
  'news@typeform.com',
  'updates@allevents.in'
];

/**
 * Check if email is blocklisted
 */
async function isBlocklisted(email) {
  if (!email) return false;
  const emailLower = email.toLowerCase();

  // Check hardcoded blocklist first
  if (DEFAULT_BLOCKLIST.some(blocked => emailLower === blocked.toLowerCase())) {
    return true;
  }

  // Check Strapi blocklist
  try {
    const response = await fetch(
      `${STRAPI_URL}/api/email-blocklists?filters[email][$eqi]=${encodeURIComponent(email)}`,
      {
        headers: {
          'Authorization': `Bearer ${STRAPI_API_TOKEN}`
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.data?.length > 0) {
        return true;
      }
    }
  } catch (error) {
    console.error('Error checking blocklist:', error);
  }

  return false;
}

/**
 * Extract email address from "Name <email@example.com>" format
 */
function extractEmail(fromString) {
  if (!fromString) return '';
  const match = fromString.match(/<([^>]+)>/);
  if (match) return match[1];
  // If no angle brackets, check if it's already just an email
  if (fromString.includes('@') && !fromString.includes(' ')) return fromString;
  return '';
}

/**
 * Extract name from "Name <email@example.com>" format
 */
function extractName(fromString) {
  if (!fromString) return 'Unknown';
  const match = fromString.match(/^([^<]+)/);
  if (match) return match[1].trim().replace(/"/g, '');
  return fromString.split('@')[0] || 'Unknown';
}

/**
 * Find or create a ticket for this email
 */
async function findOrCreateTicket(email) {
  const headers = {
    'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json'
  };

  const fromRaw = email.from || '';
  const fromAddress = extractEmail(fromRaw) || fromRaw;
  const fromName = email.fromName || extractName(fromRaw) || 'Unknown';

  // Check for existing open ticket from this email
  const searchResponse = await fetch(
    `${STRAPI_URL}/api/support-tickets?filters[customerEmail][$eq]=${encodeURIComponent(fromAddress)}&filters[status][$ne]=closed&sort=createdAt:desc&pagination[limit]=1`,
    { headers }
  );

  if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    if (searchData.data?.length > 0) {
      return searchData.data[0];
    }
  }

  // Create new ticket
  const subject = email.subject || 'No Subject';

  const createResponse = await fetch(`${STRAPI_URL}/api/support-tickets`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        subject: subject,
        status: 'open',
        priority: 'medium',
        channel: 'email',
        channelId: fromAddress,
        customerName: fromName,
        customerEmail: fromAddress,
        lastMessageAt: new Date().toISOString()
      }
    })
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create ticket: ${error}`);
  }

  const createData = await createResponse.json();
  console.log(`Created new ticket: ${createData.data.id} for ${fromAddress}`);
  return createData.data;
}

/**
 * Add a message to a ticket
 */
async function addMessageToTicket(ticket, email) {
  const headers = {
    'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json'
  };

  const fromRaw = email.from || '';
  const fromName = email.fromName || extractName(fromRaw) || 'Unknown';
  const content = email.body || email.text || email.html || '';
  const messageId = email.messageId || `email-${Date.now()}`;

  // Check for duplicate
  const dupCheck = await fetch(
    `${STRAPI_URL}/api/ticket-messages?filters[messageId][$eq]=${encodeURIComponent(messageId)}`,
    { headers }
  );

  if (dupCheck.ok) {
    const dupData = await dupCheck.json();
    if (dupData.data?.length > 0) {
      console.log('Duplicate message, skipping:', messageId);
      return { duplicate: true };
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
        senderName: fromName,
        messageId: messageId,
        attachments: email.attachments || []
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

  console.log(`Added message to ticket ${ticket.id}`);
  return { success: true };
}

/**
 * Parse email from various webhook formats
 */
function parseEmail(body, contentType) {
  // Already JSON
  if (typeof body === 'object') {
    return {
      from: body.from || body.sender || body.from_email || body.fromEmail || '',
      fromName: body.fromName || body.from_name || body.senderName || '',
      subject: body.subject || '',
      body: body.body || body.text || body.plain || body.html || body.content || '',
      html: body.html || body.body_html || '',
      messageId: body.messageId || body.message_id || body['Message-ID'] || '',
      attachments: body.attachments || []
    };
  }

  // Try to parse as JSON string
  try {
    const parsed = JSON.parse(body);
    return parseEmail(parsed, contentType);
  } catch (e) {
    // Not JSON, treat as plain text body
    return {
      from: '',
      fromName: '',
      subject: 'Forwarded Email',
      body: body,
      messageId: `plain-${Date.now()}`
    };
  }
}

/**
 * Netlify Function Handler
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Optional: Verify webhook secret
  if (WEBHOOK_SECRET) {
    const providedSecret = event.headers['x-webhook-secret'] ||
                          event.headers['X-Webhook-Secret'] ||
                          event.queryStringParameters?.secret;
    if (providedSecret !== WEBHOOK_SECRET) {
      console.log('Invalid webhook secret');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid webhook secret' })
      };
    }
  }

  if (!STRAPI_API_TOKEN) {
    console.error('STRAPI_API_TOKEN not configured');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server not configured' })
    };
  }

  try {
    console.log('Email webhook received');
    console.log('Content-Type:', event.headers['content-type']);

    const email = parseEmail(event.body, event.headers['content-type']);

    console.log('Parsed email:', {
      from: email.from,
      subject: email.subject,
      bodyLength: email.body?.length
    });

    if (!email.from && !email.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No email data provided' })
      };
    }

    // Check blocklist
    const fromAddress = extractEmail(email.from) || email.from;
    if (await isBlocklisted(fromAddress)) {
      console.log(`Blocked email from: ${fromAddress}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          blocked: true,
          reason: 'Email address is blocklisted'
        })
      };
    }

    // Find or create ticket
    const ticket = await findOrCreateTicket(email);

    // Add message to ticket
    const result = await addMessageToTicket(ticket, email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        ticketId: ticket.documentId || ticket.id,
        ...result
      })
    };

  } catch (error) {
    console.error('Email webhook error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
