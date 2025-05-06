import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::league.league', ({ strapi }) => ({
  async joinLeague(ctx) {
    const { id: leagueId } = ctx.params;
    const { password, faction } = ctx.request.body;

    const league = await strapi.entityService.findOne('api::league.league', parseInt(leagueId, 10), {
      fields: ['leaguePassword'],
    });

    if (!league) return ctx.badRequest('League not found');
    if (league.leaguePassword && league.leaguePassword !== password) {
      return ctx.unauthorized('Incorrect password');
    }

    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('User not authenticated');

    const [player] = await strapi.entityService.findMany('api::player.player', {
      filters: { user: { id: userId } },
    });

    if (!player) return ctx.badRequest('No player linked to this user');

    const [existingLP] = await strapi.entityService.findMany('api::league-player.league-player', {
      filters: {
        player: { id: player.id },
        league: { id: parseInt(leagueId, 10) },
      },
    });

    if (existingLP) return ctx.badRequest('You have already joined this league');

    await strapi.entityService.create('api::league-player.league-player', {
      data: {
        player: player.id,
        league: parseInt(leagueId, 10),
        faction,
        wins: 0,
        draws: 0,
        losses: 0,
        rankingPoints: 0,
      },
    });

    ctx.send({ message: 'Joined league successfully' });
  },

  async findOne(ctx) {
    const { id } = ctx.params;

    const league = await strapi.entityService.findOne('api::league.league', parseInt(id, 10), {
      fields: ['name', 'statusleague', 'description', 'leaguePassword'],
      populate: {
        league_players: {
          populate: {
            player: {
              fields: ['id', 'name'],
            },
          },
        },
      },
    });

    if (!league) return ctx.notFound('League not found');

    const players = (league as any).league_players?.map((lp: any) => ({
      id: lp.player?.id,
      name: lp.player?.name,
      faction: lp.faction || 'Unknown',
    })) || [];

    ctx.body = {
      data: {
        ...league,
        players,
      },
    };
  }
}));
