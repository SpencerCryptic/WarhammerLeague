export default {
  /**
   * Refresh Mahina events every hour
   */
  '0 * * * *': async ({ strapi }) => {
    try {
      console.log('🕐 Cron: Starting hourly Mahina events refresh...');
      
      // Call the controller method to refresh events
      const controller = strapi.controller('api::mahina-events.mahina-events');
      await controller.fetchAndCacheMahinaEvents();
      
      console.log('✅ Cron: Mahina events refreshed successfully');
    } catch (error) {
      console.error('❌ Cron: Failed to refresh Mahina events:', error);
    }
  },
};