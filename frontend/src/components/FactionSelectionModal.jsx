import React, { useState } from "react";

const FactionSelectionModal = ({ onClose, onSubmit, requiresPassword }) => {
  const [faction, setFaction] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!faction) {
      setError("Please select a faction.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onSubmit({ faction, password });
      onClose(); // Close modal only if submit succeeds
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
