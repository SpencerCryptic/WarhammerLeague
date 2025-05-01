import { useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;
const AUTH_URL = API_URL.replace("/api", "");

export default function Auth({ setToken, setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? "auth/local" : "auth/local/register";

    // Payload differs between login and signup
    const payload = isLogin
      ? { identifier: email, password }
      : { username: email, email, password }; // Strapi requires 'username' on register

    try {
      const response = await axios.post(`${AUTH_URL}/${endpoint}`, payload);
      console.log("Auth success:", response.data);
      alert(`Welcome, ${response.data.user.email}`);

      if (setToken) setToken(response.data.jwt);
      if (setUser) setUser(response.data.user);

      setError(null);
    } catch (err) {
      console.error("Auth error:", err);
      setError("Something went wrong");
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
      <button type="submit">{isLogin ? "Login" : "Sign Up"}</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <p onClick={() => setIsLogin(!isLogin)} style={{ cursor: "pointer" }}>
        {isLogin ? "Need an account? Sign up!" : "Already have an account? Login!"}
      </p>
    </form>
  );
}
