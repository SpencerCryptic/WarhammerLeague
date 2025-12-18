/**
 * Helpdesk Notify - Netlify Function
 *
 * Sends email notifications to support staff for:
 * - Ticket assignment
 * - New ticket (optional)
 */

const nodemailer = require('nodemailer');

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
