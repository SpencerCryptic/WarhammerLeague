'use strict';

export default {
  routes: [
    {
      method: 'POST',
      path: '/leagues/:id/join',
      handler: 'league.joinLeague',
      config: {
        policies: [],
        auth: { scope: ['authenticated'] },
      },
    },
  ],
};
