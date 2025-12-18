/**
 * Helpdesk Mark Read - Netlify Function
 *
 * Calls the Google Apps Script web app to mark Gmail emails as read
 * when a ticket is assigned in the helpdesk.
 */

const GMAIL_WEBAPP_URL = process.env.GMAIL_WEBAPP_URL;
const GMAIL_WEBAPP_SECRET = process.env.GMAIL_WEBAPP_SECRET;

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

  if (!GMAIL_WEBAPP_URL || !GMAIL_WEBAPP_SECRET) {
    console.log('Gmail web app not configured, skipping mark as read');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        skipped: true,
        reason: 'Gmail web app not configured'
      })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { messageIds } = body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No messageIds provided' })
      };
    }

    console.log(`Marking ${messageIds.length} emails as read`);

    const results = [];
    for (const messageId of messageIds) {
      try {
        const response = await fetch(GMAIL_WEBAPP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: messageId,
            secret: GMAIL_WEBAPP_SECRET
          })
        });

        const result = await response.json();
        results.push({ messageId, ...result });

        if (result.success) {
          console.log(`Marked as read: ${messageId}`);
        } else {
          console.log(`Failed to mark: ${messageId} - ${result.error}`);
        }
      } catch (error) {
        console.error(`Error marking ${messageId}:`, error);
        results.push({ messageId, success: false, error: error.message });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results
      })
    };

  } catch (error) {
    console.error('Mark read error:', error);
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
