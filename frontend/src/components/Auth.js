import React, { useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

const Auth = ({ onLogin }) => {
  const [mode, setMode] = useState("login"); // 'login' or 'signup'
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // for signup only
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/auth/local" : "/auth/local/register";
      const payload =
        mode === "login"
          ? { identifier: email, password }
          : { email, username, password };

      const res = await axios.post(`${API_URL}${endpoint}`, payload);
      const { jwt, user } = res.data;
      onLogin(jwt, user);
    } catch (err) {
      console.error("Auth error:", err.response || err.message);
      setError(
        err.response?.data?.error?.message ||
        "Authentication failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded shadow-md w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">
          {mode === "login" ? "Login" : "Create Account"}
        </h2>

        {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}
        {loading && <p className="text-sm mb-4 text-center">Processing...</p>}

        {mode === "signup" && (
          <>
            <label className="block mb-2 text-sm font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 mb-4 border rounded"
              required
            />
          </>
        )}

        <label className="block mb-2 text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />

        <label className="block mb-2 text-sm font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />

        <button
          type="submit"
          className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 transition"
        >
          {mode === "login" ? "Login" : "Sign Up"}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          {mode === "login" ? "Not registered?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-blue-600 hover:underline"
          >
            {mode === "login" ? "Create account" : "Login"}
          </button>
        </p>
      </form>
    </div>
  );
};

export default Auth;
