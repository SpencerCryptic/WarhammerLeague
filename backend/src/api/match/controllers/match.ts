import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::match.match', ({ strapi }) => ({

  async userMatches(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.unauthorized('You must be logged in.');
    }

    const player = await strapi.documents('api::player.player').findFirst({
      filters: {
        user: { id: userId }
      }
    });

    if (!player) {
      return ctx.body = { data: [] };
    }

    const leaguePlayers = await strapi.documents('api::league-player.league-player').findMany({
      filters: {
        player: { id: player.id }
      }
    });

    if (leaguePlayers.length === 0) {
      return ctx.body = { data: [] };
    }

    const leaguePlayerIds = leaguePlayers.map(lp => lp.id);

    const matches = await strapi.documents('api::match.match').findMany({
      filters: {
        $or: [
          { leaguePlayer1: { id: { $in: leaguePlayerIds } } },
          { leaguePlayer2: { id: { $in: leaguePlayerIds } } }
        ]
      },
      populate: {
        leaguePlayer1: true,
        leaguePlayer2: true,
        league: true
      }
    });

    ctx.body = { data: matches };
  },

  async findOne(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQueryParams = await this.sanitizeQuery(ctx);
    const { id } = ctx.params;
    const rawMatch = await strapi.documents('api::match.match').findOne({
      documentId: id,
      fields: [
        'proposalStatus',
        'proposalTimestamp',
        'matchUID',
        'createdAt',
        'updatedAt',
        'publishedAt',
        'leaguePlayer1Score',
        'leaguePlayer2Score',
        'leaguePlayer1Result',
        'leaguePlayer2Result',
        'statusMatch',
        'leaguePlayer1List',
        'leaguePlayer2List'
      ],
      populate: {
        leaguePlayer1: {
          fields: ['leagueName', 'faction', 'playList'],
          populate: ['player']
        },
        leaguePlayer2: {
          fields: ['leagueName', 'faction', 'playList'],
          populate: ['player']
        }
      }
    } as any)
    if (!rawMatch) {
      return ctx.notFound('Match not found')
    }
    ctx.body = { data: rawMatch };
  },

  async submit(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQueryParams = await this.sanitizeQuery(ctx);

    const matchId = ctx.params.id;
    const { 
      leaguePlayer1Score, 
      leaguePlayer2Score,
      leaguePlayer1BonusPoints = { lostButScored50Percent: false, scoredAllPrimaryObjectives: false },
      leaguePlayer2BonusPoints = { lostButScored50Percent: false, scoredAllPrimaryObjectives: false }
    } = ctx.request.body;

    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.unauthorized('You must be logged in.')
    };

    const match = await strapi.documents('api::match.match').findOne({
      documentId: matchId,
      populate: ['leaguePlayer1', 'leaguePlayer2', 'league'],
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

    // Get league scoring rules
    const league = await strapi.documents('api::league.league').findOne({
      documentId: match.league.documentId,
      fields: ['scoringRules', 'rulesetType']
    });

    const defaultRules = {
      gameWon: 3,
      gameDrawn: 1,
      gameLost: 0,
      bonusPoints: { lostButScored50Percent: 0, scoredAllPrimaryObjectives: 0 },
      maxPointsPerGame: 3
    };

    const scoringRules = (league?.scoringRules as any) || defaultRules;

    // Determine match result
    let matchResult;
    if (leaguePlayer1Score > leaguePlayer2Score) {
      matchResult = 'player1_win';
    } else if (leaguePlayer2Score > leaguePlayer1Score) {
      matchResult = 'player2_win';
    } else {
      matchResult = 'draw';
    }

    // Calculate league points based on scoring rules
    let player1LeaguePoints = 0;
    let player2LeaguePoints = 0;

    // Base points
    switch (matchResult) {
      case 'player1_win':
        player1LeaguePoints += scoringRules.gameWon;
        player2LeaguePoints += scoringRules.gameLost;
        break;
      case 'player2_win':
        player1LeaguePoints += scoringRules.gameLost;
        player2LeaguePoints += scoringRules.gameWon;
        break;
      case 'draw':
        player1LeaguePoints += scoringRules.gameDrawn;
        player2LeaguePoints += scoringRules.gameDrawn;
        break;
    }

    // Bonus points
    if (leaguePlayer1BonusPoints.lostButScored50Percent) {
      player1LeaguePoints += scoringRules.bonusPoints.lostButScored50Percent;
    }
    if (leaguePlayer1BonusPoints.scoredAllPrimaryObjectives) {
      player1LeaguePoints += scoringRules.bonusPoints.scoredAllPrimaryObjectives;
    }
    if (leaguePlayer2BonusPoints.lostButScored50Percent) {
      player2LeaguePoints += scoringRules.bonusPoints.lostButScored50Percent;
    }
    if (leaguePlayer2BonusPoints.scoredAllPrimaryObjectives) {
      player2LeaguePoints += scoringRules.bonusPoints.scoredAllPrimaryObjectives;
    }

    // Cap at max points per game
    player1LeaguePoints = Math.min(player1LeaguePoints, scoringRules.maxPointsPerGame);
    player2LeaguePoints = Math.min(player2LeaguePoints, scoringRules.maxPointsPerGame);

    const updatedMatch = await strapi.documents('api::match.match').update({
      documentId: matchId,
      data: { 
        leaguePlayer1Score,
        leaguePlayer2Score,
        leaguePlayer1List: match.leaguePlayer1.playList,
        leaguePlayer2List: match.leaguePlayer2.playList,
        leaguePlayer1Result: leaguePlayer1Score > leaguePlayer2Score ? 2 : leaguePlayer2Score > leaguePlayer1Score ? 0 : 1,
        leaguePlayer2Result: leaguePlayer2Score > leaguePlayer1Score ? 2 : leaguePlayer1Score > leaguePlayer2Score ? 0 : 1,
        leaguePlayer1BonusPoints,
        leaguePlayer2BonusPoints,
        leaguePlayer1LeaguePoints: player1LeaguePoints,
        leaguePlayer2LeaguePoints: player2LeaguePoints,
        matchResult,
        statusMatch: 'played'
      },
    });

    await strapi.documents('api::league-player.league-player').update({
      documentId: match.leaguePlayer1.documentId,
      data: {
        wins: match.leaguePlayer1.wins + (matchResult === 'player1_win' ? 1 : 0),
        draws: match.leaguePlayer1.draws + (matchResult === 'draw' ? 1 : 0),
        losses: match.leaguePlayer1.losses + (matchResult === 'player2_win' ? 1 : 0),
        rankingPoints: match.leaguePlayer1.rankingPoints + player1LeaguePoints
      }
    });
    await strapi.documents('api::league-player.league-player').update({
      documentId: match.leaguePlayer2.documentId,
      data: {
        wins: match.leaguePlayer2.wins + (matchResult === 'player2_win' ? 1 : 0),
        draws: match.leaguePlayer2.draws + (matchResult === 'draw' ? 1 : 0),
        losses: match.leaguePlayer2.losses + (matchResult === 'player1_win' ? 1 : 0),
        rankingPoints: match.leaguePlayer2.rankingPoints + player2LeaguePoints
      }
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
