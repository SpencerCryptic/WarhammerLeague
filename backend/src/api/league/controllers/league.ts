import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::league.league', ({ strapi }) => ({

  async create(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.unauthorized('You must be logged in to create a league');
    }

    try {
      const requestData = ctx.request.body;

      const data = {
        ...requestData,
        createdByUser: userId,
      };

      // Create the league
      const newLeague = await strapi.documents('api::league.league').create({
        data: data
      });

      ctx.body = { data: newLeague };
    } catch (error) {
      console.error('Error creating league:', error);
      return ctx.badRequest(`Failed to create league: ${error.message}`);
    }
  },

  async joinLeague(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQueryParams = await this.sanitizeQuery(ctx);
    
    const { id: leagueId } = ctx.params;
    const { password, faction, leagueName, goodFaithAccepted } = ctx.request.body;
    
    if (!leagueName || typeof leagueName !== "string") {
      return ctx.badRequest("League name is required and must be a string.");
    }
    if (goodFaithAccepted !== true) {
      return ctx.badRequest("You must agree to the good faith commitment.");
    }

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
      return ctx.badRequest('No player linked to this user');
    }

    const [leaguePlayer] = await strapi.documents('api::league-player.league-player').findMany({
      filters: {
        $and: [
          { player: { documentId: player.documentId } },
          { league: { documentId: leagueId } },
        ]
      }
    });
    if (leaguePlayer) {
      return ctx.badRequest('You have already joined this league');
    }

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

    ctx.send({ message: 'Joined league successfully' });
  },

  async findOne(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQueryParams = await this.sanitizeQuery(ctx);
    const { id } = ctx.params;
    
    const rawLeague = await strapi.documents('api::league.league').findOne({
      documentId: id,
      ...( {
        fields: [
          'name',
          'statusleague',
          'description',
          'leaguePassword',
          'startDate',
          'gameSystem',
          'format'
        ],
        populate: {
          createdByUser: { fields: ['id', 'username'] },
          league_players: {
            fields: ['leagueName', 'faction', 'wins', 'draws', 'losses', 'rankingPoints', 'playList'],
            populate: {
              player: { fields: ['id', 'name', 'email'] },
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
      return ctx.notFound('League not found');
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
    return ctx.unauthorized('You must be logged in.');
  }

  console.log('🔍 Starting league with ID:', leagueId);

  const rawLeague = await strapi.documents('api::league.league').findOne({
    documentId: leagueId,
    populate: {
      createdByUser: true,
      league_players: {
        populate: { player: true },
      },
    },
  });

  const league = rawLeague as any;
  console.log('🔍 Found league:', league);
  
  if (!league) return ctx.notFound('League not found.');
  if (league.createdByUser?.id !== userId) {
    return ctx.unauthorized('Only the league admin can start the league.');
  }
  if (league.statusleague === 'ongoing') {
    return ctx.badRequest('League has already started.');
  }

  const leaguePlayers = league.league_players;
  console.log('🔍 League players:', leaguePlayers);
  
  if (leaguePlayers.length < 2) {
    return ctx.badRequest('At least two players required to start the league.');
  }

  const matchPromises = [];
  const pairs = leaguePlayers.map( (v, i) => leaguePlayers.slice(i + 1).map(w => [v, w]) ).flat();
  
  console.log('🔍 Creating matches for pairs:', pairs);

  pairs.forEach((pair: any) => {
    console.log('🔍 Creating match between:', pair[0].documentId, 'and', pair[1].documentId);
    
    matchPromises.push(
        strapi.documents('api::match.match').create({
          data: {
            // ✅ Fixed: Use documentId directly, not parseInt
            league: leagueId,
            // ✅ Fixed: Use correct field names from schema
            leaguePlayer1: pair[0].documentId,
            leaguePlayer2: pair[1].documentId,
            // ✅ Fixed: Remove score fields that don't exist in schema
            leaguePlayer1Score: 0,
            leaguePlayer2Score: 0,
            statusMatch: 'upcoming'
          }
        })
      );
  });

  try {
    console.log('🔍 Creating', matchPromises.length, 'matches...');
    await Promise.all(matchPromises);
    
    console.log('🔍 Updating league status to ongoing...');
    await strapi.documents('api::league.league').update({
      documentId: leagueId, 
      data: { statusleague: 'ongoing' }
    });

    console.log('✅ League started successfully!');
    ctx.body = { message: 'League started with matches generated.' };
  } catch (error) {
    console.error('❌ Error starting league:', error);
    return ctx.badRequest(`Failed to start league: ${error.message}`);
  }
}
}));