/**
 * Metafield Backfill - Scheduled Trigger
 *
 * Fires an HTTP request to the background worker function.
 * Scheduled functions have a 10s timeout, so we CANNOT run the backfill
 * inline. Instead we POST to the -background function endpoint which
 * Netlify runs with a 15-minute timeout (returns 202 immediately).
 *
 * Schedule: Daily at 7:00 AM UTC (after the 6:30 sync)
 * Manual:   POST /api/sync-metafields-backfill
 */

exports.handler = async (event, context) => {
  console.log('⏰ Scheduled metafield backfill - triggering background worker');
  console.log('Time:', new Date().toISOString());

  const siteUrl = process.env.URL || 'https://leagues.crypticcabin.com';
  const bgUrl = `${siteUrl}/.netlify/functions/sync-metafields-backfill-background`;

  try {
    const res = await fetch(bgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggered_by: 'schedule' })
    });

    console.log(`✅ Background function triggered: ${res.status}`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Background backfill triggered',
        bgStatus: res.status
      })
    };
  } catch (error) {
    console.error('❌ Failed to trigger backfill:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
