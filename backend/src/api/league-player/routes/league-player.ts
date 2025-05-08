// path: src/api/league-player/routes/league-player.ts

import { factories } from '@strapi/strapi';

const customRouterConfig = {
  config: {
    find: {},
    findOne: {},
    create: {},
    update: {},
    delete: {},
  },
  routes: [
    {
      method: 'GET',
      path: '/league-players/:id/matches',
      handler: 'league-player.matches',
      config: {
        auth: true,
        policies: [],
      },
    },
  ],
} as any;

export default factories.createCoreRouter(
  'api::league-player.league-player',
  customRouterConfig
);
