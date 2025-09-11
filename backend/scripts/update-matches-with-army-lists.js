const fs = require('fs');
const path = require('path');

// Simple script to update matches that have army list IDs but missing army list content
async function updateMatchesWithArmyLists() {
  try {
    // Load Strapi
    const { createStrapi } = require('@strapi/strapi');
    const strapi = await createStrapi().load();

    console.log('🚀 Starting army list content update for existing matches...');

    // Find all matches that have army list IDs but missing content
    const matches = await strapi.documents('api::match.match').findMany({
      filters: {
        $or: [
          {
            $and: [
              { leaguePlayer1ArmyListId: { $ne: null } },
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
              {
                $or: [
                  { leaguePlayer2List: { $null: true } },
                  { leaguePlayer2List: '' }
                ]
              }
            ]
          }
        ]
      }
    });

    console.log(`📋 Found ${matches.length} matches that need army list content updates`);

    let updatedCount = 0;
    
    for (const match of matches) {
      console.log(`\n🔧 Processing match ${match.documentId}...`);
      
      let leaguePlayer1List = match.leaguePlayer1List || '';
      let leaguePlayer2List = match.leaguePlayer2List || '';
      let needsUpdate = false;

      // Update player 1 army list if needed
      if (match.leaguePlayer1ArmyListId && (!leaguePlayer1List || leaguePlayer1List === '')) {
        try {
          const armyList1 = await strapi.documents('api::army-list.army-list').findOne({
            documentId: match.leaguePlayer1ArmyListId,
            fields: ['listContent']
          });
          if (armyList1?.listContent) {
            leaguePlayer1List = armyList1.listContent;
            needsUpdate = true;
            console.log(`  ✅ Found army list content for player 1: ${armyList1.listContent.substring(0, 50)}...`);
          } else {
            console.log(`  ❌ Could not find army list content for player 1 ID: ${match.leaguePlayer1ArmyListId}`);
          }
        } catch (error) {
          console.log(`  ❌ Error fetching player 1 army list: ${error.message}`);
        }
      }

      // Update player 2 army list if needed
      if (match.leaguePlayer2ArmyListId && (!leaguePlayer2List || leaguePlayer2List === '')) {
        try {
          const armyList2 = await strapi.documents('api::army-list.army-list').findOne({
            documentId: match.leaguePlayer2ArmyListId,
            fields: ['listContent']
          });
          if (armyList2?.listContent) {
            leaguePlayer2List = armyList2.listContent;
            needsUpdate = true;
            console.log(`  ✅ Found army list content for player 2: ${armyList2.listContent.substring(0, 50)}...`);
          } else {
            console.log(`  ❌ Could not find army list content for player 2 ID: ${match.leaguePlayer2ArmyListId}`);
          }
        } catch (error) {
          console.log(`  ❌ Error fetching player 2 army list: ${error.message}`);
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
          });
          updatedCount++;
          console.log(`  🎉 Successfully updated match ${match.documentId}`);
        } catch (error) {
          console.log(`  ❌ Error updating match ${match.documentId}: ${error.message}`);
        }
      } else {
        console.log(`  ⏭️  No updates needed for match ${match.documentId}`);
      }
    }

    console.log(`\n🎊 Script completed! Updated ${updatedCount} out of ${matches.length} matches.`);
    
    await strapi.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
updateMatchesWithArmyLists();