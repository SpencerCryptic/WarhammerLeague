// src/api/match/routes/index.ts

export default {
  routes: [
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
      path: '/matches/:id/report',
      handler: 'match.report',
      config: {
        auth: {
          required: true,
        },
      },
    },
    {
      method: 'POST',
      path: '/matches/:id/respond-proposal',
      handler: 'match.respondToProposal',
      config: {
        auth: {
          required: true,
        },
      },
    },
  ],
};
