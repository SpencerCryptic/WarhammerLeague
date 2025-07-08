import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::league.league', ({ strapi }) => ({

  async create(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQueryParams = await this.sanitizeQuery(ctx);
    const { results, pagination } = await strapi.service('api::league.league').create(sanitizedQueryParams);
    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.unauthorized('You must be logged in to create a league')
    };
    const data = {...ctx.request.body, createdByUser: userId};
    const newLeague = await strapi.documents('api::league.league').create({
      data: data
    });
    ctx.body = { data: newLeague };
  },

  async joinLeague(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQueryParams = await this.sanitizeQuery(ctx);
    console.log(1)
    const { id: leagueId } = ctx.params;
    const { password, faction, leagueName, goodFaithAccepted } = ctx.request.body;
    if (!leagueName || typeof leagueName !== "string") {
      return ctx.badRequest("League name is required and must be a string.");
    }
    if (goodFaithAccepted !== true) {
      return ctx.badRequest("You must agree to the good faith commitment.");
    }
    console.log(2)
    const league = await strapi.documents('api::league.league').findOne({
      documentId: leagueId,
      fields: ['leaguePassword'],
    });
    if (!league) {
      return ctx.badRequest('League not found');
    }
    if (league.leaguePassword && league.leaguePassword !== password) {
      return ctx.unauthorized('Incorrect password');
    }
    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.unauthorized('User not authenticated');
    }
    const [player] = await strapi.documents('api::player.player').findMany({
      filters: { user: { id: userId } }
    });
    if (!player) {
      return ctx.badRequest('No player linked to this user')
    };
    const [leaguePlayer] = await strapi.documents('api::league-player.league-player').findMany({
      filters: {
        $and: [
          { player: { documentId: player.documentId } },
          { league: { documentId: leagueId } },
        ]
      }
    });
    if (leaguePlayer) {
      return ctx.badRequest('You have already joined this league')
    };
    console.log(3)
    await strapi.documents('api::league-player.league-player').create({
      data: {
        player: player.documentId,
        league: leagueId,
        faction,
        leagueName,
        goodFaithAccepted,
        wins: 0,
        draws: 0,
        losses: 0,
        rankingPoints: 0,
      }
    });
    console.log(4)
    ctx.send({ message: 'Joined league successfully' });
  },

  async findOne(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQueryParams = await this.sanitizeQuery(ctx);
    const { id } = ctx.params;
    const rawLeague = await strapi.documents('api::league.league').findOne({
      documentId: id,
      ...( {
        fields: ['name', 'statusleague', 'description', 'leaguePassword', 'startDate', 'gameSystem'],
        populate: {
          createdByUser: { fields: ['id', 'username'] },
          league_players: {
            fields: ['leagueName', 'faction', 'wins', 'draws', 'losses', 'rankingPoints', 'playList'],
            populate: {
              player: { fields: ['id', 'name'] },
              league: { fields: ['id'] },
            },
          },
          matches: {
            fields: [
              'statusMatch',
              'leaguePlayer1List',
              'leaguePlayer2List',
              'leaguePlayer1Score',
              'leaguePlayer2Score',
              'leaguePlayer1Result',
              'leaguePlayer2Result',
              'proposalStatus',
              'proposalTimestamp',
              'matchUID'
            ],
            populate: {
              leaguePlayer1 : { fields: ['id', 'leagueName', 'faction'] },
              leaguePlayer2 : { fields: ['id', 'leagueName', 'faction'] },
              proposedBy : { fields: ['id', 'leagueName', 'faction'] },
            }
          }
        },
      } as any)
    });
    if (!rawLeague) {
      return ctx.notFound('League not found')
    }
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
    await this.validateQuery(ctx);
    const sanitizedQueryParams = await this.sanitizeQuery(ctx);
    const filters = ctx.query?.filters || {};
    const rawLeagues = await strapi.documents('api::league.league').findMany({
      filters,
      ...( {
        fields: ['name', 'statusleague', 'description', 'leaguePassword', 'startDate', 'gameSystem'],
        populate: {
          createdByUser: { fields: ['id', 'username'] },
          league_players: {
            fields: ['faction'],
            populate: {
              player: { fields: ['id', 'name'] },
              league: { fields: ['id'] }
            }
          }
        }
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
    await this.validateQuery(ctx);
    const sanitizedQueryParams = await this.sanitizeQuery(ctx);
    const { id: leagueId } = ctx.params;
    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.unauthorized('You must be logged in.')
    };
    const rawLeague = await strapi.documents('api::league.league').findOne({
      documentId: leagueId,
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
    const pairs = leaguePlayers.map( (v, i) => leaguePlayers.slice(i + 1).map(w => [v, w]) ).flat();
    pairs.forEach((pair: any) => {
      matchPromises.push(
          strapi.documents('api::match.match').create({
            data: {
              league: parseInt(leagueId),
              league_player1: pair[0].id,
              league_player2: pair[1].id,
              score1: 0,
              score2: 0,
              statusMatch: 'upcoming'
            }
          })
        );
    })
    await Promise.all(matchPromises);
    await strapi.documents('api::league.league').update({
      documentId: leagueId, 
      data: { statusleague: 'ongoing' }
    });
    ctx.body = { message: 'League started with matches generated.' };
  }
}));
