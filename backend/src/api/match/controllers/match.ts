import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::match.match', ({ strapi }) => ({

  async submit(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQueryParams = await this.sanitizeQuery(ctx);

    const matchId = ctx.params.id;
    const { leaguePlayer1Score, leaguePlayer2Score } = ctx.request.body;

    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.unauthorized('You must be logged in.')
    };

    const match = await strapi.documents('api::match.match').findOne({
      documentId: matchId,
      populate: ['leaguePlayer1', 'leaguePlayer2'],
    })
    if (!match) {
      return ctx.notFound('Match not found')
    };
    if (!match.leaguePlayer1 || !match.leaguePlayer2) {
      return ctx.badRequest('Match does not have both players populated.');
    }
    if (['played', 'abandoned'].includes(match.statusMatch)) {
      return ctx.badRequest('Match result has already been submitted.');
    }

    const [leaguePlayer] = await strapi.documents('api::league-player.league-player').findMany({
      filters: { player: { user: { id: userId } } }
    });
    if (!leaguePlayer) {
      return ctx.badRequest('No LeaguePlayer found for this user')
    };
    
    const isPlayerInMatch = [match.leaguePlayer1.id, match.leaguePlayer2.id].includes(leaguePlayer.id);
    if (!isPlayerInMatch) {
      return ctx.unauthorized('You are not a participant in this match')
    };
    const updatedMatch = await strapi.documents('api::match.match').update({
      documentId: matchId,
      data: { 
        leaguePlayer1Score,
        leaguePlayer2Score,
        leaguePlayer1Result: leaguePlayer1Score > leaguePlayer2Score ? 2 : leaguePlayer2Score > leaguePlayer1Score ? 0 : 1,
        leaguePlayer2Result: leaguePlayer2Score > leaguePlayer1Score ? 2 : leaguePlayer1Score > leaguePlayer2Score ? 0 : 1,
        statusMatch: 'played'
      },
    });
    ctx.body = { message: 'Match result reported successfully', match: updatedMatch };
  },

  async respondToProposal(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQueryParams = await this.sanitizeQuery(ctx);
    const matchId = ctx.params.documentId;
    const { action } = ctx.request.body;
    const userId = ctx.state.user?.documentId;
    if (!userId) return ctx.unauthorized('You must be logged in.');
    if (!['accept', 'decline'].includes(action)) {
      return ctx.badRequest('Invalid action.');
    }
    const match = await strapi.documents('api::match.match').findOne({
      documentId: matchId,
      populate: ['leaguePlayer1', 'leaguePlayer2']
    });
    if (!match) {
      return ctx.notFound('Match not found');
    }
    if (!match.leaguePlayer1 || !match.leaguePlayer2) {
      return ctx.badRequest('Match does not have both players populated.');
    }
    const [leaguePlayer] = await strapi.documents('api::league-player.league-player').findMany({
      filters: { player: { user: { id: userId } } },
    });
    if (!leaguePlayer) return ctx.badRequest('No LeaguePlayer found for this user');
    const isPlayerInMatch = [match.leaguePlayer1.id, match.leaguePlayer2.id].includes(leaguePlayer.id);
    if (!isPlayerInMatch) return ctx.unauthorized('You are not a participant in this match');
    const updateData = action === 'accept'
    ? { proposalStatus: 'Accepted' as 'Accepted' }
    : {
        proposalStatus: 'Rejected' as 'Rejected',
        proposalTimestamp: null,
        proposedBy: null,
      };
    const updatedMatch = await strapi.documents('api::match.match').update({
      documentId: matchId,
      data: updateData,
    });
    ctx.body = { message: `Proposal ${action}ed`, match: updatedMatch };
  }
}));
