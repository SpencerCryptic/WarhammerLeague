import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::match.match', {
  config: {
    find: {},
    findOne: {},
    create: {},
    update: {},
    delete: {},
    report: {
      auth: true,
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
  ],
} as any);
