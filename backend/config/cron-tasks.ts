export default {
  /**
   * Refresh Mahina events every hour
   */
  '0 * * * *': async ({ strapi }) => {
    try {
      console.log('🕐 Cron: Starting hourly Mahina events refresh...');
      
      // Fetch and cache Mahina events directly
      const { fetchAndCacheMahinaEvents } = require('../src/api/mahina-event/controllers/mahina-event');
      await fetchAndCacheMahinaEvents(strapi);
      
      console.log('✅ Cron: Mahina events refreshed successfully');
    } catch (error) {
      console.error('❌ Cron: Failed to refresh Mahina events:', error);
    }
  },
};