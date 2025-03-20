import { useEffect, useState } from "react";
import axios from "axios";
import AddPlayer from "./components/AddPlayer";  // ✅ Correct import
import Auth from "./components/Auth";  // ✅ Correct import

const API_URL = process.env.REACT_APP_API_URL;

function App() {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/players`)
      .then(response => setPlayers(response.data.data))
      .catch(error => console.error("Error fetching players:", error));
  }, []);

  return (
    <div>
      <h1>Warhammer 40K League</h1>

      {/* Authentication Component */}
      <Auth />

      {/* Add Player Form */}
      <AddPlayer />

      {/* Display Player List */}
      <h2>Registered Players</h2>
      <ul>
        {players.map(player => (
          <li key={player.id}>
            {player.attributes.name} - {player.attributes.faction}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
