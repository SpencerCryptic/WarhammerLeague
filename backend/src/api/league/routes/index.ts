export default {
    routes: [
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
        },
      },
    ],
  };
  