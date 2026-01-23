/**
 * Metafield Sync - Scheduled Trigger
 *
 * Triggers the background worker to sync Scryfall data to Shopify metafields.
 * Scheduled functions have 10s timeout, so we delegate to background function.
 */

const SITE_URL = process.env.URL || 'https://leagues.crypticcabin.com';

exports.handler = async (event, context) => {
  console.log('⏰ Scheduled metafield sync - triggering background worker');
  console.log('Time:', new Date().toISOString());

  try {
    // Trigger the background function (fire and forget)
    const response = await fetch(`${SITE_URL}/.netlify/functions/sync-metafields-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggered_by: 'schedule', timestamp: new Date().toISOString() })
    });

    if (response.ok) {
      console.log('✅ Background worker triggered successfully');
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Metafield sync triggered' })
      };
    } else {
      const error = await response.text();
      console.error('Failed to trigger background worker:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: 'Failed to trigger background worker' })
      };
    }
  } catch (error) {
    console.error('Error triggering background worker:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
