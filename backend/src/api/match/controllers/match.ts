import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::match.match', ({ strapi }) => ({
  async report(ctx) {
    const matchId = ctx.params.id;
    const { score1, score2 } = ctx.request.body;
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('You must be logged in.');

    // Find the match and populate league players
    const match = await strapi.entityService.findOne('api::match.match', parseInt(matchId), {
        populate: ['league_player1', 'league_player2'],
      }) as any;
      
      
      if (!match) return ctx.notFound('Match not found');
      
      // Check both sides populated
      if (!match.league_player1 || !match.league_player2) {
        return ctx.badRequest('Match does not have both players populated.');
      }
      
      const [leaguePlayer] = await strapi.entityService.findMany('api::league-player.league-player', {
        filters: { player: { user: { id: userId } } },
      });
      
      if (!leaguePlayer) return ctx.badRequest('No LeaguePlayer found for this user');
      
      const isPlayerInMatch = [match.league_player1.id, match.league_player2.id].includes(leaguePlayer.id);
      if (!isPlayerInMatch) return ctx.unauthorized('You are not a participant in this match');
      
    // Update the match result
    const updatedMatch = await strapi.entityService.update('api::match.match', parseInt(matchId), {
      data: { score1, score2 },
    });

    ctx.body = { message: 'Match result reported successfully', match: updatedMatch };
  },
}));
