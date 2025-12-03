import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::league-player.league-player', ({ strapi }) => ({
  async findOne(ctx) {
    const { id } = ctx.params;

    try {
      const entity = await strapi.documents('api::league-player.league-player').findOne({
        documentId: id,
        populate: ['player', 'league']
      });

      console.log('🔍 findOne - documentId:', id);
      console.log('🔍 findOne - armyLists:', entity?.armyLists);
      console.log('🔍 findOne - armyLists length:', Array.isArray(entity?.armyLists) ? entity.armyLists.length : 'not an array');

      return ctx.send({ data: entity });
    } catch (error) {
      console.error('❌ Error in findOne:', error);
      return ctx.badRequest(`Failed to fetch: ${error.message}`);
    }
  },

  async update(ctx) {
    // Intercept update requests and ensure status is always set
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    console.log('🔍 League player update - incoming data:', data, 'for ID:', id);

    // If status is missing, empty, or invalid, set it to 'active'
    if (!data.status || data.status === '' || data.status === null || data.status === undefined) {
      console.log('✅ Setting missing status to active in update controller');
      data.status = 'active';
    }

    try {
      // Perform the update directly to bypass validation issues
      const updatedEntity = await strapi.documents('api::league-player.league-player').update({
        documentId: id,
        data: data
      });

      console.log('✅ League player updated successfully');
      return ctx.send(updatedEntity);
    } catch (error) {
      console.error('❌ Error updating league player:', error);
      return ctx.badRequest(`Failed to update: ${error.message}`);
    }
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

      // Find the player for the current user - same pattern as joinLeague
      const [userPlayer] = await strapi.documents('api::player.player').findMany({
        filters: { user: { id: userId } }
      });

      if (!userPlayer) {
        console.log('🔍 Authorization failed - no player found for userId:', userId);
        return ctx.forbidden('You can only update your own faction');
      }

      // Check if the league player belongs to this user's player
      const leaguePlayerDocId = (leaguePlayer.player as any)?.documentId;
      if (leaguePlayerDocId !== userPlayer.documentId) {
        console.log('🔍 Authorization failed - leaguePlayer.player.documentId:', leaguePlayerDocId, 'userPlayer.documentId:', userPlayer.documentId);
        return ctx.forbidden('You can only update your own faction');
      }

      console.log('✅ Authorization passed - player documentIds match:', userPlayer.documentId);

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
