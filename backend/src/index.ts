export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }) {
    // Auto-create Player on User registration
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

    // ✅ Grant access to /me/player for 'authenticated' role
    const role = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'authenticated' } });

    if (role) {
      const existingPermission = await strapi
        .query('plugin::users-permissions.permission')
        .findOne({
          where: {
            role: role.id,
            action: 'plugin::users-permissions.player.me',
            controller: 'player',
            type: 'api',
          },
        });

      if (!existingPermission) {
        await strapi.query('plugin::users-permissions.permission').create({
          data: {
            action: 'plugin::users-permissions.player.me',
            controller: 'player',
            type: 'api',
            role: role.id,
            enabled: true,
            policy: '',
          },
        });

        strapi.log.info(`✅ Registered /me/player permission for authenticated role`);
      }
    }
  },
};
