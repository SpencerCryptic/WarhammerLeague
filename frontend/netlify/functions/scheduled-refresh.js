/**
 * Netlify Scheduled Function: Daily Bulk Data Refresh
 *
 * Triggers a site rebuild daily at 6 AM UTC to regenerate inventory.
 * Schedule configured in netlify.toml
 */

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  console.log('⏰ Scheduled refresh triggered');
  console.log('Time:', new Date().toISOString());

  try {
    // Trigger a Netlify build via build hook
    // This will run build.js which regenerates the bulk data
    if (process.env.NETLIFY_BUILD_HOOK) {
      const response = await fetch(process.env.NETLIFY_BUILD_HOOK, {
        method: 'POST'
      });
      
      if (response.ok) {
        console.log('✅ Build triggered successfully');
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: 'Build triggered',
            timestamp: new Date().toISOString()
          })
        };
      } else {
        throw new Error(`Build hook failed: ${response.status}`);
      }
    } else {
      console.warn('⚠️ NETLIFY_BUILD_HOOK not configured');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: 'Build hook not configured'
        })
      };
    }
  } catch (error) {
    console.error('❌ Error:', error.message);

    // Optional: Send failure notification
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `⚠️ Cryptic Cabin bulk data refresh failed: ${error.message}`
        })
      }).catch(() => {});
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
