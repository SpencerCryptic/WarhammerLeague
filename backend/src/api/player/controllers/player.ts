import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::player.player', ({ strapi }) => ({
  async me(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized("No authenticated user");

    const player = await strapi.entityService.findMany('api::player.player', {
      filters: { user: userId },
      populate: ['user'],
    });

    if (!player?.length) return ctx.notFound("No player associated with this user");

    ctx.body = { id: player[0].id, ...player[0] };
  },
}));
