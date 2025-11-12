/**
 * Script to fix all league player status values to 'active' if they're empty/null
 * Run this with: npm run strapi script fix-league-player-status.ts
 */

export default async ({ strapi }) => {
  console.log('🔍 Starting league player status fix script...');

  try {
    // Find all league players
    const allLeaguePlayers = await strapi.documents('api::league-player.league-player').findMany({
      fields: ['id', 'leagueName', 'firstName', 'lastName', 'status'],
      limit: -1 // Get all records
    });

    console.log(`📊 Found ${allLeaguePlayers.length} total league players`);

    let fixedCount = 0;
    let alreadyValidCount = 0;

    for (const leaguePlayer of allLeaguePlayers) {
      const currentStatus = leaguePlayer.status;
      const playerName = leaguePlayer.leagueName || `${leaguePlayer.firstName} ${leaguePlayer.lastName}` || 'Unknown';

      // Check if status is missing, empty, null, undefined, or not a valid enum value
      if (!currentStatus || currentStatus === '' || currentStatus === 'null' ||
          (currentStatus !== 'active' && currentStatus !== 'dropped')) {
        console.log(`🔧 Fixing ${playerName} (ID: ${leaguePlayer.id}) - status: "${currentStatus}" -> "active"`);

        try {
          await strapi.documents('api::league-player.league-player').update({
            documentId: leaguePlayer.documentId,
            data: {
              status: 'active'
            }
          });
          fixedCount++;
        } catch (error) {
          console.error(`❌ Failed to update ${playerName}:`, error.message);
        }
      } else {
        alreadyValidCount++;
      }
    }

    console.log('');
    console.log('✅ Script completed!');
    console.log(`   - Total records: ${allLeaguePlayers.length}`);
    console.log(`   - Already valid: ${alreadyValidCount}`);
    console.log(`   - Fixed: ${fixedCount}`);

  } catch (error) {
    console.error('❌ Script error:', error);
    throw error;
  }
};
