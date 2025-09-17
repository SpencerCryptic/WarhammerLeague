import { factories } from '@strapi/strapi';

// Helper functions outside the controller
export async function fetchAndCacheMahinaEvents(strapi: any): Promise<any[]> {
  try {
    console.log('🔍 Fetching from Mahina API...');
    
    // First, get page 1 to find out how many total pages there are
    const firstResponse = await fetch('https://mahina.app/app/cryptic-cabin.myshopify.com', {
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

    if (!firstResponse.ok) {
      throw new Error(`Mahina API returned ${firstResponse.status}: ${firstResponse.statusText}`);
    }

    const firstPageData = await firstResponse.json() as any;
    const totalPages = firstPageData.settings?.noOfPages || 1;
    console.log(`📄 Found ${totalPages} pages of events to fetch`);
    
    // Collect all events starting with page 1
    let allEvents = [...(firstPageData.events || [])];
    
    // Fetch remaining pages if there are more than 1
    for (let page = 2; page <= totalPages; page++) {
      console.log(`📄 Fetching page ${page}/${totalPages}...`);
      
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
          "page": page
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch page ${page}: ${response.status}`);
        continue; // Skip this page but continue with others
      }

      const pageData = await response.json() as any;
      if (pageData.events && Array.isArray(pageData.events)) {
        allEvents.push(...pageData.events);
      }
    }

    console.log(`✅ Fetched ${allEvents.length} total events from ${totalPages} pages`);
    
    // Transform all collected events
    const transformedEvents = transformMahinaEvents({ events: allEvents });

    // Sort events by date (earliest first)
    transformedEvents.sort((a, b) => {
      const dateA = new Date(a.startDate || '9999-12-31');
      const dateB = new Date(b.startDate || '9999-12-31');
      return dateA.getTime() - dateB.getTime();
    });

    // Cache the events in database
    await strapi.documents('api::mahina-event.mahina-event').create({
      data: {
        events: transformedEvents as any,
        rawData: firstPageData as any
      }
    });

    console.log(`✅ Cached ${transformedEvents.length} Mahina events`);
    return transformedEvents;

  } catch (error) {
    console.error('❌ Error fetching Mahina events:', error);
    throw error;
  }
}

function transformMahinaEvents(mahinaData: any): any[] {
  // Transform Mahina data to your preferred format
  if (!mahinaData || !mahinaData.events || !Array.isArray(mahinaData.events)) {
    return [];
  }

  return mahinaData.events.map(event => ({
    id: event.id,
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    description: event.description,
    location: event.location?.name || event.location,
    image: event.image,
    tickets: event.tickets,
    timezone: event.timezone,
    tags: event.tags || [],
    isRecurring: event.isRecurring,
    sessions: event.sessions,
    rsvp: event.rsvp,
    organisers: event.organisers
  }));
}

export default factories.createCoreController('api::mahina-event.mahina-event', ({ strapi }) => ({
  
  async getEvents(ctx) {
    try {
      // Get cached events from database (most recent first)
      const cachedEvents = await strapi.documents('api::mahina-event.mahina-event').findMany({
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
      const freshEvents = await fetchAndCacheMahinaEvents(strapi);
      
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

  // Manual refresh endpoint (for testing or immediate updates)
  async refreshEvents(ctx) {
    try {
      console.log('🔄 Manual refresh requested');
      const freshEvents = await fetchAndCacheMahinaEvents(strapi);
      
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