const axios = require('axios');

const API_URL = 'http://localhost:1337';

// 16 test users with Warhammer-themed names
const testUsers = [
  { username: 'ultramarines_captain', email: 'ultramarines_captain@test.com', password: 'test123456', leagueName: 'Captain Titus' },
  { username: 'blood_angels_sergeant', email: 'blood_angels_sergeant@test.com', password: 'test123456', leagueName: 'Sergeant Dante' },
  { username: 'dark_angels_librarian', email: 'dark_angels_librarian@test.com', password: 'test123456', leagueName: 'Librarian Ezekiel' },
  { username: 'imperial_fists_champion', email: 'imperial_fists_champion@test.com', password: 'test123456', leagueName: 'Champion Dorn' },
  { username: 'space_wolves_hunter', email: 'space_wolves_hunter@test.com', password: 'test123456', leagueName: 'Wolf Hunter Ragnar' },
  { username: 'salamanders_forgemaster', email: 'salamanders_forgemaster@test.com', password: 'test123456', leagueName: 'Forgemaster Vulkan' },
  { username: 'raven_guard_scout', email: 'raven_guard_scout@test.com', password: 'test123456', leagueName: 'Scout Corax' },
  { username: 'white_scars_biker', email: 'white_scars_biker@test.com', password: 'test123456', leagueName: 'Biker Khan' },
  { username: 'chaos_lord_khorne', email: 'chaos_lord_khorne@test.com', password: 'test123456', leagueName: 'Lord of Khorne' },
  { username: 'thousand_sons_sorcerer', email: 'thousand_sons_sorcerer@test.com', password: 'test123456', leagueName: 'Sorcerer Magnus' },
  { username: 'death_guard_plague', email: 'death_guard_plague@test.com', password: 'test123456', leagueName: 'Plague Marine' },
  { username: 'emperors_children_noise', email: 'emperors_children_noise@test.com', password: 'test123456', leagueName: 'Noise Marine' },
  { username: 'necron_overlord', email: 'necron_overlord@test.com', password: 'test123456', leagueName: 'Overlord Szarekh' },
  { username: 'tau_commander', email: 'tau_commander@test.com', password: 'test123456', leagueName: 'Commander Farsight' },
  { username: 'ork_warboss', email: 'ork_warboss@test.com', password: 'test123456', leagueName: 'Warboss Ghazghkull' },
  { username: 'tyranid_hive_tyrant', email: 'tyranid_hive_tyrant@test.com', password: 'test123456', leagueName: 'Hive Tyrant' }
];

const factions = [
  'Ultramarines', 'Blood Angels', 'Dark Angels', 'Imperial Fists',
  'Space Wolves', 'Salamanders', 'Raven Guard', 'White Scars',
  'Chaos Space Marines', 'Thousand Sons', 'Death Guard', 'Emperor\'s Children',
  'Necrons', 'T\'au Empire', 'Orks', 'Tyranids'
];

async function createTestUsers() {
  console.log('🚀 Creating 16 test users for tournament testing...');
  
  const createdUsers = [];
  
  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    const faction = factions[i];
    
    try {
      // Register user
      console.log(`Creating user ${i + 1}/16: ${user.username}`);
      
      const registerResponse = await axios.post(`${API_URL}/api/auth/local/register`, {
        username: user.username,
        email: user.email,
        password: user.password
      });
      
      const userId = registerResponse.data.user.id;
      const token = registerResponse.data.jwt;
      
      console.log(`✅ User created: ${user.username} (ID: ${userId})`);
      
      createdUsers.push({
        id: userId,
        username: user.username,
        email: user.email,
        token: token,
        leagueName: user.leagueName,
        faction: faction
      });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Failed to create user ${user.username}:`, error.response?.data || error.message);
    }
  }
  
  console.log(`\n🎉 Successfully created ${createdUsers.length}/16 test users`);
  
  // Save the created users data for next steps
  const fs = require('fs');
  fs.writeFileSync('./test-users-data.json', JSON.stringify(createdUsers, null, 2));
  console.log('💾 Test user data saved to test-users-data.json');
  
  return createdUsers;
}

// Run the script
createTestUsers().catch(console.error);