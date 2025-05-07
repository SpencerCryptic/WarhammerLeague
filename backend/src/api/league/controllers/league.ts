import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::league.league', ({ strapi }) => ({
  async create(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('You must be logged in to create a league');

    const { data } = ctx.request.body;

    const newLeague = await strapi.entityService.create('api::league.league', {
      data: {
        ...data,
        createdByUser: userId,
      },
    });

    ctx.body = {
      data: newLeague,
    };
  },

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
        leagueName: league.name, 
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

    const rawLeague = await strapi.entityService.findOne('api::league.league', parseInt(id), {
        ...( {
          fields: ['name', 'statusleague', 'description', 'leaguePassword', 'startDate'],
          populate: {
            createdByUser: { fields: ['id', 'username'] },
            league_players: {
              fields: ['faction'],
              populate: {
                player: {
                  fields: ['id', 'name'],
                },
                league: {
                  fields: ['id'],
                },
              },
            },
          },
        } as any)
      });      

    if (!rawLeague) return ctx.notFound('League not found');

    const league = rawLeague as any;

    const players = league.league_players?.filter((lp: any) => lp.league?.id === parseInt(id)).map((lp: any) => ({
      id: lp.player?.id,
      name: lp.player?.name,
      faction: lp.faction,
    })) || [];

    ctx.body = {
      data: {
        ...league,
        players,
      },
    };
  },

  async find(ctx) {
    const rawLeagues = await strapi.entityService.findMany('api::league.league', {
        ...( {
          fields: ['name', 'statusleague', 'description', 'leaguePassword', 'startDate'],
          populate: {
            createdByUser: { fields: ['id', 'username'] },
            league_players: {
              fields: ['faction'],
              populate: {
                player: { fields: ['id', 'name'] },
                league: { fields: ['id'] },
              },
            },
          },
        } as any)
      });
      

    const leagues = rawLeagues.map((league: any) => {
      const players = league.league_players?.filter((lp: any) => lp.league?.id === league.id).map((lp: any) => ({
        id: lp.player?.id,
        name: lp.player?.name,
        faction: lp.faction,
      })) || [];

      return {
        ...league,
        players,
      };
    });

    ctx.body = {
      data: leagues,
    };
  }
}));
