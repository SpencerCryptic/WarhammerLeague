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

const nodemailer = require('nodemailer');

const STRAPI_URL = process.env.STRAPI_URL || 'https://accessible-positivity-e213bb2958.strapiapp.com';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const WEBHOOK_SECRET = process.env.HELPDESK_WEBHOOK_SECRET;

// SMTP Configuration (consistent with other helpdesk functions)
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
 * Send auto-response email
 */
async function sendAutoResponse(toEmail, subject, ticketId, settings) {
  if (!settings?.autoResponseEnabled || !settings?.autoResponseMessage) {
    console.log('Auto-response disabled or no message configured');
    return;
  }

  if (!SMTP_CONFIG.host || !SMTP_CONFIG.auth.user) {
    console.log('SMTP not configured, skipping auto-response');
    return;
  }

  const transporter = nodemailer.createTransport(SMTP_CONFIG);

  // Use short ticket reference (first 6 chars)
  const shortId = String(ticketId).substring(0, 6).toUpperCase();
  const ticketRef = `#${shortId}`;

  let body = settings.autoResponseMessage;

  // Add signature if enabled (don't add default - only use configured signature)
  if (settings?.signatureEnabled && settings?.emailSignature) {
    body += '\n\n' + settings.emailSignature;
  }

  body += `\n\n---\nRef: ${ticketRef}`;

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
    .footer { margin-top: 24px; font-size: 12px; color: #999; }
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
    ` : ''}

    <div class="footer">
      Ref: ${ticketRef}
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${SMTP_FROM}>`,
      to: toEmail,
      subject: `Re: ${subject} [${ticketRef}]`,
      text: body,
      html: htmlBody
    });
    console.log(`Auto-response sent to ${toEmail}`);
  } catch (error) {
    console.error('Failed to send auto-response:', error);
  }
}

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
async function findOrCreateTicket(email, contactFormData = null) {
  const headers = {
    'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json'
  };

  // Use contact form data if available, otherwise parse from email
  const fromRaw = email.from || '';
  const fromAddress = contactFormData?.customerEmail || extractEmail(fromRaw) || fromRaw;
  const fromName = contactFormData?.customerName || email.fromName || extractName(fromRaw) || 'Unknown';
  const subject = contactFormData?.subject || email.subject || 'No Subject';

  // Check for existing open ticket from this email
  const searchResponse = await fetch(
    `${STRAPI_URL}/api/support-tickets?filters[customerEmail][$eq]=${encodeURIComponent(fromAddress)}&filters[status][$ne]=closed&sort=createdAt:desc&pagination[limit]=1`,
    { headers }
  );

  if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    if (searchData.data?.length > 0) {
      return { ticket: searchData.data[0], isNew: false };
    }
  }

  // Create new ticket
  const createResponse = await fetch(`${STRAPI_URL}/api/support-tickets`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        subject: subject,
        status: 'open',
        priority: 'medium',
        channel: contactFormData?.isContactForm ? 'web' : 'email',
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
 * Check if email is from a contact form service and extract real customer email
 */
function parseContactForm(email) {
  const fromAddress = extractEmail(email.from) || email.from;
  const body = email.body || '';

  // Known contact form services
  const contactFormServices = [
    'formsubmitapp.com',
    'formsubmit.co',
    'formspree.io',
    'getform.io',
    'typeform.com',
    'jotform.com'
  ];

  const isContactForm = contactFormServices.some(service =>
    fromAddress.toLowerCase().includes(service)
  ) || email.subject?.toLowerCase().includes('contact form');

  if (!isContactForm) {
    return null;
  }

  console.log('Detected contact form submission');

  // Try to extract customer email from body
  // Common patterns: "Email: customer@email.com", "Email\ncustomer@email.com", "From: customer@email.com"
  const emailPatterns = [
    /Email[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /From[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /Reply[- ]?to[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /Customer[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
  ];

  let customerEmail = '';
  for (const pattern of emailPatterns) {
    const match = body.match(pattern);
    if (match) {
      customerEmail = match[1];
      break;
    }
  }

  // Try to extract customer name
  // Common patterns: "First Name: John", "Name: John Smith", "First Name:\nJohn\nLast Name:\nSmith"
  let customerName = '';

  // Try "Name: X" pattern first
  const nameMatch = body.match(/(?:Full )?Name[:\s]+([^\n\r]+)/i);
  if (nameMatch) {
    customerName = nameMatch[1].trim();
  } else {
    // Try First Name + Last Name pattern
    const firstNameMatch = body.match(/First ?Name[:\s]+([^\n\r]+)/i);
    const lastNameMatch = body.match(/Last ?Name[:\s]+([^\n\r]+)/i);

    if (firstNameMatch || lastNameMatch) {
      const firstName = firstNameMatch ? firstNameMatch[1].trim() : '';
      const lastName = lastNameMatch ? lastNameMatch[1].trim() : '';
      customerName = `${firstName} ${lastName}`.trim();
    }
  }

  // Try to extract subject/message
  let subject = email.subject || '';
  const subjectMatch = body.match(/Subject[:\s]+([^\n\r]+)/i);
  if (subjectMatch) {
    subject = subjectMatch[1].trim();
  }

  // Clean up subject - remove "Fwd:", "New Contact Form submission" etc
  subject = subject
    .replace(/^(Fwd|Fw|Re):\s*/gi, '')
    .replace(/New Contact Form submission received on .+/i, 'Contact Form')
    .trim();

  if (!subject || subject === 'Contact Form') {
    subject = customerName ? `Contact from ${customerName}` : 'Contact Form Submission';
  }

  // Try to extract the actual message
  let message = '';
  const messageMatch = body.match(/Message[:\s]+([^]*?)(?=\n\n|\n[A-Z][a-z]+:|$)/i);
  if (messageMatch) {
    message = messageMatch[1].trim();
  }

  // Format the body nicely if we extracted fields
  let formattedBody = body;
  if (customerEmail || customerName) {
    // Keep original body but note it's a contact form
    formattedBody = body;
  }

  return {
    customerEmail: customerEmail || fromAddress,
    customerName: customerName || (customerEmail ? customerEmail.split('@')[0] : 'Unknown'),
    subject: subject,
    body: formattedBody,
    isContactForm: true
  };
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

    // Check if this is a contact form submission and extract real customer info
    const contactFormData = parseContactForm(email);

    // Determine the actual customer email (from contact form or original email)
    const customerEmail = contactFormData?.customerEmail || extractEmail(email.from) || email.from;

    // Check blocklist using the real customer email
    if (await isBlocklisted(customerEmail)) {
      console.log(`Blocked email from: ${customerEmail}`);
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

    // Find or create ticket (pass contact form data if available)
    const { ticket, isNew } = await findOrCreateTicket(email, contactFormData);

    // Add message to ticket
    const result = await addMessageToTicket(ticket, email);

    // Send auto-response for new tickets (not duplicates)
    if (isNew && !result.duplicate) {
      const settings = await getHelpdeskSettings();
      await sendAutoResponse(customerEmail, contactFormData?.subject || email.subject || 'Your Support Request', ticket.documentId || ticket.id, settings);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        ticketId: ticket.documentId || ticket.id,
        isNewTicket: isNew,
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
