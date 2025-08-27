'use client';

import { useState, useEffect } from 'react';
import { canCreateLeagues } from '../utils/roleUtils';
import CreateLeagueModal from './CreateLeagueModal';

export default function CreateLeagueButton() {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log("Token in localStorage:", token); 

    if (!token) return;

    const fetchUser = async () => {
      try {
        const response = await fetch('http://localhost:1337/api/users/me?populate=role', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const userData = await response.json();
        console.log("Fetched user:", userData);
        setUser(userData);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, []);

  if (!canCreateLeagues(user)) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        Create New League
      </button>
      <CreateLeagueModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
