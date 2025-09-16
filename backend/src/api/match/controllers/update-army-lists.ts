/**
 * Custom controller to update existing matches with army list content
 * Call this endpoint: POST /api/matches/update-army-lists
 */

export default {
  async updateArmyLists(ctx: any) {
    try {
      console.log('🚀 Starting army list content update for existing matches...');

      // Find all matches that have army list IDs but missing content
      const matches = await strapi.documents('api::match.match').findMany({
        filters: {
          $or: [
            {
              $and: [
                { leaguePlayer1ArmyListId: { $ne: null } },
                { leaguePlayer1ArmyListId: { $ne: '' } },
                {
                  $or: [
                    { leaguePlayer1List: { $null: true } },
                    { leaguePlayer1List: '' }
                  ]
                }
              ]
            },
            {
              $and: [
                { leaguePlayer2ArmyListId: { $ne: null } },
                { leaguePlayer2ArmyListId: { $ne: '' } },
                {
                  $or: [
                    { leaguePlayer2List: { $null: true } },
                    { leaguePlayer2List: '' }
                  ]
                }
              ]
            }
          ]
        },
        populate: {
          leaguePlayer1: { fields: ['documentId'] },
          leaguePlayer2: { fields: ['documentId'] }
        }
      } as any);

      console.log(`📋 Found ${matches.length} matches that need army list content updates`);

      let updatedCount = 0;
      const results = [];
      
      for (const match of matches) {
        console.log(`\n🔧 Processing match ${match.documentId}...`);
        
        let leaguePlayer1List = match.leaguePlayer1List || '';
        let leaguePlayer2List = match.leaguePlayer2List || '';
        let needsUpdate = false;
        const matchResult: any = {
          matchId: match.documentId,
          player1Updated: false,
          player2Updated: false,
          errors: []
        };

        // Update player 1 army list if needed
        if (match.leaguePlayer1ArmyListId && (!leaguePlayer1List || leaguePlayer1List === '')) {
          try {
            // Get the league player with populated army lists
            const leaguePlayer1 = await strapi.documents('api::league-player.league-player').findOne({
              documentId: (match as any).leaguePlayer1.documentId,
              fields: ['armyLists']
            });
            
            if (leaguePlayer1?.armyLists && Array.isArray(leaguePlayer1.armyLists)) {
              const armyList = (leaguePlayer1.armyLists as any[]).find((list: any) => list.id === match.leaguePlayer1ArmyListId);
              if (armyList?.listContent) {
                leaguePlayer1List = armyList.listContent;
                needsUpdate = true;
                matchResult.player1Updated = true;
                console.log(`  ✅ Found army list content for player 1: ${armyList.listContent.substring(0, 50)}...`);
              } else {
                const error = `Could not find army list with ID ${match.leaguePlayer1ArmyListId} for player 1`;
                matchResult.errors.push(error);
                console.log(`  ❌ ${error}`);
              }
            } else {
              const error = `No army lists found for player 1`;
              matchResult.errors.push(error);
              console.log(`  ❌ ${error}`);
            }
          } catch (error: any) {
            const errorMsg = `Error fetching player 1 army list: ${error.message}`;
            matchResult.errors.push(errorMsg);
            console.log(`  ❌ ${errorMsg}`);
          }
        }

        // Update player 2 army list if needed
        if (match.leaguePlayer2ArmyListId && (!leaguePlayer2List || leaguePlayer2List === '')) {
          try {
            // Get the league player with populated army lists
            const leaguePlayer2 = await strapi.documents('api::league-player.league-player').findOne({
              documentId: (match as any).leaguePlayer2.documentId,
              fields: ['armyLists']
            });
            
            if (leaguePlayer2?.armyLists && Array.isArray(leaguePlayer2.armyLists)) {
              const armyList = (leaguePlayer2.armyLists as any[]).find((list: any) => list.id === match.leaguePlayer2ArmyListId);
              if (armyList?.listContent) {
                leaguePlayer2List = armyList.listContent;
                needsUpdate = true;
                matchResult.player2Updated = true;
                console.log(`  ✅ Found army list content for player 2: ${armyList.listContent.substring(0, 50)}...`);
              } else {
                const error = `Could not find army list with ID ${match.leaguePlayer2ArmyListId} for player 2`;
                matchResult.errors.push(error);
                console.log(`  ❌ ${error}`);
              }
            } else {
              const error = `No army lists found for player 2`;
              matchResult.errors.push(error);
              console.log(`  ❌ ${error}`);
            }
          } catch (error: any) {
            const errorMsg = `Error fetching player 2 army list: ${error.message}`;
            matchResult.errors.push(errorMsg);
            console.log(`  ❌ ${errorMsg}`);
          }
        }

        // Update the match if we found content
        if (needsUpdate) {
          try {
            await strapi.documents('api::match.match').update({
              documentId: match.documentId,
              data: {
                leaguePlayer1List,
                leaguePlayer2List
              }
            } as any);
            updatedCount++;
            matchResult.success = true;
            console.log(`  🎉 Successfully updated match ${match.documentId}`);
          } catch (error: any) {
            const errorMsg = `Error updating match ${match.documentId}: ${error.message}`;
            matchResult.errors.push(errorMsg);
            matchResult.success = false;
            console.log(`  ❌ ${errorMsg}`);
          }
        } else {
          matchResult.success = true;
          console.log(`  ⏭️  No updates needed for match ${match.documentId}`);
        }

        results.push(matchResult);
      }

      console.log(`\n🎊 Update completed! Updated ${updatedCount} out of ${matches.length} matches.`);

      return ctx.send({
        message: `Army list update completed successfully!`,
        summary: {
          totalMatches: matches.length,
          updatedMatches: updatedCount,
          skippedMatches: matches.length - updatedCount
        },
        results
      });

    } catch (error: any) {
      console.error('❌ Update failed:', error);
      return ctx.badRequest('Army list update failed', { error: error.message });
    }
  }
};