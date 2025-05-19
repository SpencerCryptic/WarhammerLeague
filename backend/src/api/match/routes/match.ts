import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::match.match', {
    config: {
      find: {},
      findOne: {},
      create: {},
      delete: {},
      report: { auth: true },
      respondToProposal: { auth: true },
    },
    routes: [
      {
        method: 'PUT',
        path: '/matches/:id',
        handler: 'match.update',
        config: {
          auth: {
            scope: ['plugin::users-permissions.user'],
          },
          policies: [],
        },
      },
      {
        method: 'POST',
        path: '/matches/:id/report',
        handler: 'match.report',
        config: {
          auth: {
            scope: ['plugin::users-permissions.user'],
          },
          policies: [],
        },
      },
      {
        method: 'POST',
        path: '/matches/:id/respond-proposal',
        handler: 'match.respondToProposal',
        config: {
          auth: {
            scope: ['plugin::users-permissions.user'],
          },
          policies: [],
        },
      },
    ],
  } as any);
  