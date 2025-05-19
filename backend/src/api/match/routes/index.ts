import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::match.match', {
    config: {
      find: {},
      findOne: {},
      create: {},
      delete: {},
      report: { config: {
        auth: true,
      }, },
      respondToProposal: { config: {
        auth: true,
      }, },
    },
    routes: [
      {
        method: 'PUT',
        path: '/matches/:id',
        handler: 'match.update',
        config: {
          auth: true,
        },
      },
      {
        method: 'POST',
        path: '/matches/:id/report',
        handler: 'match.report',
        config: {
          auth: true,
        },
      },
      {
        method: 'POST',
        path: '/matches/:id/respond-proposal',
        handler: 'match.respondToProposal',
        config: {
          auth: true,
        },
      },
    ],
  } as any);
  