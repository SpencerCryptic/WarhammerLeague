import { useEffect, useState } from "react";
import axios from "axios";
import Auth from "./components/Auth";
import AddPlayer from "./components/AddPlayer";
import Logout from "./components/Logout";

const API_URL = process.env.REACT_APP_API_URL;

// Validate API_URL and handle missing environment variable
if (!API_URL) {
  console.error("REACT_APP_API_URL is not defined in the environment variables.");
  throw new Error("Please define REACT_APP_API_URL in your .env file.");
}

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [players, setPlayers] = useState([]);

  // Fetch players when a valid token is available
  useEffect(() => {
    if (token) {
      axios
        .get(`${API_URL}/players`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => {
          console.log("Players fetched successfully:", res.data.data);
          setPlayers(res.data.data);
        })
        .catch((err) => {
          console.error("Error fetching players:", err.response?.data || err.message);
          alert("Failed to fetch players. Please try again later.");
        });
    }
  }, [token]);

  const isAuthenticated = !!token;

  const handleLogout = () => {
    console.log("Logging out...");
    setToken(null);
    setUser(null);
    setPlayers([]);
  };

  return (
    <div>
      <h1>Warhammer 40K League</h1>

      {!isAuthenticated ? (
        <Auth setToken={setToken} setUser={setUser} />
      ) : (
        <>
          <p>
            Logged in as <strong>{user?.email}</strong>
          </p>
          <Logout onLogout={handleLogout} />
        </>
      )}

      {isAuthenticated && <AddPlayer token={token} />}

      <h2>Registered Players</h2>
      {players.length === 0 ? (
        <p>No players yet.</p>
      ) : (
        <ul>
          {players.map((p) => (
            <li key={p.id}>
              {p.attributes.name} – {p.attributes.faction}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;