'use client';

import { useState, useEffect } from 'react';

interface LeagueAdminControlsProps {
  league: any;
  documentId: string;
}

export default function LeagueAdminControls({ league, documentId }: LeagueAdminControlsProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Check if current user is logged in and get user info
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchUser = async () => {
      try {
        const response = await fetch('http://localhost:1337/api/users/me', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  // Check if current user is the league owner
  const isLeagueOwner = currentUser && league?.createdByUser?.id === currentUser.id;

  const handleStartLeague = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('You must be logged in to start the league');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`http://localhost:1337/api/leagues/${documentId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setMessage('League started successfully! Matches have been generated.');
        // Refresh the page to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.error?.message || 'Failed to start league');
      }
    } catch (error) {
      setMessage('Error starting league');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show controls if user is not the league owner
  if (!isLeagueOwner) {
    return null;
  }

  const playerCount = league?.league_players?.length || 0;
  const canStartLeague = league?.statusleague === 'planned' && playerCount >= 2;

  return (
    <div className="max-w-6xl m-4 p-6 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg shadow-sm dark:bg-gradient-to-r dark:from-orange-900/20 dark:to-red-900/20 dark:border-orange-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">
            League Admin Controls
          </h3>
          <p className="text-sm text-orange-600 dark:text-orange-300">
            You are the organiser of this league
          </p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.includes('successfully') || message.includes('started')
            ? 'bg-green-100 text-green-700 border border-green-400' 
            : 'bg-red-100 text-red-700 border border-red-400'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-3">
        {/* Start League Button */}
        {league?.statusleague === 'planned' && (
          <div>
            <button
              onClick={handleStartLeague}
              disabled={!canStartLeague || isLoading}
              className={`px-4 py-2 rounded-md font-semibold transition-colors ${
                canStartLeague && !isLoading
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Starting League...' : 'Start League'}
            </button>
            
            {!canStartLeague && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {playerCount < 2 
                  ? `Need at least 2 players to start (currently ${playerCount})` 
                  : 'League cannot be started'
                }
              </p>
            )}
          </div>
        )}

        {/* League Status Info */}
        <div className="text-sm space-y-1">
          <p><strong>Status:</strong> 
            <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
              league?.statusleague === 'planned' ? 'bg-yellow-100 text-yellow-800' :
              league?.statusleague === 'ongoing' ? 'bg-green-100 text-green-800' :
              league?.statusleague === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {league?.statusleague || 'Unknown'}
            </span>
          </p>
          <p><strong>Players Registered:</strong> {playerCount}</p>
          {league?.statusleague === 'ongoing' && (
            <p className="text-green-600 font-medium">League is active with matches generated!</p>
          )}
        </div>

        {league?.statusleague === 'planned' && (
          <div className="pt-2 border-t border-orange-200 dark:border-orange-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              More admin controls coming soon: Edit league, Delete league, Manage players
            </p>
          </div>
        )}
      </div>
    </div>
  );
}