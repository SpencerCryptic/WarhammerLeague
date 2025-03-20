import { useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

export default function AddPlayer() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [faction, setFaction] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/players`, {
        data: { name, email, faction }
      });
      alert("Player added!");
      setName("");
      setEmail("");
      setFaction("");
    } catch (error) {
      console.error("Error adding player:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add Player</h2>
      <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="text" placeholder="Faction" value={faction} onChange={(e) => setFaction(e.target.value)} />
      <button type="submit">Add Player</button>
    </form>
  );
}
