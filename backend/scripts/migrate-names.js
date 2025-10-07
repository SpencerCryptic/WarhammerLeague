const fetch = require('node-fetch');

const API_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com/api';

async function migrateNames() {
  try {
    // Fetch all league players with their related player and user data
    const response = await fetch(`${API_URL}/league-players?populate[player][populate]=user`);
    const data = await response.json();
    
    if (!data.data) {
      console.log('No league players found');
      return;
    }
    
    console.log(`Found ${data.data.length} league players to migrate`);
    
    for (const leaguePlayer of data.data) {
      console.log(`Processing ${leaguePlayer.leagueName}:`);
      console.log('  Player:', leaguePlayer.player);
      console.log('  User:', leaguePlayer.player?.user);
      
      const firstName = leaguePlayer.player?.user?.firstName;
      const lastName = leaguePlayer.player?.user?.lastName;
      
      console.log(`  firstName: "${firstName}", lastName: "${lastName}"`);
      
      if (firstName && lastName) {
        console.log(`Updating ${leaguePlayer.leagueName} with ${firstName} ${lastName}`);
        
        // Update the league player with firstName and lastName
        const updateResponse = await fetch(`${API_URL}/league-players/${leaguePlayer.documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              firstName: firstName,
              lastName: lastName
            }
          })
        });
        
        if (updateResponse.ok) {
          console.log(`✅ Updated ${leaguePlayer.leagueName}`);
        } else {
          const errorText = await updateResponse.text();
          console.error(`❌ Failed to update ${leaguePlayer.leagueName}:`, errorText);
        }
      } else {
        console.log(`⚠️  Skipping ${leaguePlayer.leagueName} - missing firstName or lastName`);
      }
      console.log('---');
    }
    
    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateNames();