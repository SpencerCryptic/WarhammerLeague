const axios = require('axios');

const API_URL = 'http://localhost:1337';

// Create axios instance with default headers
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Game systems with their factions
const gameSystemsData = [
  {
    name: 'Warhammer: 40,000',
    description: 'The grim darkness of the far future where there is only war.',
    publisher: 'Games Workshop',
    isActive: true,
    factions: [
      'Space Marines', 'Chaos Space Marines', 'Imperial Guard', 'Orks', 
      'Eldar', 'Dark Eldar', 'Tau Empire', 'Necrons', 'Tyranids', 
      'Chaos Daemons', 'Sisters of Battle', 'Imperial Knights', 
      'Adeptus Custodes', 'Thousand Sons', 'Death Guard', 'Grey Knights',
      'Deathwatch', 'Harlequins', 'Ynnari', 'Genestealer Cults'
    ]
  },
  {
    name: 'Warhammer: Age of Sigmar',
    description: 'Fantasy battles in the Mortal Realms.',
    publisher: 'Games Workshop',
    isActive: true,
    factions: [
      'Stormcast Eternals', 'Khorne Bloodbound', 'Nurgle Rotbringers',
      'Tzeentch Arcanites', 'Slaanesh Hedonites', 'Skaven', 'Orruks',
      'Grots', 'Seraphon', 'Sylvaneth', 'Daughters of Khaine',
      'Idoneth Deepkin', 'Kharadron Overlords', 'Fyreslayers',
      'Nighthaunt', 'Ossiarch Bonereapers', 'Cities of Sigmar',
      'Beasts of Chaos', 'Slaves to Darkness'
    ]
  },
  {
    name: 'Warhammer: Kill Team',
    description: 'Small-scale tactical combat in the 41st millennium.',
    publisher: 'Games Workshop',
    isActive: true,
    factions: [
      'Space Marine Tactical Squad', 'Chaos Space Marine Squad', 
      'Ork Boyz', 'Astra Militarum Veterans', 'Tau Fire Warriors',
      'Eldar Rangers', 'Dark Eldar Kabalites', 'Necron Immortals',
      'Tyranid Genestealers', 'Death Korps of Krieg', 'Adeptus Mechanicus',
      'Grey Knights', 'Deathwatch Veterans', 'Harlequin Players'
    ]
  },
  {
    name: 'Warhammer: Warcry',
    description: 'Skirmish battles in the Age of Sigmar.',
    publisher: 'Games Workshop',
    isActive: true,
    factions: [
      'Iron Golems', 'Untamed Beasts', 'Corvus Cabal', 'Cypher Lords',
      'The Unmade', 'Splintered Fang', 'Scions of the Flame',
      'Spire Tyrants', 'Khorne Bloodbound', 'Maggotkin of Nurgle',
      'Hedonites of Slaanesh', 'Disciples of Tzeentch', 'Skaven',
      'Nighthaunt', 'Stormcast Eternals', 'Daughters of Khaine'
    ]
  },
  {
    name: 'Warhammer: Necromunda',
    description: 'Gang warfare in the underhive.',
    publisher: 'Games Workshop',
    isActive: true,
    factions: [
      'House Escher', 'House Goliath', 'House Van Saar', 'House Orlock',
      'House Delaque', 'House Cawdor', 'Enforcers', 'Corpse Grinder Cults',
      'Chaos Cultists', 'Genestealer Cultists', 'Ash Waste Nomads',
      'Ironhead Squat Prospectors', 'House of Chains', 'House of Blades'
    ]
  },
  {
    name: 'A Song of Ice and Fire',
    description: 'Battles for the Iron Throne.',
    publisher: 'CMON',
    isActive: true,
    factions: [
      'House Stark', 'House Lannister', 'House Baratheon', 'House Targaryen',
      'Night\'s Watch', 'Free Folk', 'House Martell', 'House Tyrell',
      'House Greyjoy', 'Golden Company'
    ]
  },
  {
    name: 'Middle Earth SBG',
    description: 'Strategy battles in Middle-earth.',
    publisher: 'Games Workshop',
    isActive: true,
    factions: [
      'Gondor', 'Rohan', 'The Shire', 'Rivendell', 'Lothlórien',
      'The White Council', 'Thorin\'s Company', 'Iron Hills',
      'Mordor', 'Isengard', 'Haradrim', 'Easterlings', 'Corsairs of Umbar',
      'The Serpent Horde', 'Azog\'s Hunters', 'Goblin-town',
      'The Misty Mountains', 'Moria'
    ]
  },
  {
    name: 'Marvel Crisis Protocol',
    description: 'Superhero skirmish battles.',
    publisher: 'Atomic Mass Games',
    isActive: true,
    factions: [
      'Avengers', 'X-Men', 'Spider-Foes', 'Guardians of the Galaxy',
      'Inhumans', 'Wakanda', 'Asgard', 'Criminal Syndicate',
      'Cabal', 'Brotherhood of Mutants', 'Dark Dimension',
      'Midnight Sons', 'A-Force', 'Web Warriors'
    ]
  },
  {
    name: 'Conquest',
    description: 'Mass fantasy battles.',
    publisher: 'Para Bellum Wargames',
    isActive: true,
    factions: [
      'The Hundred Kingdoms', 'The Spires', 'The Dweghom', 'Nords',
      'The Old Dominion', 'The W\'adrhŭn', 'The Sorcerer Kings'
    ]
  }
];

async function seedGameSystems() {
  console.log('🌱 Starting to seed game systems and factions...');
  
  try {
    for (const gameSystemData of gameSystemsData) {
      console.log(`\n📦 Creating game system: ${gameSystemData.name}`);
      
      // Create the game system
      const gameSystemResponse = await axios.post(`${API_URL}/api/game-systems`, {
        data: {
          name: gameSystemData.name,
          description: gameSystemData.description,
          publisher: gameSystemData.publisher,
          isActive: gameSystemData.isActive
        }
      });
      
      const gameSystemId = gameSystemResponse.data.data.documentId;
      console.log(`✅ Created game system with ID: ${gameSystemId}`);
      
      // Create factions for this game system
      console.log(`🎭 Creating ${gameSystemData.factions.length} factions...`);
      
      for (const factionName of gameSystemData.factions) {
        try {
          await axios.post(`${API_URL}/api/factions`, {
            data: {
              name: factionName,
              gameSystem: gameSystemId,
              isActive: true
            }
          });
          console.log(`  ✅ Created faction: ${factionName}`);
        } catch (error) {
          console.log(`  ❌ Failed to create faction ${factionName}:`, error.response?.data?.error?.message || error.message);
        }
      }
    }
    
    console.log('\n🎉 Successfully seeded all game systems and factions!');
    
    // Display summary
    const gameSystems = await axios.get(`${API_URL}/api/game-systems`);
    const factions = await axios.get(`${API_URL}/api/factions`);
    
    console.log(`\n📊 Summary:`);
    console.log(`   Game Systems: ${gameSystems.data.data.length}`);
    console.log(`   Factions: ${factions.data.data.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding data:', error.response?.data?.error || error.message);
    process.exit(1);
  }
}

// Run the seeder
if (require.main === module) {
  seedGameSystems()
    .then(() => {
      console.log('✨ Seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedGameSystems };