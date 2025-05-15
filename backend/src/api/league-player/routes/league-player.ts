import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::league-player.league-player', {
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
        auth: false,
        policies: [],
      },
    },
  ],
} as any);
