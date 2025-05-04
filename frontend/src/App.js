import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import Auth from "./components/Auth";
import AddPlayer from "./components/AddPlayer";
import LeagueDashboard from "./pages/LeagueDashboard";
import Logout from "./components/Logout";

const API_URL = process.env.REACT_APP_API_URL;

const AppWrapper = () => {
  const [token, setToken] = useState(localStorage.getItem("jwt") || "");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      axios
        .get(`${API_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => {
          setUser(res.data);
        })
        .catch((err) => {
          console.error("Token invalid or expired", err);
          setToken("");
          localStorage.removeItem("jwt");
        });
    }
  }, [token]);

  const handleLogin = (jwt, userData) => {
    localStorage.setItem("jwt", jwt);
    setToken(jwt);
    setUser(userData);
    navigate("/leagues");
  };

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    setToken("");
    setUser(null);
    navigate("/login");
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/leagues" />} />
      <Route path="/login" element={<Auth onLogin={handleLogin} />} />
      <Route path="/logout" element={<Logout onLogout={handleLogout} />} />
      <Route
        path="/add-player"
        element={<AddPlayer token={token} user={user} />}
      />
      <Route
        path="/leagues"
        element={<LeagueDashboard token={token} user={user} onLogout={handleLogout} />}
      />
      <Route
        path="/leagues/:leagueId"
        element={<LeagueDashboard token={token} user={user} onLogout={handleLogout} />}
      />
    </Routes>
  );
};

const App = () => (
  <Router>
    <AppWrapper />
  </Router>
);

export default App;
