export default {
    routes: [
      {
        method: 'POST',
        path: '/leagues/:id/start',
        handler: 'league.start',
        config: {
          policies: [],
          middlewares: [],
        },
      },
    ],
  };
  