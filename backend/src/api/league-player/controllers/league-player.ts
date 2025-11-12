import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::league-player.league-player', ({ strapi }) => ({
  async update(ctx) {
    // Intercept update requests and ensure status is always set
    const { data } = ctx.request.body;

    console.log('🔍 League player update - incoming data:', data);

    // If status is missing, empty, or invalid, set it to 'active'
    if (!data.status || data.status === '' || data.status === null || data.status === undefined) {
      console.log('✅ Setting missing status to active in update controller');
      data.status = 'active';
    }

    // Call the default update controller with modified data
    ctx.request.body.data = data;
    return super.update(ctx);
  },

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

      // Get the player to check the user relation
      const playerDocumentId = (leaguePlayer.player as any)?.documentId;
      if (!playerDocumentId) {
        return ctx.badRequest('League player has no associated player');
      }

      const player = await strapi.documents('api::player.player').findOne({
        documentId: playerDocumentId,
        populate: ['user']
      });

      // Check if user owns this league player
      const playerUserId = (player?.user as any)?.id;
      if (!playerUserId || playerUserId !== userId) {
        return ctx.forbidden('You can only update your own faction');
      }

      // Check if league status is planned - only allow faction changes in planned status
      const league = leaguePlayer.league as any;
      if (league?.statusleague && league.statusleague !== 'planned') {
        return ctx.badRequest('Cannot change faction - league has already started or is completed');
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
