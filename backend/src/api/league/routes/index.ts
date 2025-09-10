export default {
    routes: [
      {
        method: 'GET',
        path: '/leagues/dashboard',
        handler: 'league.dashboard',
        config: {
          auth: false,
        },
      },
      {
        method: 'GET',
        path: '/leagues/store-events',
        handler: 'league.storeEvents',
        config: {
          auth: false,
        },
      },
      {
        method: 'GET',
        path: '/leagues/user-leagues',
        handler: 'league.userLeagues',
        config: {
          auth: {
            required: true,
          },
        },
      },
      {
        method: 'GET',
        path: '/leagues',
        handler: 'league.find',
        config: {
          auth: false,
        },
      },
      {
        method: 'GET',
        path: '/leagues/:id',
        handler: 'league.findOne',
        config: {
          auth: false,
        },
      },
      {
        method: 'POST',
        path: '/leagues',
        handler: 'league.create',
        config: {
          auth: {
            required: true,
          },
          policies: [],
        },
      },
      {
        method: 'PUT',
        path: '/leagues/:id',
        handler: 'league.update',
        config: {
          auth: {
            required: true,
          },
        },
      },
      {
        method: 'DELETE',
        path: '/leagues/:id',
        handler: 'league.delete',
        config: {
          auth: {
            required: true,
          },
        },
      },
      {
        method: 'POST',
        path: '/leagues/:id/join',
        handler: 'league.joinLeague',
        config: {
          auth: {
            required: true,
          },
          policies: ['global::isAuthenticated'],
        },
      },
      {
        method: 'POST',
        path: '/leagues/:id/start',
        handler: 'league.start',
        config: {
          auth: {
            required: true,
          },
          policies: [],
        },
      },
    ],
  };
  