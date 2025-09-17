import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::mahina-events.mahina-events', ({ strapi }) => ({
  
  async getEvents(ctx) {
    try {
      // Get cached events from database (most recent first)
      const cachedEvents = await strapi.documents('api::mahina-events.mahina-events').findMany({
        sort: ['updatedAt:desc'],
        limit: 1
      });

      if (cachedEvents.length > 0) {
        const lastUpdate = new Date(cachedEvents[0].updatedAt);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
        
        // If data is fresh (less than 1 hour old), return cached data
        if (lastUpdate > oneHourAgo) {
          console.log('🟢 Returning cached Mahina events');
          return ctx.body = {
            success: true,
            data: cachedEvents[0].events,
            lastUpdated: cachedEvents[0].updatedAt,
            source: 'cache'
          };
        }
      }

      // Data is stale or doesn't exist, fetch fresh data
      console.log('🔄 Fetching fresh Mahina events...');
      const freshEvents = await this.fetchAndCacheMahinaEvents();
      
      return ctx.body = {
        success: true,
        data: freshEvents,
        lastUpdated: new Date().toISOString(),
        source: 'fresh'
      };

    } catch (error) {
      console.error('❌ Error in getEvents:', error);
      return ctx.body = {
        success: false,
        error: 'Failed to fetch events',
        message: error.message
      };
    }
  },

  async fetchAndCacheMahinaEvents() {
    try {
      console.log('🔍 Fetching from Mahina API...');
      
      const response = await fetch('https://mahina.app/app/cryptic-cabin.myshopify.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://crypticcabin.com/',
          'Origin': 'https://crypticcabin.com',
        },
        body: JSON.stringify({
          "shop": "cryptic-cabin.myshopify.com",
          "selectedEventId": null,
          "selectedRecurringDate": null,
          "page": 1
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Mahina API returned ${response.status}: ${response.statusText}`);
      }

      const mahinaData = await response.json();
      const transformedEvents = this.transformMahinaEvents(mahinaData);

      // Sort events by date (earliest first)
      transformedEvents.sort((a, b) => {
        const dateA = new Date(a.date || '9999-12-31');
        const dateB = new Date(b.date || '9999-12-31');
        return dateA.getTime() - dateB.getTime();
      });

      // Cache the events in database
      await strapi.documents('api::mahina-events.mahina-events').create({
        data: {
          events: transformedEvents,
          rawData: mahinaData
        }
      });

      console.log(`✅ Cached ${transformedEvents.length} Mahina events`);
      return transformedEvents;

    } catch (error) {
      console.error('❌ Error fetching Mahina events:', error);
      throw error;
    }
  },

  transformMahinaEvents(mahinaData) {
    // Transform Mahina data to your preferred format
    // You can copy the transformation logic from your league controller
    if (!mahinaData || !Array.isArray(mahinaData)) {
      return [];
    }

    return mahinaData.map(event => ({
      id: event.id,
      title: event.title || event.name,
      date: event.date || event.start_date,
      time: event.time || event.start_time,
      description: event.description,
      location: event.location,
      image: event.image,
      ticketUrl: event.ticket_url || event.url,
      price: event.price,
      capacity: event.capacity,
      attendees: event.attendees,
      status: event.status,
      tags: event.tags || [],
      // Add any other fields you need
    }));
  },

  // Manual refresh endpoint (for testing or immediate updates)
  async refreshEvents(ctx) {
    try {
      console.log('🔄 Manual refresh requested');
      const freshEvents = await this.fetchAndCacheMahinaEvents();
      
      return ctx.body = {
        success: true,
        message: 'Events refreshed successfully',
        data: freshEvents,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error in manual refresh:', error);
      return ctx.body = {
        success: false,
        error: 'Failed to refresh events',
        message: error.message
      };
    }
  }

}));