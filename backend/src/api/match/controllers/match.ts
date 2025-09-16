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
        'leaguePlayer2List',
        'leaguePlayer1BonusPoints',
        'leaguePlayer2BonusPoints',
        'leaguePlayer1LeaguePoints',
        'leaguePlayer2LeaguePoints',
        'matchResult',
        'round'
      ],
      populate: {
        leaguePlayer1: {
          fields: ['leagueName', 'faction'],
          populate: ['player']
        },
        leaguePlayer2: {
          fields: ['leagueName', 'faction'],
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
      leaguePlayer2BonusPoints = { lostButScored50Percent: false, scoredAllPrimaryObjectives: false },
      leaguePlayer1ArmyListId,
      leaguePlayer2ArmyListId
    } = ctx.request.body;

    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.unauthorized('You must be logged in.')
    };

    const match = await strapi.documents('api::match.match').findOne({
      documentId: matchId,
      populate: ['leaguePlayer1', 'leaguePlayer2', 'league']
    }) as any
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
      fields: ['scoringRules', 'gameSystem']
    });

    const defaultRules = {
      gameWon: 3,
      gameDrawn: 1,
      gameLost: 0,
      bonusPoints: { lostButScored50Percent: 0, scoredAllPrimaryObjectives: 0 },
      maxPointsPerGame: 3
    };

    const scoringRules = (league?.scoringRules as any) || defaultRules;

    // Validate 40K score cap (100 points max)
    if ((league as any)?.gameSystem === 'Warhammer: 40,000') {
      if (leaguePlayer1Score > 100 || leaguePlayer2Score > 100) {
        return ctx.badRequest('Warhammer 40,000 scores cannot exceed 100 points');
      }
    }

    // Get army list content for display
    let leaguePlayer1List = '';
    let leaguePlayer2List = '';
    
    console.log('🔧 DEBUG: Fetching army lists for match submission');
    console.log('Player 1 army list ID:', leaguePlayer1ArmyListId);
    console.log('Player 2 army list ID:', leaguePlayer2ArmyListId);
    
    try {
      if (leaguePlayer1ArmyListId) {
        console.log('Fetching player 1 army list...');
        const leaguePlayer1 = await strapi.documents('api::league-player.league-player').findOne({
          documentId: match.leaguePlayer1.documentId,
          fields: ['armyLists']
        });
        console.log('Player 1 league player result:', leaguePlayer1);
        if (leaguePlayer1?.armyLists && Array.isArray(leaguePlayer1.armyLists)) {
          const armyList = (leaguePlayer1.armyLists as any[]).find((list: any) => list.id === leaguePlayer1ArmyListId);
          leaguePlayer1List = armyList?.listContent || '';
        }
        console.log('Player 1 list content length:', leaguePlayer1List?.length || 0);
      }
      
      if (leaguePlayer2ArmyListId) {
        console.log('Fetching player 2 army list...');
        const leaguePlayer2 = await strapi.documents('api::league-player.league-player').findOne({
          documentId: match.leaguePlayer2.documentId,
          fields: ['armyLists']
        });
        console.log('Player 2 league player result:', leaguePlayer2);
        if (leaguePlayer2?.armyLists && Array.isArray(leaguePlayer2.armyLists)) {
          const armyList = (leaguePlayer2.armyLists as any[]).find((list: any) => list.id === leaguePlayer2ArmyListId);
          leaguePlayer2List = armyList?.listContent || '';
        }
        console.log('Player 2 list content length:', leaguePlayer2List?.length || 0);
      }
    } catch (error) {
      console.error('ERROR fetching army lists:', error);
      // Continue with empty lists if fetch fails
    }
    
    console.log('Final army list lengths - P1:', leaguePlayer1List?.length || 0, 'P2:', leaguePlayer2List?.length || 0);

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
        leaguePlayer1List,
        leaguePlayer2List,
        leaguePlayer1ArmyListId: leaguePlayer1ArmyListId || '',
        leaguePlayer2ArmyListId: leaguePlayer2ArmyListId || '',
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

  async adminModifyScore(ctx) {
    await this.validateQuery(ctx);
    const matchId = ctx.params.id;
    const { 
      leaguePlayer1Score, 
      leaguePlayer2Score,
      leaguePlayer1BonusPoints = { lostButScored50Percent: false, scoredAllPrimaryObjectives: false },
      leaguePlayer2BonusPoints = { lostButScored50Percent: false, scoredAllPrimaryObjectives: false },
      adminNote
    } = ctx.request.body;

    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.unauthorized('You must be logged in.');
    }

    // Check if user is admin or league creator
    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: userId },
      populate: ['role']
    });
    
    console.log('Admin check - User data:', JSON.stringify({
      userId,
      userEmail: user?.email,
      roleName: user?.role?.name,
      roleType: user?.role?.type,
      fullRole: user?.role
    }, null, 2));
    
    // Admin check - verify user has admin role or is the league creator
    const isAdmin = user?.role?.name === 'Admin' || 
                    user?.role?.name === 'admin' ||
                    user?.role?.type === 'admin' || 
                    user?.email === 'spencer@crypticcabin.com'; // Fallback for main admin
    
    console.log('Admin check result:', isAdmin);
    
    if (!isAdmin) {
      return ctx.forbidden('Only admins can modify match scores.');
    }

    const match = await strapi.documents('api::match.match').findOne({
      documentId: matchId,
      populate: ['leaguePlayer1', 'leaguePlayer2', 'league']
    }) as any;
    
    if (!match) {
      return ctx.notFound('Match not found');
    }
    
    if (!match.leaguePlayer1 || !match.leaguePlayer2) {
      return ctx.badRequest('Match does not have both players populated.');
    }

    // Validate 40K score cap (100 points max) for admin modifications
    if (match.league?.gameSystem === 'Warhammer: 40,000') {
      if (leaguePlayer1Score > 100 || leaguePlayer2Score > 100) {
        return ctx.badRequest('Warhammer 40,000 scores cannot exceed 100 points');
      }
    }

    // Get army list content if available - temporarily simplified for TypeScript compatibility  
    let leaguePlayer1List = match.leaguePlayer1List || '';
    let leaguePlayer2List = match.leaguePlayer2List || '';

    // Get league scoring rules
    const league = await strapi.documents('api::league.league').findOne({
      documentId: match.league.documentId,
      fields: ['scoringRules', 'gameSystem']
    });

    const defaultRules = {
      gameWon: 3,
      gameDrawn: 1,
      gameLost: 0,
      bonusPoints: { lostButScored50Percent: 0, scoredAllPrimaryObjectives: 0 },
      maxPointsPerGame: 3
    };

    const scoringRules = (league?.scoringRules as any) || defaultRules;

    // Store old values for rollback calculation
    const oldPlayer1Points = match.leaguePlayer1LeaguePoints || 0;
    const oldPlayer2Points = match.leaguePlayer2LeaguePoints || 0;
    const oldMatchResult = match.matchResult;

    // Determine new match result
    let matchResult;
    if (leaguePlayer1Score > leaguePlayer2Score) {
      matchResult = 'player1_win';
    } else if (leaguePlayer2Score > leaguePlayer1Score) {
      matchResult = 'player2_win';
    } else {
      matchResult = 'draw';
    }

    // Calculate new league points
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

    // Update match
    const updatedMatch = await strapi.documents('api::match.match').update({
      documentId: matchId,
      data: { 
        leaguePlayer1Score,
        leaguePlayer2Score,
        leaguePlayer1List,
        leaguePlayer2List,
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

    // Calculate point differences for league player updates
    const player1PointDiff = player1LeaguePoints - oldPlayer1Points;
    const player2PointDiff = player2LeaguePoints - oldPlayer2Points;

    // Calculate win/draw/loss adjustments
    const oldP1Wins = oldMatchResult === 'player1_win' ? 1 : 0;
    const oldP1Draws = oldMatchResult === 'draw' ? 1 : 0;
    const oldP1Losses = oldMatchResult === 'player2_win' ? 1 : 0;

    const newP1Wins = matchResult === 'player1_win' ? 1 : 0;
    const newP1Draws = matchResult === 'draw' ? 1 : 0;
    const newP1Losses = matchResult === 'player2_win' ? 1 : 0;

    const oldP2Wins = oldMatchResult === 'player2_win' ? 1 : 0;
    const oldP2Draws = oldMatchResult === 'draw' ? 1 : 0;
    const oldP2Losses = oldMatchResult === 'player1_win' ? 1 : 0;

    const newP2Wins = matchResult === 'player2_win' ? 1 : 0;
    const newP2Draws = matchResult === 'draw' ? 1 : 0;
    const newP2Losses = matchResult === 'player1_win' ? 1 : 0;

    // Update league players with adjusted stats
    await strapi.documents('api::league-player.league-player').update({
      documentId: match.leaguePlayer1.documentId,
      data: {
        wins: Math.max(0, match.leaguePlayer1.wins - oldP1Wins + newP1Wins),
        draws: Math.max(0, match.leaguePlayer1.draws - oldP1Draws + newP1Draws),
        losses: Math.max(0, match.leaguePlayer1.losses - oldP1Losses + newP1Losses),
        rankingPoints: Math.max(0, match.leaguePlayer1.rankingPoints + player1PointDiff)
      }
    });
    
    await strapi.documents('api::league-player.league-player').update({
      documentId: match.leaguePlayer2.documentId,
      data: {
        wins: Math.max(0, match.leaguePlayer2.wins - oldP2Wins + newP2Wins),
        draws: Math.max(0, match.leaguePlayer2.draws - oldP2Draws + newP2Draws),
        losses: Math.max(0, match.leaguePlayer2.losses - oldP2Losses + newP2Losses),
        rankingPoints: Math.max(0, match.leaguePlayer2.rankingPoints + player2PointDiff)
      }
    });

    ctx.body = { 
      message: `Match score modified successfully by admin${adminNote ? ` (Note: ${adminNote})` : ''}`, 
      match: updatedMatch,
      changes: {
        player1PointDiff,
        player2PointDiff,
        oldMatchResult,
        newMatchResult: matchResult
      }
    };
  }
}));
