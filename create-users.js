const fetch = require('node-fetch');

const API_URL = 'http://localhost:1337';

async function createUsers(numberOfUsers = 5) {
  const users = [];
  
  for (let i = 1; i <= numberOfUsers; i++) {
    const userData = {
      username: `testuser${i}`,
      email: `testuser${i}@example.com`,
      password: 'password123',
      confirmed: true
    };

    try {
      const response = await fetch(`${API_URL}/api/auth/local/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const result = await response.json();
        users.push({
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          jwt: result.jwt
        });
        console.log(`✅ Created user: ${userData.username}`);
      } else {
        const error = await response.text();
        console.log(`❌ Failed to create ${userData.username}: ${error}`);
      }
    } catch (error) {
      console.log(`❌ Error creating ${userData.username}:`, error.message);
    }

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Created ${users.length} users successfully:`);
  users.forEach(user => {
    console.log(`- ${user.username} (${user.email}) - ID: ${user.id}`);
  });

  return users;
}

// Run the script
const numberOfUsers = process.argv[2] ? parseInt(process.argv[2]) : 5;
createUsers(numberOfUsers);