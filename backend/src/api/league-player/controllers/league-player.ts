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

  async updateFaction(ctx) {
    const { id: leaguePlayerDocumentId } = ctx.params;
    const { faction } = ctx.request.body;
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.unauthorized('You must be logged in');
    }

    if (!faction) {
      return ctx.badRequest('Faction is required');
    }

    try {
      // Get the league player
      const leaguePlayer = await strapi.documents('api::league-player.league-player').findOne({
        documentId: leaguePlayerDocumentId,
        populate: ['player', 'league']
      });

      if (!leaguePlayer) {
        return ctx.notFound('League player not found');
      }

      // Check if user owns this league player
      if ((leaguePlayer.player as any)?.documentId !== userId) {
        return ctx.forbidden('You can only update your own faction');
      }

      // Check if league has started
      const league = leaguePlayer.league as any;
      if (league?.startDate) {
        const startDate = new Date(league.startDate);
        const now = new Date();

        if (now >= startDate) {
          return ctx.badRequest('Cannot change faction after league has started');
        }
      }

      // Update the faction and preserve status
      const updatedLeaguePlayer = await strapi.documents('api::league-player.league-player').update({
        documentId: leaguePlayerDocumentId,
        data: {
          faction,
          status: leaguePlayer.status || 'active' // Preserve existing status or default to active
        }
      });

      ctx.body = { data: updatedLeaguePlayer };
    } catch (error) {
      console.error('Error updating faction:', error);
      return ctx.internalServerError('Failed to update faction');
    }
  },
}));
