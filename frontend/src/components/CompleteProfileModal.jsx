import React, { useState, useEffect } from "react";
import axios from "axios";

const CompleteProfileModal = ({ token, user, onComplete }) => {
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    dateOfBirth: "",
    storeLocation: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        username: user.username || "",
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      // Step 1: Update user
      await axios.put(`${process.env.REACT_APP_API_URL}/users/me`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Step 2: Refresh user and check for linked player
      const refreshedUser = await axios.get(`${process.env.REACT_APP_API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!refreshedUser.data.player) {
        // Step 3: Create Player linked to user
        const playerRes = await axios.post(
          `${process.env.REACT_APP_API_URL}/players`,
          {
            data: {
              name: formData.username,
              user: refreshedUser.data.id,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Step 4 (optional if Player->User handles the relation only): update User with Player
        await axios.put(`${process.env.REACT_APP_API_URL}/users/${refreshedUser.data.id}`, {
          player: playerRes.data.data.id,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      onComplete();
    } catch (err) {
      console.error(err);
      if (
        err.response?.data?.error?.message?.includes("username must be unique") ||
        err.response?.data?.error?.details?.errors?.some(
          (e) => e.path === "username" && e.message.includes("unique")
        )
      ) {
        setError("This username is already taken. Please choose another.");
      } else {
        setError("Update failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">Complete Your Profile</h2>
        <div className="grid gap-4">
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            className="border p-2 rounded w-full"
            required
          />
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleChange}
            className="border p-2 rounded w-full"
            required
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            className="border p-2 rounded w-full"
            required
          />
          <input
            type="text"
            name="phoneNumber"
            placeholder="Phone Number"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />
          <select
            name="storeLocation"
            value={formData.storeLocation}
            onChange={handleChange}
            className="border p-2 rounded w-full"
            required
          >
            <option value="">Select Store</option>
            <option value="Cryptic Cabin Bristol">Cryptic Cabin Bristol</option>
            <option value="Cryptic Cabin Bracknell">Cryptic Cabin Bracknell</option>
          </select>
        </div>
        {error && <p className="text-red-600 mt-2">{error}</p>}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfileModal;
