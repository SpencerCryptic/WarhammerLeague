/**
 * Helpdesk Auto-Close - Netlify Scheduled Function
 *
 * Runs daily to close tickets that have had no customer response
 * after the configured number of days (default 7).
 */

const nodemailer = require('nodemailer');

const STRAPI_URL = process.env.STRAPI_URL || 'https://accessible-positivity-e213bb2958.strapiapp.com';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

// SMTP Configuration
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM || 'support@crypticcabin.com';

/**
 * Get helpdesk settings
 */
async function getSettings() {
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
    console.error('Error fetching settings:', error);
  }
  return null;
}

/**
 * Send email notification
 */
async function sendEmail(to, subject, body) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    console.log('SMTP not configured, skipping email');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: parseInt(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD
    }
  });

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text: body
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

/**
 * Close ticket and optionally notify customer
 */
async function closeTicket(ticket, settings) {
  const headers = {
    'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json'
  };

  // Update ticket status to closed
  const response = await fetch(`${STRAPI_URL}/api/support-tickets/${ticket.documentId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      data: {
        status: 'closed',
        resolvedAt: new Date().toISOString()
      }
    })
  });

  if (!response.ok) {
    console.error(`Failed to close ticket ${ticket.id}:`, await response.text());
    return false;
  }

  console.log(`Closed ticket ${ticket.id}: ${ticket.subject}`);

  // Add system message
  await fetch(`${STRAPI_URL}/api/ticket-messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        ticket: ticket.id,
        content: 'Ticket automatically closed due to inactivity.',
        direction: 'outbound',
        senderType: 'system',
        senderName: 'System'
      }
    })
  });

  // Send notification email if configured
  if (settings?.autoCloseMessage && ticket.customerEmail) {
    await sendEmail(
      ticket.customerEmail,
      `Re: ${ticket.subject} - Ticket Closed`,
      settings.autoCloseMessage
    );
  }

  return true;
}

/**
 * Main handler
 */
exports.handler = async (event, context) => {
  console.log('Running auto-close check...');

  if (!STRAPI_API_TOKEN) {
    console.error('STRAPI_API_TOKEN not configured');
    return { statusCode: 500, body: 'Not configured' };
  }

  try {
    // Get settings
    const settings = await getSettings();

    if (!settings?.autoCloseEnabled) {
      console.log('Auto-close is disabled');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Auto-close disabled' })
      };
    }

    const autoCloseDays = settings.autoCloseDays || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - autoCloseDays);

    console.log(`Looking for tickets with no activity since ${cutoffDate.toISOString()}`);

    // Fetch tickets that are open or in_progress and haven't been updated
    const response = await fetch(
      `${STRAPI_URL}/api/support-tickets?` +
      `filters[$or][0][status][$eq]=open&` +
      `filters[$or][1][status][$eq]=in_progress&` +
      `filters[$or][2][status][$eq]=waiting&` +
      `filters[lastMessageAt][$lt]=${cutoffDate.toISOString()}&` +
      `pagination[limit]=100`,
      {
        headers: {
          'Authorization': `Bearer ${STRAPI_API_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch tickets: ${await response.text()}`);
    }

    const data = await response.json();
    const tickets = data.data || [];

    console.log(`Found ${tickets.length} tickets to auto-close`);

    let closed = 0;
    for (const ticket of tickets) {
      const success = await closeTicket(ticket, settings);
      if (success) closed++;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        checked: tickets.length,
        closed: closed
      })
    };

  } catch (error) {
    console.error('Auto-close error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
