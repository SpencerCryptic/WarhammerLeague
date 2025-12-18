import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::player.player', {
  config: {
    // Public read access for leaderboards
    find: {},
    findOne: {},
    // Require authentication for write operations
    create: {
      auth: {
        required: true,
      },
    },
    update: {
      auth: {
        required: true,
      },
    },
    delete: {
      auth: {
        required: true,
      },
    },
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
