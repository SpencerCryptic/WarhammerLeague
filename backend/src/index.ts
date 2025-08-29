
export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }) {
    const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' },
    });

    if (authenticatedRole) {
      const permissions = await strapi.query('plugin::users-permissions.permission').findMany({
        where: {
          role: authenticatedRole.id,
          action: 'api::match.match.userMatches',
        },
      });

      if (permissions.length === 0) {
        await strapi.query('plugin::users-permissions.permission').create({
          data: {
            action: 'api::match.match.userMatches',
            role: authenticatedRole.id,
            enabled: true,
          },
        });
      } else if (!permissions[0].enabled) {
        await strapi.query('plugin::users-permissions.permission').update({
          where: { id: permissions[0].id },
          data: { enabled: true },
        });
      }
    }

    strapi.db.lifecycles.subscribe({
      models: ['plugin::users-permissions.user'],
      async afterCreate(event) {
        const { result } = event;
        const userId = result.id;

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
