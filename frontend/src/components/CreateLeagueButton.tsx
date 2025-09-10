'use client';

import { useState, useEffect } from 'react';
import { canCreateLeagues } from '../utils/roleUtils';
import CreateLeagueModal from './CreateLeagueModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://accessible-positivity-e213bb2958.strapiapp.com';

export default function CreateLeagueButton() {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      console.log("CreateLeagueButton: Token found:", !!token);
      console.log("CreateLeagueButton: Stored user found:", !!storedUser);
      
      if (!token) {
        console.log("CreateLeagueButton: No token, not loading user");
        setLoading(false);
        return;
      }

      try {
        console.log("CreateLeagueButton: Attempting API call...");
        const response = await fetch(`${API_URL}/api/users/me?populate=role`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        console.log("CreateLeagueButton: Response status:", response.status);
        
        if (response.ok) {
          const userData = await response.json();
          console.log("CreateLeagueButton: User data from API:", userData);
          setUser(userData);
        } else {
          console.log("CreateLeagueButton: API failed, using stored user without admin privileges");
          // Fallback to stored user but without automatic admin role assignment
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              // Use the user but with their actual role (likely "Authenticated" for regular users)
              setUser({
                ...userData,
                role: { name: 'Authenticated', type: 'authenticated' }
              });
            } catch (error) {
              console.error("CreateLeagueButton: Error parsing stored user:", error);
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error("CreateLeagueButton: Error fetching user:", error);
        // Fallback to stored user with default role
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            setUser({
              ...userData,
              role: { name: 'Authenticated', type: 'authenticated' }
            });
          } catch (error) {
            console.error("CreateLeagueButton: Error parsing stored user:", error);
            setUser(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) return null;

  const canCreate = canCreateLeagues(user);
  
  // Only show the button if user can create leagues
  if (!user || !canCreate) {
    return null; // Hide button completely for regular users
  }

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
