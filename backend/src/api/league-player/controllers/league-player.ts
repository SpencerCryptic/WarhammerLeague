import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::league-player.league-player', ({ strapi }) => ({
  async matches(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQueryParams = await this.sanitizeQuery(ctx);
    const { id: leaguePlayerId } = ctx.params;
    const matches = await strapi.documents('api::match.match').findMany({
      filters: {
        $or: [
          { leaguePlayer1: leaguePlayerId },
          { leaguePlayer2: leaguePlayerId },
        ],
      },
      populate: {
        leaguePlayer1: {
          populate: ['player'], // includes name/email/etc.
        },
        leaguePlayer2: {
          populate: ['player'],
        },
        league: true,
      },
      sort: ['updatedAt:desc'], // optional: newest first
    });
    ctx.body = matches;
  },
}));
