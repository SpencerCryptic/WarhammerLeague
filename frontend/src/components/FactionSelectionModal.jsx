import React, { useState } from "react";

const FactionSelectionModal = ({ onClose, onSubmit, requiresPassword }) => {
  const [faction, setFaction] = useState("");
  const [password, setPassword] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [goodFaithAccepted, setGoodFaithAccepted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!leagueName.trim()) {
      setError("Please enter a name or team name for this league.");
      return;
    }
    if (!faction) {
      setError("Please select a faction.");
      return;
    }
    if (!goodFaithAccepted) {
      setError("You must agree to the good faith commitment.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onSubmit({ faction, password, goodFaithAccepted, leagueName });
      onClose();
    } catch (err) {
      console.error("Failed to join league:", err);
      setError("Failed to join league. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Join League & Select Faction</h2>

        <label className="block mb-2 text-sm font-medium">Your Name / Team Name</label>
        <input
          type="text"
          value={leagueName}
          onChange={(e) => setLeagueName(e.target.value)}
          placeholder="e.g. Spenny's Orkz"
          className="w-full border px-3 py-2 mb-4 rounded"
        />

        {requiresPassword && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter league password"
            className="w-full border px-3 py-2 mb-4 rounded"
          />
        )}

        <select
          value={faction}
          onChange={(e) => setFaction(e.target.value)}
          className="w-full border px-3 py-2 mb-4 rounded"
        >
          <option value="">Select Faction</option>
          <option value="Astra Militarum">Astra Militarum</option>
          <option value="Orks">Orks</option>
          <option value="Tyranids">Tyranids</option>
          <option value="Adeptus Astartes">Adeptus Astartes</option>
          <option value="T'au Empire">T'au Empire</option>
          {/* Add more factions as needed */}
        </select>

        <label className="flex items-start text-sm mb-4">
          <input
            type="checkbox"
            checked={goodFaithAccepted}
            onChange={(e) => setGoodFaithAccepted(e.target.checked)}
            className="mr-2 mt-1"
          />
          I will to the best of my ability complete the league and required games etc.
        </label>

        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

        <div className="flex justify-between mt-4">
          <button
            onClick={onClose}
            className="text-sm text-gray-600 hover:underline"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={submitting}
          >
            {submitting ? "Joining..." : "Join League"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FactionSelectionModal;
