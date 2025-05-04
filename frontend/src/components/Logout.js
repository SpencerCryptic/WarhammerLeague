// --- FILE: src/components/Logout.js ---
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Logout = ({ onLogout }) => {
  const navigate = useNavigate();

  useEffect(() => {
    onLogout(); // clears token & user
    navigate("/login"); // redirect to login page
  }, [onLogout, navigate]);

  return null; // nothing to display
};

export default Logout;
