import React, { useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

const UserProfileModal = ({ user, token, onUpdate }) => {
  const [formData, setFormData] = useState({
    username: user?.username || "",
    phoneNumber: user?.phoneNumber || "",
    store: user?.store || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    dateOfBirth: user?.dateOfBirth || "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await axios.put(`${API_URL}/users/${user.id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      onUpdate(); // refresh user context and close modal
    } catch (err) {
      console.error(err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Complete Your Profile</h2>
        <div className="space-y-3">
          <input
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Username"
            className="w-full border px-2 py-1"
          />
          <input
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="First Name"
            className="w-full border px-2 py-1"
          />
          <input
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Last Name"
            className="w-full border px-2 py-1"
          />
          <input
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            placeholder="Phone Number"
            className="w-full border px-2 py-1"
          />
          <select
            name="store"
            value={formData.store}
            onChange={handleChange}
            className="w-full border px-2 py-1"
          >
            <option value="">Select Store</option>
            <option value="Cryptic Cabin Bristol">Cryptic Cabin Bristol</option>
            <option value="Cryptic Cabin Bracknell">Cryptic Cabin Bracknell</option>
          </select>
          <input
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            placeholder="Date of Birth (YYYY-MM-DD)"
            type="date"
            className="w-full border px-2 py-1"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
          >
            {submitting ? "Saving..." : "Save and Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
