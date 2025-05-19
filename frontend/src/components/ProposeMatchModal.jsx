import React, { useState } from "react";
import axios from "axios";

const ProposeMatchModal = ({ matchId, onClose, token, onSuccess }) => {
  const now = new Date();
  const minDate = now.toISOString().slice(0, 16);
  const maxDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const [proposedDate, setProposedDate] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    setError("");

    if (!proposedDate) {
      setError("Please select a date and time.");
      return;
    }

    try {
      setSubmitting(true);
      await axios.put(
        `${process.env.REACT_APP_API_URL}/matches/${matchId}`,
        {
          data: {
            proposalTimestamp: proposedDate,
            proposalStatus: "Proposed",
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Proposal failed:", err);
      setError("Could not propose match time.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResponse = async (action) => {
    try {
      setSubmitting(true);
      await axios.post(
        `${process.env.REACT_APP_API_URL}/matches/${matchId}/respond-proposal`,
        { action },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Proposal response failed:", err);
      setError("Could not process response.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Propose a Match Time</h2>

        <form onSubmit={handleSubmitProposal}>
          <label className="block mb-2 font-semibold">Select date & time:</label>
          <input
            type="datetime-local"
            min={minDate}
            max={maxDate}
            value={proposedDate}
            onChange={(e) => setProposedDate(e.target.value)}
            className="w-full border p-2 rounded mb-4"
          />
          {error && <p className="text-red-600 mb-2">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Propose
            </button>
          </div>
        </form>

        <hr className="my-4" />

        <div className="flex justify-between">
          <button
            onClick={() => handleResponse("accept")}
            disabled={submitting}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Accept Proposed Time
          </button>
          <button
            onClick={() => handleResponse("decline")}
            disabled={submitting}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposeMatchModal;
