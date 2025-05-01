import React, { useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

if (!API_URL) {
  throw new Error("REACT_APP_API_URL is not defined in the environment variables.");
}

const AUTH_URL = `${API_URL}`;

export default function Auth({ setToken, setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isLogin ? "auth/local" : "auth/local/register";
    const payload = isLogin
      ? { identifier: email, password }
      : { username: email, email, password };

    try {
      const response = await axios.post(`${AUTH_URL}/${endpoint}`, payload);
      setToken(response.data.jwt);
      setUser(response.data.user);
    } catch (err) {
      const message = err.response?.data?.error?.message || "";
      if (message.includes("Invalid identifier or password")) {
        setError("Incorrect email or password.");
      } else if (message.includes("email") && message.includes("already taken")) {
        setError("Email already registered. Please log in or use a different email.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold text-center mb-6">
          {isLogin ? "Login" : "Sign Up"}
        </h2>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-semibold mb-1">
            Email
          </label>
          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring focus:ring-orange-300"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-semibold mb-1">
            Password
          </label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring focus:ring-orange-300"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded w-full"
        >
          {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
        </button>

        <p
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm text-center mt-4 text-gray-600 cursor-pointer hover:underline"
        >
          {isLogin ? "Need an account? Sign up!" : "Already have an account? Login!"}
        </p>
      </form>
    </div>
  );
}
