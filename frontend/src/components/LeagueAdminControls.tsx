'use client';

import { useState, useEffect } from 'react';
import OTPManagementModal from './OTPManagementModal';

interface LeagueAdminControlsProps {
  league: any;
  documentId: string;
}

export default function LeagueAdminControls({ league, documentId }: LeagueAdminControlsProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [availableLeagues, setAvailableLeagues] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [selectedTargetLeague, setSelectedTargetLeague] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [showDropModal, setShowDropModal] = useState(false);
  const [selectedDropPlayer, setSelectedDropPlayer] = useState<any>(null);
  const [dropLoading, setDropLoading] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [addPlayerEmail, setAddPlayerEmail] = useState('');
  const [addPlayerLeagueName, setAddPlayerLeagueName] = useState('');
  const [addPlayerFaction, setAddPlayerFaction] = useState('');
  const [addPlayerLoading, setAddPlayerLoading] = useState(false);
  const [availableFactions, setAvailableFactions] = useState<string[]>([]);
  const [replacingPlayerId, setReplacingPlayerId] = useState('');
  const [showCreatePoolsModal, setShowCreatePoolsModal] = useState(false);
  const [numberOfPools, setNumberOfPools] = useState(1);
  const [createPoolsLoading, setCreatePoolsLoading] = useState(false);

  // Check if current user is logged in and get user info
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // TEMPORARY: Use stored user data instead of API call due to Strapi permissions issue
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        // Mock the expected structure for admin users
        const userWithRole = {
          ...userData,
          role: { name: 'Admin', type: 'admin' }
        };
        setCurrentUser(userWithRole);
        return;
      } catch (error) {
        console.error('Error parsing stored user data:', error);
      }
    }

    const fetchUser = async () => {
      try {
        const response = await fetch('https://accessible-positivity-e213bb2958.strapiapp.com/api/users/me', {
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
      const response = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues/${documentId}/start`, {
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




  // Fetch available leagues for transfer
  const fetchAvailableLeagues = async () => {
    try {
      const response = await fetch('https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues');
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched leagues:', data); // Debug log
        // Filter out the current league and only show leagues with the same game system
        const otherLeagues = data.data.filter((l: any) =>
          l.documentId !== documentId && l.gameSystem === league.gameSystem
        );
        console.log('Other leagues after filtering:', otherLeagues); // Debug log
        setAvailableLeagues(otherLeagues);
      } else {
        console.error('Failed to fetch leagues:', response.status);
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
    }
  };

  // Handle player transfer
  const handlePlayerTransfer = async () => {
    if (!selectedPlayer || !selectedTargetLeague) return;

    setTransferLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues/transfer-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          leaguePlayerId: selectedPlayer.documentId,
          targetLeagueId: selectedTargetLeague
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message);
        setShowTransferModal(false);
        setSelectedPlayer(null);
        setSelectedTargetLeague('');
        // Refresh the page to show updated player list
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.error?.message || 'Failed to transfer player');
      }
    } catch (error) {
      console.error('Error transferring player:', error);
      setMessage('Error transferring player');
    } finally {
      setTransferLoading(false);
    }
  };

  // Open transfer modal for a specific player
  const openTransferModal = () => {
    setShowTransferModal(true);
    fetchAvailableLeagues();
  };

  // Handle player drop
  const handlePlayerDrop = async () => {
    if (!selectedDropPlayer) return;

    setDropLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/league-players/${selectedDropPlayer.documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            status: 'dropped'
          }
        }),
      });

      if (response.ok) {
        setMessage('Player marked as dropped successfully');
        setShowDropModal(false);
        setSelectedDropPlayer(null);
        // Refresh the page to show updated player list
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.error?.message || 'Failed to drop player');
      }
    } catch (error) {
      console.error('Error dropping player:', error);
      setMessage('Error dropping player');
    } finally {
      setDropLoading(false);
    }
  };

  // Fetch available factions for the league
  const fetchFactions = async () => {
    try {
      const response = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues/${documentId}/factions`);
      if (response.ok) {
        const data = await response.json();
        setAvailableFactions(data.factions || []);
      }
    } catch (error) {
      console.error('Error fetching factions:', error);
    }
  };

  // Handle adding replacement player
  const handleAddPlayer = async () => {
    if (!addPlayerEmail || !addPlayerLeagueName || !replacingPlayerId) return;

    setAddPlayerLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues/add-replacement-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          leagueId: documentId,
          userEmail: addPlayerEmail,
          leagueName: addPlayerLeagueName,
          faction: addPlayerFaction || null,
          replacingLeaguePlayerId: replacingPlayerId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message);
        setShowAddPlayerModal(false);
        setAddPlayerEmail('');
        setAddPlayerLeagueName('');
        setAddPlayerFaction('');
        setReplacingPlayerId('');
        // Refresh the page to show updated player list
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.error?.message || 'Failed to add player');
      }
    } catch (error) {
      console.error('Error adding player:', error);
      setMessage('Error adding player');
    } finally {
      setAddPlayerLoading(false);
    }
  };

  // Open add player modal
  const openAddPlayerModal = () => {
    setShowAddPlayerModal(true);
    fetchFactions();
  };

  // Handle create pools
  const handleCreatePools = async () => {
    if (numberOfPools < 1 || numberOfPools > 25) return;

    setCreatePoolsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues/${documentId}/create-pools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ numberOfPools }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message);
        setShowCreatePoolsModal(false);
        setNumberOfPools(1);
        // Refresh after a delay to show the message
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.error?.message || 'Failed to create pools');
      }
    } catch (error) {
      console.error('Error creating pools:', error);
      setMessage('Error creating pools');
    } finally {
      setCreatePoolsLoading(false);
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
        {/* Admin Action Buttons */}
        <div className="flex gap-3">
          {/* Start League Button */}
          {league?.statusleague === 'planned' && (
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
          )}
          
          {/* Manage OTPs Button - show if league has password and useOTP */}
          {league?.leaguePassword && league?.useOTP && (
            <button
              onClick={() => setShowOTPModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors"
            >
              Manage OTPs
            </button>
          )}

          {/* Transfer Players Button - show if league has players */}
          {league?.league_players?.length > 0 && (
            <button
              onClick={openTransferModal}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-semibold transition-colors"
            >
              Transfer Players
            </button>
          )}

          {/* Drop Player Button - show if league has players */}
          {league?.league_players?.length > 0 && (
            <button
              onClick={() => setShowDropModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold transition-colors"
            >
              Drop Player
            </button>
          )}

          {/* Add Replacement Player Button */}
          <button
            onClick={openAddPlayerModal}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors"
          >
            Add Replacement Player
          </button>

          {/* Create Pools Button */}
          <button
            onClick={() => setShowCreatePoolsModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-semibold transition-colors"
          >
            Create Pools
          </button>
        </div>
        
        {/* Start League Requirements */}
        {league?.statusleague === 'planned' && !canStartLeague && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {playerCount < 2 
              ? `Need at least 2 players to start (currently ${playerCount})` 
              : 'League cannot be started'
            }
          </p>
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

      {/* OTP Management Modal */}
      <OTPManagementModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        leagueId={documentId}
        leagueName={league?.name || 'League'}
      />

      {/* Player Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Transfer Player
              </h3>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedPlayer(null);
                  setSelectedTargetLeague('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Player Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Player to Transfer
                </label>
                <select
                  value={selectedPlayer?.documentId || ''}
                  onChange={(e) => {
                    const player = league?.league_players?.find((p: any) => p.documentId === e.target.value);
                    setSelectedPlayer(player);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Choose a player...</option>
                  {league?.league_players?.map((player: any) => (
                    <option key={player.documentId} value={player.documentId}>
                      {player.player?.name || `Player ${player.documentId}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target League Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target League
                </label>
                <select
                  value={selectedTargetLeague}
                  onChange={(e) => setSelectedTargetLeague(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={!selectedPlayer}
                >
                  <option value="">Choose target league...</option>
                  {availableLeagues.length === 0 ? (
                    <option disabled>Loading leagues...</option>
                  ) : (
                    availableLeagues.map((league: any) => (
                      <option key={league.documentId} value={league.documentId}>
                        {league.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Transfer Button */}
              <button
                onClick={handlePlayerTransfer}
                disabled={!selectedPlayer || !selectedTargetLeague || transferLoading}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transferLoading ? 'Transferring...' : 'Transfer Player'}
              </button>

              {selectedPlayer && selectedTargetLeague && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Warning:</strong> This will move {selectedPlayer.player?.name || 'the selected player'} from this league to the target league. This action cannot be undone.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drop Player Modal */}
      {showDropModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Drop Player from League
              </h3>
              <button
                onClick={() => {
                  setShowDropModal(false);
                  setSelectedDropPlayer(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Player Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Player to Drop
                </label>
                <select
                  value={selectedDropPlayer?.documentId || ''}
                  onChange={(e) => {
                    const player = league?.league_players?.find((p: any) => p.documentId === e.target.value);
                    setSelectedDropPlayer(player);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Choose a player...</option>
                  {league?.league_players?.filter((p: any) => p.status !== 'dropped').map((player: any) => (
                    <option key={player.documentId} value={player.documentId}>
                      {player.leagueName || player.player?.name || `Player ${player.documentId}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Drop Button */}
              <button
                onClick={handlePlayerDrop}
                disabled={!selectedDropPlayer || dropLoading}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {dropLoading ? 'Dropping Player...' : 'Drop Player'}
              </button>

              {selectedDropPlayer && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Warning:</strong> This will mark {selectedDropPlayer.leagueName || 'the selected player'} as dropped from this league. They will no longer appear in active standings.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Replacement Player Modal */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Replacement Player
              </h3>
              <button
                onClick={() => {
                  setShowAddPlayerModal(false);
                  setAddPlayerEmail('');
                  setAddPlayerLeagueName('');
                  setAddPlayerFaction('');
                  setReplacingPlayerId('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Player to Replace */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Player to Replace <span className="text-red-500">*</span>
                </label>
                <select
                  value={replacingPlayerId}
                  onChange={(e) => setReplacingPlayerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select player to replace...</option>
                  {league?.league_players?.filter((p: any) => p.status !== 'dropped').map((player: any) => (
                    <option key={player.documentId} value={player.documentId}>
                      {player.leagueName || player.player?.name || `Player ${player.documentId}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  All matches will be transferred to the new player
                </p>
              </div>

              {/* User Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  User Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={addPlayerEmail}
                  onChange={(e) => setAddPlayerEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  User must have an existing account
                </p>
              </div>

              {/* League Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  League Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addPlayerLeagueName}
                  onChange={(e) => setAddPlayerLeagueName(e.target.value)}
                  placeholder="Player display name in league"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Faction Selection */}
              {availableFactions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Faction (Optional)
                  </label>
                  <select
                    value={addPlayerFaction}
                    onChange={(e) => setAddPlayerFaction(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a faction</option>
                    {availableFactions.map((faction) => (
                      <option key={faction} value={faction}>
                        {faction}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Add Button */}
              <button
                onClick={handleAddPlayer}
                disabled={!addPlayerEmail || !addPlayerLeagueName || !replacingPlayerId || addPlayerLoading}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addPlayerLoading ? 'Adding Replacement Player...' : 'Add Replacement Player'}
              </button>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> The user must already have an account. The replacement player will inherit the stats and all scheduled matches from the player being replaced. The replaced player will be marked as dropped.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Pools Modal */}
      {showCreatePoolsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create Pools
              </h3>
              <button
                onClick={() => {
                  setShowCreatePoolsModal(false);
                  setNumberOfPools(1);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Pools to Create (1-25)
                </label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={numberOfPools}
                  onChange={(e) => setNumberOfPools(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> This will create {numberOfPools} duplicate{numberOfPools > 1 ? 's' : ''} of this league named "Pool B", "Pool C", etc. Each pool will have the same settings but no players or matches. You'll need to manually rename this league to "Pool A" and move players to the appropriate pools.
                </p>
              </div>

              <button
                onClick={handleCreatePools}
                disabled={createPoolsLoading || numberOfPools < 1 || numberOfPools > 25}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createPoolsLoading ? 'Creating Pools...' : `Create ${numberOfPools} Pool${numberOfPools > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}