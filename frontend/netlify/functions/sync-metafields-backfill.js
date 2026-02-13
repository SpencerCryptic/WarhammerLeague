/**
 * Metafield Backfill - Scheduled Trigger
 *
 * Triggers the background worker to enrich products missing Scryfall data.
 * Scheduled functions have a 10s timeout, so we invoke the background
 * function directly rather than via HTTP.
 *
 * Schedule: Daily at 7:00 AM UTC (after the 6:30 sync)
 * Manual:   POST /api/sync-metafields-backfill
 */

const backgroundHandler = require('./sync-metafields-backfill-background');

exports.handler = async (event, context) => {
  console.log('⏰ Scheduled metafield backfill - invoking background worker');
  console.log('Time:', new Date().toISOString());

  try {
    // Invoke the background handler directly (avoids HTTP self-call issues)
    const result = await backgroundHandler.handler(
      { ...event, body: JSON.stringify({ triggered_by: 'schedule' }) },
      context
    );

    console.log('✅ Backfill completed:', result?.statusCode);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Metafield backfill completed' })
    };
  } catch (error) {
    console.error('❌ Backfill error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
