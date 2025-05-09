// path: src/api/player/routes/player.ts

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
      path: '/me/player',
      handler: 'player.me',
      config: {
        auth: false, // set to true once working
        policies: [],
      },
    },
  ],
} as any;

export default factories.createCoreRouter('api::player.player', customRouterConfig);
