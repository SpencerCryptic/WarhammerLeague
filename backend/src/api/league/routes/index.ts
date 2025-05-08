export default [
    {
      method: 'GET',
      path: '/leagues',
      handler: 'league.find',
      config: {
        auth: { scope: ['authenticated'] },
      },
    },
    {
      method: 'GET',
      path: '/leagues/:id',
      handler: 'league.findOne',
      config: {
        auth: { scope: ['authenticated'] },
      },
    },
    {
      method: 'POST',
      path: '/leagues',
      handler: 'league.create',
      config: {
        auth: { scope: ['authenticated'] },
      },
    },
    {
      method: 'POST',
      path: '/leagues/:id/join',
      handler: 'league.joinLeague',
      config: {
        auth: { scope: ['authenticated'] },
      },
    },
    {
      method: 'POST',
      path: '/leagues/:id/start',
      handler: 'league.start',
      config: {
        auth: { scope: ['authenticated'] }, // ✅ Fixed here
      },
    },
  ];
  