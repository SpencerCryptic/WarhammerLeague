import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import Auth from "./components/Auth";
import AddPlayer from "./components/AddPlayer";
import LeagueDashboard from "./pages/LeagueDashboard";
import Logout from "./components/Logout";
import UserProfileModal from "./components/UserProfileModal";

const API_URL = process.env.REACT_APP_API_URL;

const AppWrapper = () => {
  const [token, setToken] = useState(localStorage.getItem("jwt") || "");
  const [user, setUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
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

          const requiredFields = [
            "username",
            "phoneNumber",
            "storeLocation",
            "firstName",
            "lastName",
            "dateOfBirth",
          ];

          const isIncomplete = requiredFields.some(
            (field) =>
              !res.data[field] || String(res.data[field]).trim() === ""
          );

          setTimeout(() => setShowProfileModal(isIncomplete), 0);
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
    <>
      {showProfileModal && user && (
        <UserProfileModal
          user={user}
          token={token}
          onUpdate={async () => {
            const updatedUser = await axios.get(`${API_URL}/users/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setUser(updatedUser.data);

            const requiredFields = [
              "username",
              "phoneNumber",
              "storeLocation",
              "firstName",
              "lastName",
              "dateOfBirth",
            ];

            const isStillIncomplete = requiredFields.some(
              (field) =>
                !updatedUser.data[field] ||
                String(updatedUser.data[field]).trim() === ""
            );

            setShowProfileModal(isStillIncomplete);
          }}
        />
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/leagues" />} />
        <Route path="/login" element={<Auth onLogin={handleLogin} />} />
        <Route path="/logout" element={<Logout onLogout={handleLogout} />} />
        <Route path="/add-player" element={<AddPlayer token={token} user={user} />} />
        <Route path="/leagues" element={<LeagueDashboard token={token} user={user} onLogout={handleLogout} />} />
        <Route path="/leagues/:leagueId" element={<LeagueDashboard token={token} user={user} onLogout={handleLogout} />} />
      </Routes>
    </>
  );
};

const App = () => (
  <Router>
    <AppWrapper />
  </Router>
);

export default App;
