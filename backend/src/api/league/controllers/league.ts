import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::league.league', ({ strapi }) => ({
  async joinLeague(ctx) {
    const { id } = ctx.params;
    const { password } = ctx.request.body;

    const league = await strapi.entityService.findOne('api::league.league', id, {
      fields: ['leaguePassword'],
    });

    if (!league) {
      return ctx.badRequest('League not found');
    }

    if (league.leaguePassword && league.leaguePassword !== password) {
      return ctx.unauthorized('Incorrect password');
    }

    const userId = ctx.state.user.id;

    // Optional: Check if user already joined the league via a Player record
    const existingPlayer = await strapi.entityService.findMany('api::player.player', {
      filters: {
        user: userId,
        league: id,
      },
    });

    if (existingPlayer.length > 0) {
      return ctx.badRequest('User already joined this league');
    }

    await strapi.entityService.create('api::player.player', {
      data: {
        user: userId,
        league: id,
        name: ctx.state.user.username || 'Anonymous',
        faction: 'Unknown',
        ranking: 0,
      },
    });

    ctx.send({ message: 'Joined league successfully' });
  },
}));
