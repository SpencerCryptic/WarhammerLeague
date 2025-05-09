export default {
    async me(ctx) {
      const userId = ctx.state.user?.id;
  
      if (!userId) {
        return ctx.unauthorized("No authenticated user");
      }
  
      const players = await strapi.entityService.findMany('api::player.player', {
        filters: {
          user: userId,
        },
        populate: ['user'],
      });
  
      if (!players || players.length === 0) {
        return ctx.notFound("No player associated with this user");
      }
  
      const player = players[0];
  
      ctx.body = {
        id: player.id,
        ...player,
      };
    },
  };
  