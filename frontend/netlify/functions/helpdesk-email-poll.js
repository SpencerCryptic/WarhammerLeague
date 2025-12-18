/**
 * Helpdesk Email Poll - Scheduled Netlify Function
 *
 * Polls the support inbox via IMAP and creates tickets for new emails.
 * Scheduled to run every 5 minutes.
 */

const Imap = require('imap-simple');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

const STRAPI_URL = process.env.STRAPI_URL || 'https://accessible-positivity-e213bb2958.strapiapp.com';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

// SMTP Configuration for auto-response
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || process.env.HELPDESK_SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || process.env.HELPDESK_SMTP_PORT || '587'),
  secure: (process.env.SMTP_SECURE || process.env.HELPDESK_SMTP_SECURE) === 'true',
  auth: {
    user: process.env.SMTP_USER || process.env.HELPDESK_SMTP_USER,
    pass: process.env.SMTP_PASS || process.env.HELPDESK_SMTP_PASSWORD
  }
};
const SMTP_FROM = process.env.SMTP_FROM || process.env.HELPDESK_FROM_EMAIL || SMTP_CONFIG.auth.user;
const FROM_NAME = process.env.HELPDESK_FROM_NAME || 'Cryptic Cabin Support';

const IMAP_CONFIG = {
  imap: {
    user: process.env.HELPDESK_IMAP_USER,
    password: process.env.HELPDESK_IMAP_PASSWORD,
    host: process.env.HELPDESK_IMAP_HOST,
    port: parseInt(process.env.HELPDESK_IMAP_PORT || '993'),
    tls: true,
    authTimeout: 5000,
    connTimeout: 8000,
    tlsOptions: { rejectUnauthorized: false }
  }
};

/**
 * Get helpdesk settings from Strapi
 */
async function getHelpdeskSettings() {
  try {
    const response = await fetch(`${STRAPI_URL}/api/helpdesk-setting`, {
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      return data.data || null;
    }
  } catch (error) {
    console.error('Error fetching helpdesk settings:', error);
  }
  return null;
}

/**
 * Send auto-response email for new ticket
 */
async function sendAutoResponse(ticket, settings) {
  if (!settings?.autoResponseEnabled || !settings?.autoResponseMessage) {
    console.log('Auto-response disabled or no message configured');
    return;
  }

  if (!SMTP_CONFIG.host || !SMTP_CONFIG.auth.user) {
    console.log('SMTP not configured, skipping auto-response');
    return;
  }

  if (!ticket.customerEmail) {
    console.log('No customer email, skipping auto-response');
    return;
  }

  const transporter = nodemailer.createTransport(SMTP_CONFIG);

  const ticketRef = `[Ticket #${ticket.documentId}]`;
  let body = settings.autoResponseMessage;

  // Add signature if enabled
  if (settings?.signatureEnabled && settings?.emailSignature) {
    body += '\n\n' + settings.emailSignature;
  }

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { margin-bottom: 24px; white-space: pre-wrap; }
    .signature { margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; color: #666; font-size: 14px; white-space: pre-wrap; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <p>Hi,</p>

    <div class="content">${settings.autoResponseMessage.replace(/\n/g, '<br>')}</div>

    ${settings?.signatureEnabled && settings?.emailSignature ? `
    <div class="signature">
      ${settings.emailSignature.replace(/\n/g, '<br>')}
    </div>
    ` : `
    <div class="signature">
      Cryptic Cabin Support
    </div>
    `}

    <div class="footer">
      Ticket Reference: ${ticketRef}<br>
      Please reply to this email if you need further assistance.
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${SMTP_FROM}>`,
      to: ticket.customerEmail,
      subject: `Re: ${ticket.subject} ${ticketRef}`,
      text: body,
      html: htmlBody
    });
    console.log(`Auto-response sent to ${ticket.customerEmail}`);
  } catch (error) {
    console.error('Failed to send auto-response:', error);
  }
}

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
          return { ticket: searchData.data[0].ticket, isNew: false };
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
      return { ticket: recentData.data[0], isNew: false };
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
  return { ticket: createData.data, isNew: true };
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

  // Fetch helpdesk settings for auto-response
  const settings = await getHelpdeskSettings();

  let connection;
  let processedCount = 0;
  let newTickets = 0;

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
        const { ticket, isNew } = await findOrCreateTicket(email);

        // Add message to ticket
        await addMessageToTicket(ticket, email);

        // Send auto-response for new tickets
        if (isNew) {
          newTickets++;
          await sendAutoResponse(ticket, settings);
        }

        processedCount++;
      } catch (error) {
        console.error('Error processing email:', error);
      }
    }

    return { processed: processedCount, newTickets };

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
