const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:1337';

async function createKnockoutTournament() {
  console.log('🏆 Creating knockout tournament from source leagues...');
  
  // Load test data
  const testUsers = JSON.parse(fs.readFileSync('./test-users-data.json', 'utf8'));
  const sourceLeagues = JSON.parse(fs.readFileSync('./source-leagues-data.json', 'utf8'));
  
  // Use the first user's token for creating the tournament
  const firstUser = testUsers[0];
  
  console.log(`📊 Source leagues summary:`);
  sourceLeagues.forEach(league => {
    console.log(`  - ${league.name}: ${league.league_players.length} players`);
  });
  
  const totalPlayers = sourceLeagues.reduce((sum, league) => sum + league.league_players.length, 0);
  console.log(`🎯 Total players: ${totalPlayers} (Perfect power of 2: ${totalPlayers === 16 ? '✅' : '❌'})`);
  
  try {
    console.log(`\n🚀 Creating knockout tournament...`);
    
    const tournamentData = {
      name: 'Ultimate Warhammer Championship - 16 Player Finals',
      description: 'Epic 16-player single elimination tournament featuring the best warriors from two completed leagues',
      gameSystem: 'Warhammer: 40,000',
      sourceLeagueIds: sourceLeagues.map(league => league.documentId),
      format: 'single_elimination'
    };
    
    console.log('📤 Tournament data:', JSON.stringify(tournamentData, null, 2));
    
    const response = await axios.post(`${API_URL}/api/leagues/create-knockout-tournament`, tournamentData, {
      headers: {
        'Authorization': `Bearer ${firstUser.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🎉 Tournament created successfully!');
    console.log('📋 Tournament details:');
    console.log(`  - ID: ${response.data.data.id}`);
    console.log(`  - Document ID: ${response.data.data.documentId}`);
    console.log(`  - Name: ${response.data.data.name}`);
    console.log(`  - Format: ${response.data.data.format}`);
    console.log(`  - Status: ${response.data.data.statusleague}`);
    console.log(`  - Players: ${response.data.data.league_players?.length || 0}`);
    console.log(`  - Matches: ${response.data.data.matches?.length || 0}`);
    
    if (response.data.data.bracketData) {
      console.log(`  - Bracket rounds: ${response.data.data.bracketData.rounds}`);
      console.log(`  - Bracket generated: ${response.data.data.bracketData.isGenerated ? '✅' : '❌'}`);
    }
    
    // Save tournament data for frontend testing
    fs.writeFileSync('./knockout-tournament-data.json', JSON.stringify(response.data.data, null, 2));
    console.log('💾 Tournament data saved to knockout-tournament-data.json');
    
    return response.data.data;
    
  } catch (error) {
    console.error('❌ Failed to create knockout tournament:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.log('📝 Full error response:', JSON.stringify(error.response.data, null, 2));
    }
    
    throw error;
  }
}

// Run the script
createKnockoutTournament().catch(console.error);