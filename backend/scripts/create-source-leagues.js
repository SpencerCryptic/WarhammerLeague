const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:1337';

async function createSourceLeagues() {
  console.log('🏆 Creating two mock 8-player source leagues...');
  
  // Since we're having API issues, let's create mock league data
  // that represents completed leagues for testing the knockout tournament
  const testUsers = JSON.parse(fs.readFileSync('./test-users-data.json', 'utf8'));
  
  const mockLeagues = [
    {
      id: 100, // Mock ID
      documentId: 'test-league-1-mock',
      name: 'Imperium League - Test League 1',
      statusleague: 'completed',
      gameSystem: 'Warhammer: 40,000',
      format: 'round_robin',
      league_players: testUsers.slice(0, 8).map((user, index) => ({
        id: 100 + index,
        documentId: `player-${100 + index}`,
        leagueName: user.leagueName,
        faction: user.faction,
        wins: Math.floor(Math.random() * 5),
        draws: Math.floor(Math.random() * 2),
        losses: Math.floor(Math.random() * 3),
        rankingPoints: Math.floor(Math.random() * 20),
        player: {
          id: user.id,
          documentId: `doc-${user.id}`,
          name: user.username
        }
      })),
      playerCount: 8
    },
    {
      id: 200, // Mock ID
      documentId: 'test-league-2-mock',
      name: 'Chaos & Xenos League - Test League 2',
      statusleague: 'completed',
      gameSystem: 'Warhammer: 40,000',
      format: 'round_robin',
      league_players: testUsers.slice(8, 16).map((user, index) => ({
        id: 200 + index,
        documentId: `player-${200 + index}`,
        leagueName: user.leagueName,
        faction: user.faction,
        wins: Math.floor(Math.random() * 5),
        draws: Math.floor(Math.random() * 2),
        losses: Math.floor(Math.random() * 3),
        rankingPoints: Math.floor(Math.random() * 20),
        player: {
          id: user.id,
          documentId: `doc-${user.id}`,
          name: user.username
        }
      })),
      playerCount: 8
    }
  ];
  
  console.log(`\n🎮 Mock League 1: ${mockLeagues[0].name}`);
  mockLeagues[0].league_players.forEach(player => {
    console.log(`  - ${player.leagueName} (${player.faction}): ${player.wins}W-${player.draws}D-${player.losses}L`);
  });
  
  console.log(`\n🎮 Mock League 2: ${mockLeagues[1].name}`);
  mockLeagues[1].league_players.forEach(player => {
    console.log(`  - ${player.leagueName} (${player.faction}): ${player.wins}W-${player.draws}D-${player.losses}L`);
  });
  
  const createdLeagues = mockLeagues.map(league => ({
    id: league.id,
    documentId: league.documentId,
    name: league.name,
    playerCount: league.playerCount
  }));
  
  console.log(`\n🎉 Created ${createdLeagues.length}/2 mock source leagues`);
  console.log('📊 League Summary:');
  createdLeagues.forEach(league => {
    console.log(`  - ${league.name}: ${league.playerCount} players (ID: ${league.id})`);
  });
  
  // Save complete league data including players for tournament creation
  fs.writeFileSync('./source-leagues-data.json', JSON.stringify(mockLeagues, null, 2));
  console.log('💾 Complete mock league data saved to source-leagues-data.json');
  
  return mockLeagues;
}

// Run the script
createSourceLeagues().catch(console.error);