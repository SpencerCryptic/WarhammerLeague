import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::league.league', ({ strapi }) => ({

  async dashboard(ctx) {
    try {
      // Fetch upcoming leagues (planned status, limit 3)
      const upcomingLeagues = await strapi.documents('api::league.league').findMany({
        filters: { statusleague: 'planned' },
        limit: 3,
        fields: ['name', 'statusleague', 'description', 'startDate', 'gameSystem'],
        populate: {
          createdByUser: { fields: ['username'] },
          league_players: {
            fields: ['leagueName'],
            populate: {
              player: { fields: ['name'] }
            }
          }
        }
      });

      // Fetch current/ongoing leagues (ongoing status, limit 3)
      const currentLeagues = await strapi.documents('api::league.league').findMany({
        filters: { statusleague: 'ongoing' },
        limit: 3,
        fields: ['name', 'statusleague', 'description', 'startDate', 'gameSystem'],
        populate: {
          createdByUser: { fields: ['username'] },
          league_players: {
            fields: ['leagueName'],
            populate: {
              player: { fields: ['name'] }
            }
          }
        }
      });

      // Fetch top players aggregated from Player level
      const allLeaguePlayers = await strapi.documents('api::league-player.league-player').findMany({
        fields: ['wins', 'losses', 'draws', 'rankingPoints'],
        populate: {
          player: { fields: ['id', 'name'] }
        }
      });

      // Aggregate stats by player
      const playerStatsMap = new Map();
      allLeaguePlayers.forEach((lp: any) => {
        if (!lp.player?.id) return;

        const playerId = lp.player.id;
        const playerName = lp.player.name || 'Anonymous';

        if (!playerStatsMap.has(playerId)) {
          playerStatsMap.set(playerId, {
            id: playerId,
            name: playerName,
            totalWins: 0,
            totalLosses: 0,
            totalDraws: 0,
            totalPoints: 0,
            leagueCount: 0
          });
        }

        const stats = playerStatsMap.get(playerId);
        stats.totalWins += lp.wins || 0;
        stats.totalLosses += lp.losses || 0;
        stats.totalDraws += lp.draws || 0;
        stats.totalPoints += lp.rankingPoints || 0;
        stats.leagueCount += 1;
      });

      // Convert to array and sort by total points
      const topPlayers = Array.from(playerStatsMap.values())
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 3);

      // Get league stats
      const totalLeagues = await strapi.documents('api::league.league').count({});
      const activeLeagues = await strapi.documents('api::league.league').count({
        filters: { statusleague: 'ongoing' }
      });

      // Count unique users from the player stats we already aggregated
      const totalPlayers = playerStatsMap.size;

      ctx.body = {
        data: {
          upcomingLeagues,
          currentLeagues,
          topPlayers,
          stats: {
            totalLeagues,
            activeLeagues,
            totalPlayers
          }
        }
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return ctx.badRequest(`Failed to fetch dashboard data: ${error.message}`);
    }
  },

  async create(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.unauthorized('You must be logged in to create a league');
    }

    try {
      const requestBody = ctx.request.body;
      
      console.log('🔍 CREATE LEAGUE - Full request body:', JSON.stringify(requestBody, null, 2));
      console.log('🔍 CREATE LEAGUE - User ID:', userId);

      // Extract data from the nested structure if it exists
      const requestData = requestBody.data || requestBody;
      console.log('🔍 CREATE LEAGUE - Extracted data:', JSON.stringify(requestData, null, 2));


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
    const { password, faction, goodFaithAccepted } = ctx.request.body;

    if (goodFaithAccepted !== true) {
      return ctx.badRequest("You must agree to the good faith commitment.");
    }

    const league = await strapi.documents('api::league.league').findOne({
      documentId: leagueId,
      fields: ['leaguePassword', 'useOTP', 'gameSystem'],
    });
    
    if (!league) {
      return ctx.badRequest('League not found');
    }

    // Validate faction matches game system
    if (faction) {
      const validFactions = getFactionsForGameSystem(league.gameSystem);
      if (!validFactions.includes(faction)) {
        return ctx.badRequest(`Invalid faction "${faction}" for game system "${league.gameSystem}". Valid factions are: ${validFactions.join(', ')}`);
      }
    }

    // Handle password validation based on league type
    if (league.useOTP) {
      // For OTP-enabled leagues, check if the provided password is a valid OTP
      const [validOTP] = await strapi.documents('api::otp.otp').findMany({
        filters: {
          $and: [
            { league: { documentId: leagueId } },
            { code: password },
            { isUsed: false }
          ]
        }
      });
      
      if (!validOTP) {
        return ctx.unauthorized('Invalid or already used OTP');
      }
      
      // Mark the OTP as used
      await strapi.documents('api::otp.otp').update({
        documentId: validOTP.documentId,
        data: { isUsed: true }
      });
      
    } else if (league.leaguePassword && league.leaguePassword !== password) {
      // For regular leagues, check against the league password
      return ctx.unauthorized('Incorrect password');
    }

    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.unauthorized('User not authenticated');
    }

    // Find or create a player record for this user
    let [player] = await strapi.documents('api::player.player').findMany({
      filters: { user: { id: userId } }
    });
    
    if (!player) {
      // Create a player record for this user
      console.log('🔍 Creating player record for user:', userId);
      player = await strapi.documents('api::player.player').create({
        data: {
          user: userId,
          name: ctx.state.user.username || `Player${userId}`, // Use username as player name
          email: ctx.state.user.email || `player${userId}@example.com`
        }
      });
      console.log('✅ Created player record:', player.documentId);
    }

    // Check if player has already joined this league
    const [existingPlayer] = await strapi.documents('api::league-player.league-player').findMany({
      filters: {
        $and: [
          { player: { documentId: player.documentId } },
          { league: { documentId: leagueId } },
        ]
      }
    });
    if (existingPlayer) {
      return ctx.badRequest('You have already joined this league');
    }

    // Set leagueName to player's name (which is set from username)
    const leagueName = player.name || ctx.state.user.username || `Player${userId}`;

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
          'useOTP',
          'startDate',
          'gameSystem',
          'format'
        ],
        populate: {
          createdByUser: { fields: ['id', 'username'] },
          league_players: {
            fields: ['leagueName', 'faction', 'wins', 'draws', 'losses', 'rankingPoints', 'armyLists'],
            populate: {
              player: { 
                fields: ['id', 'name', 'email'],
                populate: {
                  user: { fields: ['id', 'username'] }
                }
              },
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
              'matchUID',
              'leaguePlayer1BonusPoints',
              'leaguePlayer2BonusPoints',
              'leaguePlayer1LeaguePoints',
              'leaguePlayer2LeaguePoints',
              'matchResult',
              'round'
            ],
            populate: {
              leaguePlayer1 : { fields: ['id', 'leagueName', 'faction'] },
              leaguePlayer2 : { fields: ['id', 'leagueName', 'faction'] }
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
        fields: ['name', 'statusleague', 'description', 'leaguePassword', 'useOTP', 'startDate', 'gameSystem'],
        populate: {
          createdByUser: { fields: ['id', 'username'] },
          league_players: {
            fields: ['faction', 'leagueName', 'wins', 'draws', 'losses', 'rankingPoints'],
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
  const numPlayers = leaguePlayers.length;
  const rounds = generateRoundRobinSchedule(leaguePlayers);
  
  console.log('🔍 Generated', rounds.length, 'rounds for', numPlayers, 'players');

  rounds.forEach((roundMatches, roundIndex) => {
    const roundNumber = roundIndex + 1;
    
    roundMatches.forEach((match) => {
      if (match.player1 && match.player2) {
        console.log('🔍 Creating match for round', roundNumber, ':', match.player1.leagueName, 'vs', match.player2.leagueName);
        
        matchPromises.push(
          strapi.documents('api::match.match').create({
            data: {
              league: leagueId,
              leaguePlayer1: match.player1.documentId,
              leaguePlayer2: match.player2.documentId,
              leaguePlayer1Score: 0,
              leaguePlayer2Score: 0,
              statusMatch: 'upcoming',
              round: roundNumber
            }
          })
        );
      }
    });
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
},

  async storeEvents(ctx) {
    console.log('🔍 Store events endpoint called');

    // Optional API key validation for Shopify
    const apiKey = ctx.request.headers['x-api-key'];
    const expectedKey = process.env.SHOPIFY_API_KEY;

    // Log API key attempt (for debugging)
    if (apiKey) {
      console.log('🔍 API key provided:', apiKey === expectedKey ? 'Valid' : 'Invalid');
    } else {
      console.log('🔍 No API key provided (public access)');
    }

    // For now, we allow access without API key, but you can uncomment this to require it:
    // if (expectedKey && apiKey !== expectedKey) {
    //   console.warn('❌ Invalid API key provided');
    //   return ctx.unauthorized('Invalid API key');
    // }

    try {
      let storeEvents = [];

      try {
        console.log('🔍 Attempting to fetch from Mahina API...');

        // First request to get total number of pages
        const firstResponse = await fetch('https://mahina.app/app/cryptic-cabin.myshopify.com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
            'Referer': 'https://mahina.app/preview',
            'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"'
          },
          body: JSON.stringify({
            "shop": "cryptic-cabin.myshopify.com",
            "selectedEventId": null,
            "selectedRecurringDate": null,
            "page": 1
          }),
          signal: AbortSignal.timeout(15000)
        });

        console.log(`🔍 Mahina API Response: ${firstResponse.status} ${firstResponse.statusText}`);

        if (firstResponse.ok) {
          const firstData = await firstResponse.json() as any;
          const totalPages = firstData.settings?.noOfPages || 1;
          console.log(`🔍 Total pages: ${totalPages}`);

          // Add events from first page
          let allEvents = transformMahinaEvents(firstData);

          // Fetch remaining pages if there are any
          if (totalPages > 1) {
            const pagePromises = [];
            for (let page = 2; page <= totalPages; page++) {
              console.log(`🔍 Fetching page ${page}/${totalPages}...`);
              pagePromises.push(
                fetch('https://mahina.app/app/cryptic-cabin.myshopify.com', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
                    'Referer': 'https://mahina.app/preview',
                    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"macOS"'
                  },
                  body: JSON.stringify({
                    "shop": "cryptic-cabin.myshopify.com",
                    "selectedEventId": null,
                    "selectedRecurringDate": null,
                    "page": page
                  }),
                  signal: AbortSignal.timeout(15000)
                }).then(res => res.json())
              );
            }

            const additionalPages = await Promise.all(pagePromises);
            additionalPages.forEach(pageData => {
              const pageEvents = transformMahinaEvents(pageData);
              allEvents = allEvents.concat(pageEvents);
            });
          }

          storeEvents = allEvents;
          console.log(`✅ Successfully processed ${storeEvents.length} events from Mahina (${totalPages} pages)`);

          // Sort events by date (earliest first)
          storeEvents.sort((a, b) => {
            const dateA = new Date(a.date || '9999-12-31');
            const dateB = new Date(b.date || '9999-12-31');
            return dateA.getTime() - dateB.getTime();
          });
        } else {
          const errorText = await firstResponse.text();
          console.warn(`❌ Mahina API failed: ${firstResponse.status} ${firstResponse.statusText}`);
          console.warn(`❌ Response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`);
          throw new Error(`Mahina API returned ${firstResponse.status}: ${firstResponse.statusText}`);
        }
      } catch (apiError) {
        if (apiError.name === 'AbortError') {
          console.warn('❌ Mahina API request timed out');
        } else if (apiError.code === 'ENOTFOUND') {
          console.warn('❌ Could not connect to Mahina API - DNS/network issue');
        } else {
          console.warn('❌ Mahina API error:', apiError.message);
        }

        // Return empty array with proper success response
        storeEvents = [];
      }

      // Always return a successful response with data array
      ctx.body = {
        data: storeEvents, // Return all events (no artificial limit)
        meta: {
          source: storeEvents.length > 0 ? 'mahina' : 'empty',
          count: storeEvents.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Critical error in storeEvents controller:', error);
      
      // Return empty array instead of error to prevent frontend breaking
      ctx.body = {
        data: [],
        meta: {
          source: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  },

  async userLeagues(ctx) {
    console.log('🔍 User leagues endpoint called');
    const userId = ctx.state.user?.id;
    console.log('🔍 User ID:', userId);
    
    if (!userId) {
      console.log('❌ No user ID found');
      return ctx.unauthorized('User not authenticated');
    }

    try {
      // For now, return a simple response to test if the endpoint works
      ctx.body = {
        data: [],
        debug: {
          userId: userId,
          message: 'User leagues endpoint working'
        }
      };
    } catch (error) {
      console.error('❌ Error in userLeagues:', error);
      return ctx.badRequest(`Failed to fetch user leagues: ${error.message}`);
    }
  },

  async transferPlayer(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        return ctx.unauthorized('You must be logged in to transfer players');
      }

      const { leaguePlayerId, targetLeagueId } = ctx.request.body;

      if (!leaguePlayerId || !targetLeagueId) {
        return ctx.badRequest('League player ID and target league ID are required');
      }

      // Get the league player to transfer
      const leaguePlayer = await strapi.documents('api::league-player.league-player').findOne({
        documentId: leaguePlayerId,
        populate: ['league', 'player']
      });

      if (!leaguePlayer) {
        return ctx.notFound('League player not found');
      }

      // Get the target league with createdByUser populated
      const targetLeague = await strapi.documents('api::league.league').findOne({
        documentId: targetLeagueId,
        populate: ['createdByUser']
      });

      if (!targetLeague) {
        return ctx.notFound('Target league not found');
      }

      // Get source league details
      const sourceLeague = await strapi.documents('api::league.league').findOne({
        documentId: typeof leaguePlayer.league === 'string' ? leaguePlayer.league : leaguePlayer.league.documentId,
        populate: ['createdByUser']
      });

      // Check if user is admin of the source league
      const isSourceLeagueAdmin = sourceLeague?.createdByUser?.id === ctx.state.user?.id;
      // Check if user is admin of the target league  
      const isTargetLeagueAdmin = targetLeague?.createdByUser?.id === ctx.state.user?.id;

      if (!isSourceLeagueAdmin && !isTargetLeagueAdmin) {
        return ctx.forbidden('You must be admin of either the source or target league');
      }

      // Check if player is already in target league
      const playerId = typeof leaguePlayer.player === 'string' ? leaguePlayer.player : leaguePlayer.player.documentId;
      const existingPlayerInTarget = await strapi.documents('api::league-player.league-player').findMany({
        filters: {
          $and: [
            { league: { documentId: targetLeagueId } },
            { player: { documentId: playerId } }
          ]
        }
      });

      if (existingPlayerInTarget.length > 0) {
        return ctx.badRequest('Player is already in the target league');
      }

      // Update the league player's league reference
      await strapi.documents('api::league-player.league-player').update({
        documentId: leaguePlayerId,
        data: {
          league: targetLeagueId
        }
      });

      // Get player and league names for response
      const playerDoc = await strapi.documents('api::player.player').findOne({
        documentId: playerId
      });

      return ctx.send({
        message: `Successfully transferred ${playerDoc?.name || 'Player'} from ${sourceLeague?.name || 'Source League'} to ${targetLeague?.name || 'Target League'}`,
        data: {
          leaguePlayer: leaguePlayerId,
          sourceLeague: sourceLeague?.name,
          targetLeague: targetLeague?.name,
          playerName: playerDoc?.name
        }
      });

    } catch (error) {
      console.error('Error transferring player:', error);
      return ctx.badRequest(`Failed to transfer player: ${error.message}`);
    }
  },

}));

// Helper functions outside the controller
function transformMahinaEvents(mahinaData: any) {
    try {
      console.log('🔍 Raw Mahina response structure:', JSON.stringify(mahinaData, null, 2));
      
      // Handle different possible response structures
      let events = [];
      if (mahinaData?.events) {
        events = mahinaData.events;
      } else if (mahinaData?.data?.events) {
        events = mahinaData.data.events;
      } else if (Array.isArray(mahinaData)) {
        events = mahinaData;
      } else if (mahinaData?.results) {
        events = mahinaData.results;
      } else {
        console.warn('❌ Unexpected Mahina response structure:', Object.keys(mahinaData || {}));
        return [];
      }

      console.log(`🔍 Processing ${events.length} events from Mahina`);

      return events.map((event: any, index: number) => {
        try {
          // More flexible field mapping
          const title = event.title || event.name || event.summary || `Event ${index + 1}`;
          
          // Clean HTML from description and truncate properly
          let description = event.description || event.summary || event.details || 'Join us for this exciting gaming event!';
          // Strip HTML tags for cleaner display
          description = description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          // Truncate with proper word boundaries
          if (description.length > 150) {
            description = description.substring(0, 147).trim() + '...';
          }
          
          // Try multiple possible date fields
          const rawDate = event.startDate || event.start_time || event.start || event.date || event.dateTime;
          const date = formatEventDate(rawDate);
          
          // Try multiple location field patterns
          const location = determineLocation(event.location || event.venue || '');
          
          // Use tags from Mahina API for more accurate categorization
          const gameType = determineGameTypeFromTags(event.tags, title, description);
          const color = getColorForGameType(gameType);

          // Get Shopify URL from tickets
          let shopifyUrl = '';
          if (event.tickets?.active && event.tickets?.medium?.handle) {
            shopifyUrl = `https://crypticcabin.com/products/${event.tickets.medium.handle}`;
          }

          const processedEvent = {
            title: title,
            date: date,
            location: location,
            description: description,
            color: color,
            gameType: gameType,
            image: event.image || '',
            shopifyUrl: shopifyUrl
          };

          console.log(`✅ Processed event: ${processedEvent.title} - ${processedEvent.date} - ${processedEvent.location} (${processedEvent.gameType})`);
          return processedEvent;
        } catch (eventError) {
          console.warn(`❌ Error processing event ${index}:`, eventError, event);
          return null;
        }
      }).filter(Boolean); // Remove null events
    } catch (error) {
      console.error('❌ Error transforming Mahina events:', error);
      return [];
    }
}

function determineGameTypeFromTags(tags: any[], title: string, description: string) {
    // Use Mahina tags for primary categorization
    if (tags && Array.isArray(tags)) {
      const tagTitles = tags.map(tag => tag.title?.toLowerCase()).filter(Boolean);
      
      // Check for specific tag-based categories
      if (tagTitles.includes('tcg')) {
        return 'TCG';
      }
      if (tagTitles.includes('class')) {
        return 'Workshop';
      }
      if (tagTitles.includes('table top game')) {
        return 'Table Top Game';
      }
    }
    
    // Fallback to content-based detection if no matching tags
    return determineGameType(title, description);
}

function determineGameType(title: string, description: string) {
    const text = (title + ' ' + description).toLowerCase();
    
    // TCG detection - more comprehensive
    if (text.includes('pokemon') || text.includes('pokémon') || text.includes('mtg') || 
        text.includes('magic') || text.includes('flesh') || text.includes('blood') ||
        text.includes('yu-gi-oh') || text.includes('yugioh') || text.includes('final fantasy') ||
        text.includes('tcg') || text.includes('draft') || text.includes('booster')) {
      return 'TCG';
    }
    
    // Workshop/Class detection
    if (text.includes('paint') || text.includes('class') || text.includes('workshop') || 
        text.includes('learn') || text.includes('miniatures') || text.includes('faces 101')) {
      return 'Workshop';
    }
    
    // Miniatures games detection
    if (text.includes('warhammer') || text.includes('40k') || text.includes('aos') || 
        text.includes('song of ice') || text.includes('fire') || text.includes('miniature')) {
      return 'Miniatures';
    }
    
    // Board games detection
    if (text.includes('board game') || text.includes('social')) {
      return 'Board Games';
    }
    
    return 'Mixed';
}

function determineLocation(venue: string | { name?: string } | any) {
    // Handle different venue types
    const venueName = typeof venue === 'string' ? venue : (venue?.name || '');
    const venueText = venueName.toLowerCase();
    if (venueText.includes('bristol')) return 'Bristol';
    if (venueText.includes('bracknell')) return 'Bracknell';
    return 'Bristol'; // Default to Bristol
}

function formatEventDate(dateString: string) {
    try {
      if (!dateString) return 'Date TBD';
      
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Date TBD';
      }
      
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true,
        timeZone: 'Europe/London'  // Match the timezone from Mahina
      };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      return 'Date TBD';
    }
}

