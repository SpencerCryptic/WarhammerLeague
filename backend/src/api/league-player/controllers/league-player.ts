import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::league-player.league-player', ({ strapi }) => ({
  async matches(ctx) {
    const leaguePlayerId = ctx.params.id;

    const data = await strapi.entityService.findMany('api::match.match', {
      filters: {
        $or: [
          { league_player1: leaguePlayerId },
          { league_player2: leaguePlayerId },
        ],
      },
      populate: {
        league_player1: {
          populate: ['player'],
        },
        league_player2: {
          populate: ['player'],
        },
        league: true,
      },
    });

    ctx.body = data;
  },
}));
