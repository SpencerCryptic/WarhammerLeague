import { useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

// Validate API_URL and handle missing environment variable
if (!API_URL) {
  throw new Error("REACT_APP_API_URL is not defined in the environment variables.");
}

const AUTH_URL = `${API_URL}`;

export default function Auth({ setToken, setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const endpoint = isLogin ? "auth/local" : "auth/local/register";
    const payload = isLogin
      ? { identifier: email, password }
      : { username: email, email, password };

    console.log("Payload:", payload);

    try {
      const response = await axios.post(`${AUTH_URL}/${endpoint}`, payload);
      console.log("Auth success:", response.data);

      if (setToken) setToken(response.data.jwt);
      if (setUser) setUser(response.data.user);

      setError(null);
    } catch (err) {
      console.error("Auth error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{isLogin ? "Login" : "Sign Up"}</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <p onClick={() => setIsLogin(!isLogin)} style={{ cursor: "pointer" }}>
        {isLogin ? "Need an account? Sign up!" : "Already have an account? Login!"}
      </p>
    </form>
  );
}