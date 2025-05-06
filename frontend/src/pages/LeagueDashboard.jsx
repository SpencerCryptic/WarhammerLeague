import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import FactionSelectionModal from "../components/FactionSelectionModal";

const API_URL = process.env.REACT_APP_API_URL;

const LeagueDashboard = ({ token, user, onLogout }) => {
  const { leagueId } = useParams();
  const navigate = useNavigate();

  const [leagues, setLeagues] = useState([]);
  const [leagueData, setLeagueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [joinMessage, setJoinMessage] = useState("");
  const [joinSuccess, setJoinSuccess] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const handleJoin = async ({ password, faction }) => {
    setJoinMessage("");
    setJoinSuccess(null);

    try {
      await axios.post(
        `${API_URL}/leagues/${leagueId}/join`,
        { password, faction },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setJoinMessage("Successfully joined the league!");
      setJoinSuccess(true);
      setShowJoinModal(false);

      const leagueRes = await axios.get(`${API_URL}/leagues/${leagueId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeagueData(leagueRes.data.data);

    } catch (err) {
      console.error(err);
      setJoinMessage(err.response?.data?.error?.message || "Failed to join league.");
      setJoinSuccess(false);
    }
  };

  const renderDescription = (desc) => {
    if (Array.isArray(desc)) {
      return desc.map((block, i) => (
        <p key={i}>
          {block.children?.map((child, j) => (
            <span key={j}>{child.text}</span>
          ))}
        </p>
      ));
    }
    return <p>{desc || "No description available."}</p>;
  };

  useEffect(() => {
    const fetchLeaguesAndLeagueData = async () => {
      setLoading(true);
      try {
        const leaguesRes = await axios.get(`${API_URL}/leagues`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const leaguesList = leaguesRes.data.data;
        setLeagues(leaguesList);

        if (!leagueId || !leaguesList.some((l) => l.id.toString() === leagueId)) {
          if (leaguesList.length > 0) {
            const firstValidId = leaguesList[0].id;
            navigate(`/leagues/${firstValidId}`, { replace: true });
          } else {
            setError("No leagues available");
            setLeagueData(null);
          }
          return;
        }

        const leagueRes = await axios.get(`${API_URL}/leagues/${leagueId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setLeagueData(leagueRes.data.data);
      } catch (err) {
        console.error("Error loading league dashboard", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaguesAndLeagueData();
  }, [leagueId, token, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="flex justify-between items-center p-4 border-b bg-white">
        <h1 className="text-xl font-bold">CC Leagues</h1>
        <div className="flex items-center gap-4">
          <p className="text-sm">
            Logged in as <strong>{user?.username || user?.email || "Unknown"}</strong>
          </p>
          <button
            onClick={onLogout}
            className="text-sm text-red-500 font-semibold"
          >
            Logout
          </button>
        </div>
      </header>

      <nav className="flex gap-6 p-4 border-b bg-white">
        <Link to="/leagues" className="text-blue-700 font-medium">Leagues</Link>
        <Link to="#" className="text-blue-700">My Stats</Link>
        <Link to="#" className="text-blue-700">Create A League</Link>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-blue-900 text-white p-4 min-h-screen">
          <h2 className="text-lg font-semibold mb-4">Active Leagues</h2>
          <ul className="space-y-2">
            {leagues.length === 0 ? (
              <li>No leagues found.</li>
            ) : (
              leagues.map((lg) => (
                <li key={lg.id}>
                  <Link
                    to={`/leagues/${lg.id}`}
                    className={`block px-2 py-1 rounded hover:bg-blue-700 ${
                      lg.id.toString() === leagueId ? "bg-blue-700" : ""
                    }`}
                  >
                    {lg.name || "Unnamed League"}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </aside>

        <main className="flex-1 p-6">
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : !leagueData ? (
            <p>No league found.</p>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">
                {leagueData.name || "Unnamed League"}
              </h2>
              <div className="text-gray-600 mb-6">
                {renderDescription(leagueData.description)}
              </div>
              <p className="mb-6">
                Status: <strong>{leagueData.statusleague || "Unknown"}</strong>
              </p>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Players Joined</h3>
                {leagueData.players?.length > 0 ? (
                  <ul className="list-disc ml-6 text-sm text-gray-800">
                    {leagueData.players.map((player) => (
                      <li key={player.id}>
                        {player.name || "Unnamed Player"}
                        {player.faction && (
                          <span className="text-gray-500"> – {player.faction}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No players yet.</p>
                )}
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Join This League</h3>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
                >
                  Join League
                </button>
                {joinMessage && (
                  <p
                    className={`mt-2 text-sm ${
                      joinSuccess ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {joinMessage}
                  </p>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {showJoinModal && (
        <FactionSelectionModal
          onClose={() => setShowJoinModal(false)}
          onSubmit={handleJoin}
          requiresPassword={!!leagueData?.leaguePassword}
        />
      )}
    </div>
  );
};

export default LeagueDashboard;
