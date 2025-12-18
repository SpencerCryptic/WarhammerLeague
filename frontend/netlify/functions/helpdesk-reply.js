/**
 * Helpdesk Reply - Netlify Function
 *
 * Routes outbound replies to the appropriate channel:
 * - Email: Send via SMTP
 * - Messenger: Send via Facebook Graph API
 * - Instagram: Send via Instagram Graph API
 */

const nodemailer = require('nodemailer');

const STRAPI_URL = process.env.STRAPI_URL || 'https://accessible-positivity-e213bb2958.strapiapp.com';

// Use same SMTP env vars as backend, with HELPDESK_ prefix as fallback
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || process.env.HELPDESK_SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || process.env.HELPDESK_SMTP_PORT || '587'),
  secure: (process.env.SMTP_SECURE || process.env.HELPDESK_SMTP_SECURE) === 'true',
  auth: {
    user: process.env.SMTP_USER || process.env.HELPDESK_SMTP_USER,
    pass: process.env.SMTP_PASS || process.env.HELPDESK_SMTP_PASSWORD
  }
};

// Meta/Facebook Configuration
const META_PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
const META_INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || META_PAGE_ACCESS_TOKEN;

/**
 * Format date for email display
 */
function formatEmailDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Send email reply via SMTP
 */
async function sendEmailReply(to, subject, content, ticketId, options = {}) {
  if (!SMTP_CONFIG.host || !SMTP_CONFIG.auth.user) {
    console.log('SMTP not configured');
    return { success: false, error: 'SMTP not configured' };
  }

  const transporter = nodemailer.createTransport(SMTP_CONFIG);

  const fromAddress = process.env.SMTP_FROM || process.env.HELPDESK_FROM_EMAIL || SMTP_CONFIG.auth.user;
  const fromName = process.env.HELPDESK_FROM_NAME || 'Cryptic Cabin Support';

  // Use short ticket reference (first 6 chars)
  const shortId = String(ticketId).substring(0, 6).toUpperCase();
  const ticketRef = `#${shortId}`;

  // Add ticket reference to subject if not already present
  const replySubject = subject.includes(ticketRef) || subject.includes('[#')
    ? subject
    : `Re: ${subject} [${ticketRef}]`;

  // Agent's first name for sign-off
  const agentName = options.agentFirstName || 'The Support Team';

  // Customer's first name for greeting (or fall back to generic "Hi")
  const customerFirstName = options.customerFirstName || '';
  const greeting = customerFirstName ? `Hi ${customerFirstName},` : 'Hi,';

  // Format the original message for quoting
  const originalMessageFormatted = options.originalMessage
    ? options.originalMessage.split('\n').map(line => `> ${line}`).join('\n')
    : '';
  const originalDateFormatted = formatEmailDate(options.originalMessageDate);

  // Build plain text email
  const textBody = `${greeting}

${content}

If you have any further questions, please don't hesitate to reply to this email.

Best regards,
${agentName}
Cryptic Cabin Support
${options.originalMessage ? `
-------- Original Message --------
On ${originalDateFormatted}, you wrote:

${originalMessageFormatted}
` : ''}
---
Ref: ${ticketRef}`;

  // Build HTML email
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { margin-bottom: 24px; white-space: pre-wrap; }
    .signature { margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; }
    .signature-name { font-weight: 600; color: #333; }
    .signature-team { color: #666; font-size: 14px; }
    .original-message { margin-top: 32px; padding: 16px; background: #f9f9f9; border-left: 3px solid #ddd; font-size: 14px; color: #666; }
    .original-header { font-size: 12px; color: #888; margin-bottom: 12px; }
    .original-content { white-space: pre-wrap; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <p>${greeting}</p>

    <div class="content">${content.replace(/\n/g, '<br>')}</div>

    <p style="color: #666; margin-top: 24px;">If you have any further questions, please don't hesitate to reply to this email.</p>

    <div class="signature">
      <p style="margin-bottom: 4px;">Best regards,</p>
      <div class="signature-name">${agentName}</div>
      <div class="signature-team">Cryptic Cabin Support</div>
    </div>

    ${options.originalMessage ? `
    <div class="original-message">
      <div class="original-header">On ${originalDateFormatted}, you wrote:</div>
      <div class="original-content">${options.originalMessage.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}

    <div class="footer">
      Ref: ${ticketRef}
    </div>
  </div>
</body>
</html>`;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: to,
      subject: replySubject,
      text: textBody,
      html: htmlBody
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send Messenger reply via Facebook Graph API
 */
async function sendMessengerReply(recipientId, content) {
  if (!META_PAGE_ACCESS_TOKEN) {
    console.log('Messenger not configured');
    return { success: false, error: 'Messenger not configured' };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${META_PAGE_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: content },
          messaging_type: 'RESPONSE'
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('Messenger error:', data.error);
      return { success: false, error: data.error.message };
    }

    console.log('Messenger reply sent:', data.message_id);
    return { success: true, messageId: data.message_id };
  } catch (error) {
    console.error('Messenger send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send Instagram DM reply via Graph API
 */
async function sendInstagramReply(recipientId, content) {
  if (!META_INSTAGRAM_ACCESS_TOKEN) {
    console.log('Instagram not configured');
    return { success: false, error: 'Instagram not configured' };
  }

  try {
    // Instagram uses the same messaging API as Messenger
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${META_INSTAGRAM_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: content },
          messaging_type: 'RESPONSE',
          tag: 'HUMAN_AGENT' // Required for Instagram outside 24h window
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('Instagram error:', data.error);
      return { success: false, error: data.error.message };
    }

    console.log('Instagram reply sent:', data.message_id);
    return { success: true, messageId: data.message_id };
  } catch (error) {
    console.error('Instagram send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get ticket details from Strapi
 */
async function getTicket(ticketId, token) {
  const response = await fetch(
    `${STRAPI_URL}/api/support-tickets/${ticketId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.data;
}

/**
 * Netlify Function Handler
 */
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  try {
    const body = JSON.parse(event.body || '{}');
    const { ticketId, channel, channelId, content, customerEmail, subject, agentFirstName, customerFirstName, originalMessage, originalMessageDate } = body;

    if (!ticketId || !channel || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: ticketId, channel, content'
        })
      };
    }

    let result;

    switch (channel) {
      case 'email':
        if (!customerEmail) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Email channel requires customerEmail'
            })
          };
        }
        result = await sendEmailReply(
          customerEmail,
          subject || 'Support Reply',
          content,
          ticketId,
          { agentFirstName, customerFirstName, originalMessage, originalMessageDate }
        );
        break;

      case 'messenger':
        if (!channelId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Messenger channel requires channelId (PSID)'
            })
          };
        }
        result = await sendMessengerReply(channelId, content);
        break;

      case 'instagram':
        if (!channelId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Instagram channel requires channelId'
            })
          };
        }
        result = await sendInstagramReply(channelId, content);
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: `Unknown channel: ${channel}`
          })
        };
    }

    return {
      statusCode: result.success ? 200 : 500,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Reply error:', error);

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
