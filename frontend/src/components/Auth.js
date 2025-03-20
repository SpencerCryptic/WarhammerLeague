import { useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? "auth/local" : "auth/local/register";
    try {
      const response = await axios.post(`${API_URL}/${endpoint}`, {
        identifier: email,
        password,
      });
      alert(`Welcome, ${response.data.user.username}!`);
    } catch (error) {
      console.error("Auth error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{isLogin ? "Login" : "Sign Up"}</h2>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button type="submit">{isLogin ? "Login" : "Sign Up"}</button>
      <p onClick={() => setIsLogin(!isLogin)}>{isLogin ? "Need an account? Sign up!" : "Already have an account? Login!"}</p>
    </form>
  );
}
