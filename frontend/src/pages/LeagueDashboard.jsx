import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

const LeagueDashboard = ({ token, user, onLogout }) => {
  const { leagueId } = useParams();
  const navigate = useNavigate();

  const [leagues, setLeagues] = useState([]);
  const [leagueData, setLeagueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const renderDescription = (desc) => {
    if (!desc || typeof desc === "string") {
      return <p>{desc || "No description available."}</p>;
    }
    if (Array.isArray(desc)) {
      return desc.map((block, i) => {
        if (block.type === "paragraph" && Array.isArray(block.children)) {
          return <p key={i}>{block.children.map((c) => c.text).join(" ")}</p>;
        }
        return null;
      });
    }
    return <p>No description available.</p>;
  };

  useEffect(() => {
    const fetchLeaguesAndLeagueData = async () => {
      setLoading(true);
      try {
        const leaguesRes = await axios.get(`${API_URL}/leagues`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Wrap in attributes for compatibility
        const leaguesList = leaguesRes.data.data.map((l) => ({
          id: l.id,
          attributes: { ...l }
        }));

        setLeagues(leaguesList);

        const matchedLeague = leaguesList.find((l) => l.id.toString() === leagueId);
        if (!matchedLeague && leaguesList.length > 0) {
          const firstValidId = leaguesList[0].id;
          navigate(`/leagues/${firstValidId}`, { replace: true });
          return;
        }

        const leagueRes = await axios.get(`${API_URL}/leagues`, {
          params: {
            filters: {
              id: {
                $eq: leagueId
              }
            }
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const leagueRaw = leagueRes.data.data[0];
        setLeagueData({
          id: leagueRaw.id,
          attributes: { ...leagueRaw }
        });

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
        <h1 className="text-xl font-bold">Warhammer 40K League</h1>
        <div className="flex items-center gap-4">
          <p className="text-sm">
            Logged in as <strong>{user?.email || "Unknown"}</strong>
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
        <Link to="/leagues" className="text-blue-700 font-medium">
          Leagues
        </Link>
        <Link to="#" className="text-blue-700">
          My Stats
        </Link>
        <Link to="#" className="text-blue-700">
          Create A League
        </Link>
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
                    {lg.attributes?.name || "Unnamed League"}
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
                {leagueData.attributes?.name || "Unnamed League"}
              </h2>
              <div className="text-gray-600 mb-6">
                {renderDescription(leagueData.attributes?.description)}
              </div>
              <p>
                Status:{" "}
                <strong>{leagueData.attributes?.statusleague || "Unknown"}</strong>
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default LeagueDashboard;
