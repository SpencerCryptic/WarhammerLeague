import React, { useState } from "react";

const ScheduleMatchModal = ({ matchId, onClose, onSubmit }) => {
  const [proposedDate, setProposedDate] = useState("");

  const handleSubmit = () => {
    if (!proposedDate) return;
    onSubmit({ matchId, proposedDate });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Propose a Match Time</h2>
        <label className="block mb-2 text-sm font-medium">Date & Time</label>
        <input
          type="datetime-local"
          value={proposedDate}
          onChange={(e) => setProposedDate(e.target.value)}
          className="w-full border p-2 rounded mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1 border rounded">Cancel</button>
          <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-1 rounded">Send</button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleMatchModal;
