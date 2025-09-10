// src/api/match/routes/index.ts

export default {
  routes: [
    {
      method: 'GET',
      path: '/matches/user',
      handler: 'match.userMatches',
      config: {
        auth: {
          required: true,
        },
      },
    },
    {
      method: 'GET',
      path: '/matches',
      handler: 'match.find',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/matches/:id',
      handler: 'match.findOne',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/matches',
      handler: 'match.create',
      config: {
        auth: {
          required: true,
        },
      },
    },
    {
      method: 'PUT',
      path: '/matches/:id',
      handler: 'match.update',
      config: {
        auth: {
          required: true,
        },
      },
    },
    {
      method: 'DELETE',
      path: '/matches/:id',
      handler: 'match.delete',
      config: {
        auth: {
          required: true,
        },
      },
    },
    {
      method: 'POST',
      path: '/matches/:id/submit',
      handler: 'match.submit',
    },
    {
      method: 'PUT',
      path: '/matches/:id/admin-modify-score',
      handler: 'match.adminModifyScore',
      config: {
        auth: {
          required: true,
        },
      },
    },
  ],
};
