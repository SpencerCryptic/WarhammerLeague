import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::player.player', ({ strapi }) => ({
  async me(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized("No authenticated user");

    try {
      const players = await strapi.entityService.findMany('api::player.player', {
        filters: { user: userId },
        populate: ['user'],
      });

      if (!players.length) return ctx.notFound("No player associated with this user");

      ctx.body = players[0];
    } catch (error) {
      console.error("Error in player.me:", error);
      ctx.internalServerError("Failed to fetch player");
    }
  },
}));
