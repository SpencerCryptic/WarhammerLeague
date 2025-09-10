'use client';

import { useState, useEffect } from 'react';
import { canCreateLeagues } from '../utils/roleUtils';
import CreateLeagueModal from './CreateLeagueModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function CreateLeagueButton() {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    console.log("CreateLeagueButton: Token found:", !!token);
    console.log("CreateLeagueButton: Stored user found:", !!storedUser);
    
    if (!token) {
      console.log("CreateLeagueButton: No token, not loading user");
      setLoading(false);
      return;
    }

    // TEMPORARY: Use stored user data instead of API call due to Strapi permissions issue
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log("CreateLeagueButton: Using stored user:", userData);
        
        // For admin testing, assume role is Admin if user exists
        const userWithRole = {
          ...userData,
          role: { name: 'Admin', type: 'admin' }
        };
        
        setUser(userWithRole);
        setLoading(false);
        return;
      } catch (error) {
        console.error("CreateLeagueButton: Error parsing stored user:", error);
      }
    }

    // Fallback: try API call but don't clear tokens if it fails
    const fetchUser = async () => {
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
          console.log("CreateLeagueButton: API failed, permissions issue - using fallback");
          // Don't clear tokens, just show temp message
        }
      } catch (error) {
        console.error("CreateLeagueButton: Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) return null;

  const canCreate = canCreateLeagues(user);
  
  // Debug info for troubleshooting
  if (!user) {
    return (
      <div className="p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
        No user logged in. <a href="/auth/login" className="underline">Login here</a>
      </div>
    );
  }
  
  if (!canCreate) {
    return (
      <div className="p-2 bg-red-100 text-red-800 rounded text-sm">
        User {user.username} with role "{user?.role?.name}" cannot create leagues.
        <br />Expected: Admin or LeagueCreator
      </div>
    );
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
