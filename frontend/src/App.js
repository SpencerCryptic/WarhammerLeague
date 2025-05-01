import { useEffect, useState } from "react";
import axios from "axios";
import Auth from "./components/Auth";
import AddPlayer from "./components/AddPlayer";
import Logout from "./components/Logout";

const API_URL = process.env.REACT_APP_API_URL;

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (token) {
      axios
        .get(`${API_URL}/players`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => setPlayers(res.data.data))
        .catch((err) => console.error("Error fetching players:", err));
    }
  }, [token]);

  const isAuthenticated = !!token;

  return (
    <div>
      <h1>Warhammer 40K League</h1>

      {!isAuthenticated ? (
        <Auth setToken={setToken} setUser={setUser} />
      ) : (
        <>
          <p>Logged in as <strong>{user?.email}</strong></p>
          <Logout onLogout={() => {
            setToken(null);
            setUser(null);
            setPlayers([]);
          }} />
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
