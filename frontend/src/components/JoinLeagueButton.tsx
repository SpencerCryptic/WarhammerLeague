'use client';

import { useState, useEffect } from 'react';
import JoinLeagueModal from './JoinLeagueModal';

interface JoinLeagueButtonProps {
  leagueId: string;
  hasPassword: boolean;
  gameSystem: string;
  status: string;
}

export default function JoinLeagueButton({ 
  leagueId, 
  hasPassword, 
  gameSystem, 
  status 
}: JoinLeagueButtonProps) {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isUserMember, setIsUserMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLeagueName, setUserLeagueName] = useState('');

  // Don't show join button if league is not planned
  if (status !== 'planned') {
    return null;
  }

  // Check if user is already a member of this league
  useEffect(() => {
    const checkMembership = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        // Get current user info
        const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me?populate[player]=*`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userResponse.ok) {
          setLoading(false);
          return;
        }

        const userData = await userResponse.json();
        if (!userData.player) {
          setLoading(false);
          return;
        }

        // Get league details with league_players populated
        const leagueResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leagues/${leagueId}?populate[league_players][populate]=player`);

        if (!leagueResponse.ok) {
          setLoading(false);
          return;
        }

        const leagueData = await leagueResponse.json();

        // Check if current user's player is in league_players
        const userMembership = leagueData.data?.league_players?.find((lp: any) => {
          return lp.player?.id === userData.player.id;
        });

        if (userMembership) {
          setIsUserMember(true);
          setUserLeagueName(userMembership.leagueName || 'Unknown');
        }

      } catch (error) {
        console.error('Error checking membership:', error);
      } finally {
        setLoading(false);
      }
    };

    checkMembership();
  }, [leagueId]);

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-6xl m-4 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800/20 dark:border-gray-600">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-24"></div>
        </div>
      </div>
    );
  }

  // Show "You've joined" message if user is already a member
  if (isUserMember) {
    return (
      <div className="max-w-6xl m-4 p-6 bg-green-50 border border-green-200 rounded-lg shadow-sm dark:bg-green-900/20 dark:border-green-700">
        <h3 className="text-lg font-semibold mb-2 text-green-800 dark:text-green-200 flex items-center">
          <span className="text-2xl mr-2">✅</span>
          You've Joined This League
        </h3>
        <p className="text-green-600 dark:text-green-300 mb-2">
          Welcome to the league! You're registered as <span className="font-semibold">{userLeagueName}</span>.
        </p>
        <p className="text-sm text-green-500 dark:text-green-400">
          Check the Matches and Table tabs to see your games and standings.
        </p>
      </div>
    );
  }

  // Show join button for non-members
  return (
    <>
      <div className="max-w-6xl m-4 p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-sm dark:bg-blue-900/20 dark:border-blue-700">
        <h3 className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-200">
          Join This League
        </h3>
        <p className="text-blue-600 dark:text-blue-300 mb-4">
          This league is open for registration. Sign up to participate!
        </p>
        <button
          onClick={() => setShowJoinModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors"
        >
          Join League
        </button>
      </div>

      <JoinLeagueModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        leagueId={leagueId}
        hasPassword={hasPassword}
        gameSystem={gameSystem}
      />
    </>
  );
}