/**
 * Script to retroactively populate firstName and lastName for existing LeaguePlayer records
 * Run with: node scripts/populate-league-player-names.js
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'https://accessible-positivity-e213bb2958.strapiapp.com';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

async function populateLeaguePlayerNames() {
  console.log('🔍 Starting to populate LeaguePlayer firstName/lastName fields...\n');

  try {
    // Fetch all league players with their player and user relationships
    const response = await axios.get(`${API_URL}/api/league-players`, {
      params: {
        populate: {
          player: {
            populate: ['user']
          }
        },
        pagination: {
          pageSize: 1000
        }
      },
      headers: API_TOKEN ? {
        'Authorization': `Bearer ${API_TOKEN}`
      } : {}
    });

    const leaguePlayers = response.data.data;
    console.log(`📊 Found ${leaguePlayers.length} league players\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const leaguePlayer of leaguePlayers) {
      const lpId = leaguePlayer.documentId || leaguePlayer.id;
      const leagueName = leaguePlayer.leagueName;

      // Check if firstName and lastName are already populated
      if (leaguePlayer.firstName && leaguePlayer.lastName) {
        console.log(`⏭️  Skipping ${leagueName} (already has firstName and lastName)`);
        skippedCount++;
        continue;
      }

      // Get user data through player relationship
      const user = leaguePlayer.player?.user;

      if (!user || !user.firstName || !user.lastName) {
        console.log(`⚠️  Warning: ${leagueName} - No user data or missing firstName/lastName`);
        skippedCount++;
        continue;
      }

      // Update the league player with firstName and lastName
      try {
        await axios.put(
          `${API_URL}/api/league-players/${lpId}`,
          {
            data: {
              firstName: user.firstName,
              lastName: user.lastName
            }
          },
          {
            headers: API_TOKEN ? {
              'Authorization': `Bearer ${API_TOKEN}`,
              'Content-Type': 'application/json'
            } : {
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`✅ Updated ${leagueName} with ${user.firstName} ${user.lastName}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating ${leagueName}:`, error.response?.data || error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${leaguePlayers.length}`);

  } catch (error) {
    console.error('❌ Error fetching league players:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the script
populateLeaguePlayerNames()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
