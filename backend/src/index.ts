// import type { Core } from '@strapi/strapi';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  bootstrap({ strapi }) {
    strapi.db.lifecycles.subscribe({
      models: ['plugin::users-permissions.user'],
      async afterCreate(event) {
        const { result } = event;
        const userId = result.id;

        // Check if a Player already exists for this User
        const existingPlayers = await strapi.entityService.findMany('api::player.player', {
          filters: { user: userId },
        });

        if (!existingPlayers.length) {
          await strapi.entityService.create('api::player.player', {
            data: {
              name: result.username || result.email,
              email: result.email,
              user: userId,
            },
          });
        }
      },
    });
  },
};
