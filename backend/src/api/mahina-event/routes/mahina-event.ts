export default {
  routes: [
    {
      method: 'GET',
      path: '/mahina-events',
      handler: 'mahina-event.getEvents',
      config: {
        auth: false, // No auth required for Shopify integration
      },
    },
    {
      method: 'POST',
      path: '/mahina-events/refresh',
      handler: 'mahina-event.refreshEvents',
      config: {
        auth: false, // You might want to add some API key auth here later
      },
    },
  ],
};