import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::match.match', {
  config: {
    find: {},
    findOne: {},
    create: {},
    update: {
        auth: {
          scope: ['plugin::users-permissions.user'],
        },
      },
    delete: {},
    report: {
        auth: {
          scope: ['plugin::users-permissions.user'],
        },
      },
    respondToProposal: {
        auth: {
          scope: ['plugin::users-permissions.user'],
        },
      },
  },
  routes: [
    {
      method: 'POST',
      path: '/matches/:id/report',
      handler: 'match.report',
      config: {
        auth: true,
        policies: [],
      },
    },
      {
        method: 'POST',
        path: '/matches/:id/respond-proposal',
        handler: 'match.respondToProposal',
        config: {
            auth: true,
            policies: [],
          },
      },
      {
        method: 'PUT',
        path: '/matches/:id',
        handler: 'match.update',
        config: {
          auth: true,
          policies: [],
        },
      }      
  ],
} as any);
