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

    ctx.body = { data: newLeague };
  },

  async joinLeague(ctx) {
    const { id: leagueId } = ctx.params;
    const { password, faction, leagueName, goodFaithAccepted } = ctx.request.body;

    if (!leagueName || typeof leagueName !== "string") {
      return ctx.badRequest("League name is required and must be a string.");
    }
    if (goodFaithAccepted !== true) {
      return ctx.badRequest("You must agree to the good faith commitment.");
    }

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
        leagueName,
        goodFaithAccepted,
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
              player: { fields: ['id', 'name'] },
              league: { fields: ['id'] },
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

    ctx.body = { data: leagues };
  },

  async start(ctx) {
    const { id: leagueId } = ctx.params;
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('You must be logged in.');
  
    const rawLeague = await strapi.entityService.findOne('api::league.league', parseInt(leagueId), {
      populate: {
        createdByUser: true,
        league_players: {
          populate: { player: true },
        },
      },
    });
  
    const league = rawLeague as any; // ✅ Cast to any
  
    if (!league) return ctx.notFound('League not found.');
    if (league.createdByUser?.id !== userId) {
      return ctx.unauthorized('Only the league admin can start the league.');
    }
    if (league.statusleague === 'ongoing') {
      return ctx.badRequest('League has already started.');
    }
  
    const leaguePlayers = league.league_players;
    if (leaguePlayers.length < 2) {
      return ctx.badRequest('At least two players required to start the league.');
    }
  
    const matchPromises = [];
  
    for (let i = 0; i < leaguePlayers.length; i++) {
      for (let j = i + 1; j < leaguePlayers.length; j++) {
        const player1 = leaguePlayers[i];
        const player2 = leaguePlayers[j];
  
        matchPromises.push(
          strapi.entityService.create('api::match.match', {
            data: {
              league: parseInt(leagueId),
              league_player1: player1.id,
              league_player2: player2.id,
              score1: 0,
              score2: 0,
            },
          })
        );
      }
    }
  
    await Promise.all(matchPromises);
  
    await strapi.entityService.update('api::league.league', parseInt(leagueId), {
      data: { statusleague: 'ongoing' },
    });
  
    ctx.body = { message: 'League started with matches generated.' };
  }
  

}));
