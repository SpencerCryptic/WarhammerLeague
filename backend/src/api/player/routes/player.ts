import { factories } from '@strapi/strapi';

const customRoutes = [
  {
    method: 'GET',
    path: '/me/player',
    handler: 'player.me',
    config: {
      auth: false, // make true when done testing
    },
  },
];

export default factories.createCoreRouter('api::player.player', {
  config: {},
  routes: customRoutes,
} as any);
