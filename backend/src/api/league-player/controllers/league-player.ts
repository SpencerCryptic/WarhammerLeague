import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::league-player.league-player', ({ strapi }) => ({
  async matches(ctx) {
    const { id: leaguePlayerId } = ctx.params;

    const matches = await strapi.entityService.findMany('api::match.match', {
      filters: {
        $or: [
          { league_player1: leaguePlayerId },
          { league_player2: leaguePlayerId },
        ],
      },
      populate: ['league_player1', 'league_player2', 'league'],
    });

    ctx.send(matches);
  },
}));