function getColorForGameType(gameType: string) {
    const colorMap = {
      'TCG': 'blue-500',
      'Miniatures': 'green-500',
      'Workshop': 'orange-500',
      'Table Top Game': 'purple-500',
      'Board Games': 'purple-500',
      'Mixed': 'gray-500'
    };
    return colorMap[gameType as keyof typeof colorMap] || 'gray-500';
}

function getFactionsForGameSystem(gameSystem: string): string[] {
  const factionMap: Record<string, string[]> = {
    'A Song of Ice and Fire': [
      'Stark',
      'Lannister',
      'Free Folk',
      'Nights Watch',
      'Baratheon',
      'Targaryen',
      'Greyjoy',
      'Martell',
      'Bolton',
      'Brotherhood Without Banners',
      'Neutral'
    ],
    'Warhammer: The Horus Heresy': [
      'Dark Angels',
      'White Scars',
      'Space Wolves',
      'Imperial Fists',
      'Blood Angels',
      'Iron Hands',
      'Ultramarines',
      'Salamanders',
      'Raven Guard',
      'Sons of Horus',
      'World Eaters',
      "Emperor's Children",
      'Death Guard',
      'Thousand Sons',
      'Word Bearers',
      'Iron Warriors',
      'Night Lords',
      'Alpha Legion',
      'Mechanicum',
      'Legio Custodes',
      'Sisters of Silence',
      'Solar Auxilia',
      'Imperialis Auxilia',
      'Questoris Knights',
      'Daemons of the Ruinstorm',
      'Blackshields'
    ]
  };

  return factionMap[gameSystem] || [];
}

function generateRoundRobinSchedule(players: any[]) {
  const numPlayers = players.length;
  const rounds = [];

  if (numPlayers < 2) return rounds;

  let playerList = [...players];

  if (numPlayers % 2 === 1) {
    playerList.push(null);
  }

  const numRounds = playerList.length - 1;
  const matchesPerRound = playerList.length / 2;

  for (let round = 0; round < numRounds; round++) {
    const roundMatches = [];

    for (let match = 0; match < matchesPerRound; match++) {
      const player1Index = match;
      const player2Index = playerList.length - 1 - match;

      const player1 = playerList[player1Index];
      const player2 = playerList[player2Index];

      if (player1 && player2) {
        roundMatches.push({
          player1,
          player2
        });
      }
    }

    rounds.push(roundMatches);

    const fixed = playerList[0];
    const rotating = playerList.slice(1);
    rotating.unshift(rotating.pop());
    playerList = [fixed, ...rotating];
  }

  return rounds;
}