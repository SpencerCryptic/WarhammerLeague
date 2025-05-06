import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::league.league', ({ strapi }) => ({
  async joinLeague(ctx) {
    const { id: leagueId } = ctx.params;
    const { password, faction } = ctx.request.body;

    const league = await strapi.entityService.findOne('api::league.league', parseInt(leagueId), {
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
        $and: [
          { player: { id: player.id } },
          { league: { id: parseInt(leagueId) } },
        ],
      },
    });

    if (existingLP) return ctx.badRequest('You have already joined this league');

    await strapi.entityService.create('api::league-player.league-player', {
      data: {
        player: player.id,
        league: parseInt(leagueId),
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

    const league = await strapi.entityService.findOne('api::league.league', parseInt(id), {
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

    const leagueAny = league as any;
    const players = (leagueAny.league_players || []).map((lp: any) => ({
      id: lp.player?.id,
      name: lp.player?.name,
      faction: lp.faction,
    }));
    

    ctx.body = {
      data: {
        ...league,
        players,
      },
    };
  }
}));
