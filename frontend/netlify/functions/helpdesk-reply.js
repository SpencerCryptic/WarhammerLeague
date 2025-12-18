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
 * Send email reply via SMTP
 */
async function sendEmailReply(to, subject, content, ticketId) {
  if (!SMTP_CONFIG.host || !SMTP_CONFIG.auth.user) {
    console.log('SMTP not configured');
    return { success: false, error: 'SMTP not configured' };
  }

  const transporter = nodemailer.createTransport(SMTP_CONFIG);

  const fromAddress = process.env.SMTP_FROM || process.env.HELPDESK_FROM_EMAIL || SMTP_CONFIG.auth.user;
  const fromName = process.env.HELPDESK_FROM_NAME || 'Cryptic Cabin Support';

  // Add ticket reference to subject if not already present
  const ticketRef = `[Ticket #${ticketId}]`;
  const replySubject = subject.includes(ticketRef)
    ? subject
    : `Re: ${subject} ${ticketRef}`;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: to,
      subject: replySubject,
      text: content,
      html: content.replace(/\n/g, '<br>')
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
    const { ticketId, channel, channelId, content, customerEmail, subject } = body;

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
          ticketId
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
