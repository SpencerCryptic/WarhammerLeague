import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::player.player', ({ strapi }) => ({
  async me(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQueryParams = await this.sanitizeQuery(ctx);
    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.unauthorized("No authenticated user");
    }
    const playerRes = await strapi.documents('api::player.player').findMany({
      filters: { user: userId },
      populate: ['user', 'league_players'],
    });
    if (!playerRes?.length) {
      return ctx.notFound("No player associated with this user");
    }
    ctx.body = playerRes[0]; // clean response
  },
}));
