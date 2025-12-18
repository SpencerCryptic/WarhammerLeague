/**
 * Helpdesk Email Poll - Scheduled Netlify Function
 *
 * Polls the support inbox via IMAP and creates tickets for new emails.
 * Scheduled to run every 5 minutes.
 */

const Imap = require('imap-simple');
const { simpleParser } = require('mailparser');

const STRAPI_URL = process.env.STRAPI_URL || 'https://accessible-positivity-e213bb2958.strapiapp.com';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

const IMAP_CONFIG = {
  imap: {
    user: process.env.HELPDESK_IMAP_USER,
    password: process.env.HELPDESK_IMAP_PASSWORD,
    host: process.env.HELPDESK_IMAP_HOST,
    port: parseInt(process.env.HELPDESK_IMAP_PORT || '993'),
    tls: true,
    authTimeout: 10000,
    tlsOptions: { rejectUnauthorized: false }
  }
};

/**
 * Find or create a ticket for this email thread
 */
async function findOrCreateTicket(email) {
  const headers = {
    'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json'
  };

  // Extract email address from the "from" field
  const fromAddress = email.from?.value?.[0]?.address || email.from?.text || '';
  const fromName = email.from?.value?.[0]?.name || fromAddress.split('@')[0] || 'Unknown';

  // Check if we already have a ticket for this email thread
  // Use In-Reply-To header or References to find existing thread
  const references = email.references || [];
  const inReplyTo = email.inReplyTo;

  if (inReplyTo || references.length > 0) {
    // Search for existing ticket with matching messageId
    const searchIds = [inReplyTo, ...references].filter(Boolean);

    for (const msgId of searchIds) {
      const searchResponse = await fetch(
        `${STRAPI_URL}/api/ticket-messages?filters[messageId][$eq]=${encodeURIComponent(msgId)}&populate=ticket`,
        { headers }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.data?.length > 0 && searchData.data[0].ticket) {
          return searchData.data[0].ticket;
        }
      }
    }
  }

  // Also check by customer email for recent open tickets
  const recentResponse = await fetch(
    `${STRAPI_URL}/api/support-tickets?filters[customerEmail][$eq]=${encodeURIComponent(fromAddress)}&filters[status][$ne]=closed&sort=createdAt:desc&pagination[limit]=1`,
    { headers }
  );

  if (recentResponse.ok) {
    const recentData = await recentResponse.json();
    if (recentData.data?.length > 0) {
      // Found an open ticket from this customer
      return recentData.data[0];
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

  const fromAddress = email.from?.value?.[0]?.address || '';
  const fromName = email.from?.value?.[0]?.name || fromAddress.split('@')[0] || 'Unknown';

  // Get email body (prefer text, fallback to html)
  let content = email.text || '';
  if (!content && email.html) {
    // Strip HTML tags for simple display
    content = email.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Handle attachments
  const attachments = (email.attachments || []).map(att => ({
    filename: att.filename,
    contentType: att.contentType,
    size: att.size
  }));

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
        messageId: email.messageId || '',
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

  console.log(`Added message to ticket ${ticket.id}`);
}

/**
 * Process new emails from inbox
 */
async function processEmails() {
  if (!IMAP_CONFIG.imap.user || !IMAP_CONFIG.imap.password) {
    console.log('IMAP credentials not configured, skipping email poll');
    return { processed: 0, skipped: 'No IMAP credentials' };
  }

  if (!STRAPI_API_TOKEN) {
    console.log('Strapi API token not configured');
    return { processed: 0, skipped: 'No Strapi token' };
  }

  let connection;
  let processedCount = 0;

  try {
    console.log('Connecting to IMAP server...');
    connection = await Imap.connect(IMAP_CONFIG);

    await connection.openBox('INBOX');

    // Search for unseen emails
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`Found ${messages.length} unread emails`);

    for (const message of messages) {
      try {
        // Get the full email body
        const all = message.parts.find(part => part.which === '');
        if (!all) continue;

        const email = await simpleParser(all.body);

        // Skip auto-replies and bounces
        const autoSubmitted = email.headers.get('auto-submitted');
        if (autoSubmitted && autoSubmitted !== 'no') {
          console.log('Skipping auto-reply email');
          continue;
        }

        // Find or create ticket
        const ticket = await findOrCreateTicket(email);

        // Add message to ticket
        await addMessageToTicket(ticket, email);

        processedCount++;
      } catch (error) {
        console.error('Error processing email:', error);
      }
    }

    return { processed: processedCount };

  } catch (error) {
    console.error('IMAP error:', error);
    throw error;
  } finally {
    if (connection) {
      connection.end();
    }
  }
}

/**
 * Netlify Scheduled Function Handler
 */
exports.handler = async (event, context) => {
  console.log('Email poll triggered at:', new Date().toISOString());
  console.log('IMAP_HOST:', process.env.HELPDESK_IMAP_HOST || 'NOT SET');
  console.log('IMAP_USER:', process.env.HELPDESK_IMAP_USER || 'NOT SET');
  console.log('IMAP_PASSWORD:', process.env.HELPDESK_IMAP_PASSWORD ? 'SET' : 'NOT SET');
  console.log('STRAPI_API_TOKEN:', process.env.STRAPI_API_TOKEN ? 'SET' : 'NOT SET');

  try {
    const result = await processEmails();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ...result,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Email poll error:', error);
    console.error('Error stack:', error.stack);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};
