const fetch = require('node-fetch');

const API_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com/api';

// Manual mapping based on the screenshot you showed me
const nameMapping = {
  'Angus': { firstName: 'Angus', lastName: 'Patterson' },
  'germanosk': { firstName: 'Germano', lastName: 'Assis' },
  'Game of Bones: Winter is Cumming': { firstName: 'Dean', lastName: 'Rothwell' },
  'MudSkipper71': { firstName: 'Jake', lastName: 'Morries' } // Guessing this one
};

async function updateNamesManually() {
  try {
    // Fetch all league players
    const response = await fetch(`${API_URL}/league-players`);
    const data = await response.json();
    
    if (!data.data) {
      console.log('No league players found');
      return;
    }
    
    console.log(`Found ${data.data.length} league players to update`);
    
    for (const leaguePlayer of data.data) {
      const mapping = nameMapping[leaguePlayer.leagueName];
      
      if (mapping) {
        console.log(`Updating ${leaguePlayer.leagueName} with ${mapping.firstName} ${mapping.lastName}`);
        
        const updateResponse = await fetch(`${API_URL}/league-players/${leaguePlayer.documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              firstName: mapping.firstName,
              lastName: mapping.lastName
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
        console.log(`⚠️  No mapping found for ${leaguePlayer.leagueName}`);
      }
    }
    
    console.log('Manual update complete!');
  } catch (error) {
    console.error('Update failed:', error);
  }
}

updateNamesManually();