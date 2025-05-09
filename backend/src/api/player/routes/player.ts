import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::player.player', {
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
      path: '/me/player',
      handler: 'player.me',
      config: {
        auth: true,
        policies: [],
      },
    },
  ],
} as any);
