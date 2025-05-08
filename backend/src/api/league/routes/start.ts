export default {
    routes: [
      {
        method: 'POST',
        path: '/leagues/:id/start',
        handler: 'league.start',
        config: {
          auth: {
            required: true, // ✅ this is the correct form
          },
          policies: [],
          middlewares: [],
        },
      },
    ],
  };
  