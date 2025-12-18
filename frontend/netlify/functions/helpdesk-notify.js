/**
 * Helpdesk Notify - Netlify Function
 *
 * Sends email notifications for:
 * - Ticket assignment (to staff)
 * - Ticket resolved (to customer)
 */

const nodemailer = require('nodemailer');

const STRAPI_URL = process.env.STRAPI_URL || 'https://accessible-positivity-e213bb2958.strapiapp.com';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

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

const FROM_EMAIL = process.env.SMTP_FROM || process.env.HELPDESK_FROM_EMAIL || SMTP_CONFIG.auth.user;
const FROM_NAME = process.env.HELPDESK_FROM_NAME || 'Cryptic Cabin Support';
const HELPDESK_URL = 'https://leagues.crypticcabin.com/helpdesk';

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
 * Send resolved notification to customer
 */
async function sendResolvedNotification({ ticketId, ticketSubject, customerEmail, channel, channelId }) {
  const settings = await getHelpdeskSettings();

  if (!settings?.resolvedMessageEnabled) {
    console.log('Resolved notification disabled');
    return { success: true, skipped: true };
  }

  if (!SMTP_CONFIG.host || !SMTP_CONFIG.auth.user) {
    console.log('SMTP not configured, skipping notification');
    return { success: false, error: 'SMTP not configured' };
  }

  const transporter = nodemailer.createTransport(SMTP_CONFIG);

  let body = settings.resolvedMessage || 'Your support ticket has been marked as resolved. If you have any further questions, please reply to this email.';

  // Add signature if enabled
  if (settings?.signatureEnabled && settings?.emailSignature) {
    body += '\n\n' + settings.emailSignature;
  }

  const ticketRef = `[Ticket #${ticketId}]`;

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

    <div class="content">${(settings.resolvedMessage || 'Your support ticket has been marked as resolved. If you have any further questions, please reply to this email.').replace(/\n/g, '<br>')}</div>

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
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Re: ${ticketSubject} ${ticketRef}`,
      text: body,
      html: htmlBody
    });

    console.log('Resolved notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send resolved notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send assignment notification email
 */
async function sendAssignmentNotification({ ticketId, ticketSubject, assigneeEmail, assigneeName }) {
  if (!SMTP_CONFIG.host || !SMTP_CONFIG.auth.user) {
    console.log('SMTP not configured, skipping notification');
    return { success: false, error: 'SMTP not configured' };
  }

  const transporter = nodemailer.createTransport(SMTP_CONFIG);

  const ticketUrl = `${HELPDESK_URL}/${ticketId}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">Ticket Assigned to You</h2>
      <p>Hi ${assigneeName},</p>
      <p>A support ticket has been assigned to you:</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; font-weight: bold;">${ticketSubject}</p>
      </div>
      <p>
        <a href="${ticketUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View Ticket
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
        - Cryptic Cabin Support System
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: assigneeEmail,
      subject: `[Assigned] ${ticketSubject}`,
      html: html
    });

    console.log('Assignment notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Netlify Function Handler
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const { type } = body;

    let result;

    switch (type) {
      case 'assignment':
        result = await sendAssignmentNotification(body);
        break;
      case 'resolved':
        result = await sendResolvedNotification(body);
        break;
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Unknown notification type: ${type}` })
        };
    }

    return {
      statusCode: result.success ? 200 : 500,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Notification error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
