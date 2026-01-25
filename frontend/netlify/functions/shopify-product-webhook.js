/**
 * Shopify Product Webhook - STUB
 *
 * Temporarily disabled - just returns 200 to stop Shopify retry storm.
 * Real-time updates handled by scheduled bulk-data-refresh instead.
 */

exports.handler = async (event, context) => {
  // Just acknowledge - don't process
  // Bulk data refresh every 15 min handles product sync
  return {
    statusCode: 200,
    body: JSON.stringify({ acknowledged: true, processing: false })
  };
};
