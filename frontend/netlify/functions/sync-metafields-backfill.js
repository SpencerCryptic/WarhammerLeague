/**
 * Metafield Backfill - Scheduled Trigger
 *
 * Triggers the background worker to enrich products missing Scryfall data.
 * Scheduled functions have a 10s timeout, so we delegate to the background function.
 *
 * Schedule: Daily at 7:00 AM UTC (after the 6:30 sync)
 * Manual:   POST /api/sync-metafields-backfill
 */

const SITE_URL = process.env.URL || 'https://leagues.crypticcabin.com';

exports.handler = async (event, context) => {
  console.log('⏰ Scheduled metafield backfill - triggering background worker');
  console.log('Time:', new Date().toISOString());

  try {
    const response = await fetch(`${SITE_URL}/.netlify/functions/sync-metafields-backfill-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggered_by: 'schedule', timestamp: new Date().toISOString() })
    });

    if (response.ok) {
      console.log('✅ Backfill background worker triggered successfully');
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Metafield backfill triggered' })
      };
    } else {
      const error = await response.text();
      console.error('Failed to trigger backfill worker:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: 'Failed to trigger backfill worker' })
      };
    }
  } catch (error) {
    console.error('Error triggering backfill worker:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
