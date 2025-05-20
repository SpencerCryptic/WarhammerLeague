import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::match.match', ({ strapi }) => ({

  async report(ctx) {
    const matchId = ctx.params.id;
    const { score1, score2 } = ctx.request.body;
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('You must be logged in.');

    const match = await strapi.entityService.findOne('api::match.match', parseInt(matchId), {
      populate: ['league_player1', 'league_player2'],
    }) as any;

    if (!match) return ctx.notFound('Match not found');

    if (!match.league_player1 || !match.league_player2) {
      return ctx.badRequest('Match does not have both players populated.');
    }

    const [leaguePlayer] = await strapi.entityService.findMany('api::league-player.league-player', {
      filters: { player: { user: { id: userId } } },
    });

    if (!leaguePlayer) return ctx.badRequest('No LeaguePlayer found for this user');

    const isPlayerInMatch = [match.league_player1.id, match.league_player2.id].includes(leaguePlayer.id);
    if (!isPlayerInMatch) return ctx.unauthorized('You are not a participant in this match');

    const updatedMatch = await strapi.entityService.update('api::match.match', parseInt(matchId), {
      data: { score1, score2 },
    });

    ctx.body = { message: 'Match result reported successfully', match: updatedMatch };
  },

  async respondToProposal(ctx) {
    const matchId = ctx.params.id;
    const { action } = ctx.request.body;
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('You must be logged in.');

    if (!['accept', 'decline'].includes(action)) {
      return ctx.badRequest('Invalid action.');
    }

    const match = await strapi.entityService.findOne('api::match.match', parseInt(matchId), {
      populate: ['league_player1', 'league_player2'],
    }) as any;

    if (!match) return ctx.notFound('Match not found');

    const [leaguePlayer] = await strapi.entityService.findMany('api::league-player.league-player', {
      filters: { player: { user: { id: userId } } },
    });

    if (!leaguePlayer) return ctx.badRequest('No LeaguePlayer found for this user');

    const isPlayerInMatch = [match.league_player1?.id, match.league_player2?.id].includes(leaguePlayer.id);
    if (!isPlayerInMatch) return ctx.unauthorized('You are not a participant in this match');

    const updateData = action === 'accept'
      ? { proposalStatus: 'Accepted' as 'Accepted' }
      : { proposalStatus: 'Rejected' as 'Rejected', proposalTimestamp: null, proposedBy: null };

    const updatedMatch = await strapi.entityService.update('api::match.match', parseInt(matchId), {
      data: updateData,
    });

    ctx.body = { message: `Proposal ${action}ed successfully`, match: updatedMatch };
  },
}));
