'use client';

import { useState, useEffect } from 'react';
import { Match } from './MatchesDashboard';

interface ScoreReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  userLeaguePlayerName: string;
  league: any;
}

export default function ScoreReportModal({ 
  isOpen, 
  onClose, 
  match, 
  userLeaguePlayerName,
  league 
}: ScoreReportModalProps) {
  const [formData, setFormData] = useState({
    leaguePlayer1Score: '',
    leaguePlayer2Score: '',
    leaguePlayer1BonusPoints: {
      lostButScored50Percent: false,
      scoredAllPrimaryObjectives: false
    },
    leaguePlayer2BonusPoints: {
      lostButScored50Percent: false,
      scoredAllPrimaryObjectives: false
    },
    leaguePlayer1ArmyListId: '',
    leaguePlayer2ArmyListId: ''
  });

  const [loading, setLoading] = useState(false);
  const [player1Lists, setPlayer1Lists] = useState<any[]>([]);
  const [player2Lists, setPlayer2Lists] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isCrypticCabinScoring = league?.rulesetType === 'cryptic_cabin_standard';

  // Fetch army lists for both players when modal opens
  useEffect(() => {
    if (isOpen && match) {
      fetchPlayerLists();
    }
  }, [isOpen, match]);

  const fetchPlayerLists = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Determine which player is the current user
      const isPlayer1 = match?.leaguePlayer1?.leagueName === userLeaguePlayerName;
      const isPlayer2 = match?.leaguePlayer2?.leagueName === userLeaguePlayerName;

      // Fetch player 1 lists
      if (match?.leaguePlayer1?.documentId) {
        const response1 = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/league-players/${match.leaguePlayer1.documentId}?populate=*`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response1.ok) {
          const data1 = await response1.json();
          const lists1 = data1.data?.armyLists || [];
          setPlayer1Lists(lists1);
          
          // Auto-select active list
          const activeList1 = lists1.find((list: any) => list.isActive);
          if (activeList1) {
            setFormData(prev => ({ ...prev, leaguePlayer1ArmyListId: activeList1.id }));
          }
        }
      }

      // Fetch player 2 lists
      if (match?.leaguePlayer2?.documentId) {
        const response2 = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/league-players/${match.leaguePlayer2.documentId}?populate=*`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response2.ok) {
          const data2 = await response2.json();
          const lists2 = data2.data?.armyLists || [];
          setPlayer2Lists(lists2);
          
          // Auto-select active list
          const activeList2 = lists2.find((list: any) => list.isActive);
          if (activeList2) {
            setFormData(prev => ({ ...prev, leaguePlayer2ArmyListId: activeList2.id }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching army lists:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to report scores');
        setLoading(false);
        return;
      }

      const response = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/matches/${match?.documentId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          leaguePlayer1Score: parseInt(formData.leaguePlayer1Score),
          leaguePlayer2Score: parseInt(formData.leaguePlayer2Score),
          leaguePlayer1BonusPoints: formData.leaguePlayer1BonusPoints,
          leaguePlayer2BonusPoints: formData.leaguePlayer2BonusPoints,
          leaguePlayer1ArmyListId: formData.leaguePlayer1ArmyListId,
          leaguePlayer2ArmyListId: formData.leaguePlayer2ArmyListId
        }),
      });

      if (response.ok) {
        onClose();
        window.location.reload();
      } else {
        let errorMessage = 'Failed to report score';
        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        }
        setError(errorMessage);
      }
    } catch (error) {
      setError('Error reporting score. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = 'checked' in e.target ? e.target.checked : false;
    
    if (name.includes('BonusPoints')) {
      const [player, bonusType] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [player]: {
          ...prev[player as keyof typeof prev.leaguePlayer1BonusPoints],
          [bonusType]: checked
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  if (!isOpen || !match) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Report Match Score</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Match Details</h3>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p><strong>{match.leaguePlayer1?.leagueName}</strong> vs <strong>{match.leaguePlayer2?.leagueName}</strong></p>
              <p className="mt-1">{match.leaguePlayer1?.faction} vs {match.leaguePlayer2?.faction}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => setError(null)}
                    className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {match.leaguePlayer1?.leagueName} Score *
              </label>
              <input
                type="number"
                name="leaguePlayer1Score"
                value={formData.leaguePlayer1Score}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {match.leaguePlayer2?.leagueName} Score *
              </label>
              <input
                type="number"
                name="leaguePlayer2Score"
                value={formData.leaguePlayer2Score}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          {/* Army List Selection */}
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Army Lists Used</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                Select your army list. Your opponent's active list will be automatically used.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Player 1 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {match.leaguePlayer1?.leagueName} Army List
                    {match.leaguePlayer1?.leagueName === userLeaguePlayerName && <span className="text-orange-600 dark:text-orange-400 ml-1">(You)</span>}
                  </label>
                  
                  {match.leaguePlayer1?.leagueName === userLeaguePlayerName ? (
                    // Current user - allow selection
                    <>
                      <select
                        name="leaguePlayer1ArmyListId"
                        value={formData.leaguePlayer1ArmyListId}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Select your list...</option>
                        {player1Lists.map((list) => (
                          <option key={list.id} value={list.id}>
                            {list.name} {list.isActive ? '(Active)' : ''}
                          </option>
                        ))}
                      </select>
                      {player1Lists.length === 0 && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          You need to create an army list first.
                        </p>
                      )}
                    </>
                  ) : (
                    // Opponent - show their active list
                    <>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                        {(() => {
                          const activeList = player1Lists.find((list) => list.isActive);
                          return activeList ? `${activeList.name} (Active List)` : 'No active list';
                        })()}
                      </div>
                      {player1Lists.find((list) => list.isActive) ? null : (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Opponent has no active army list.
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Player 2 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {match.leaguePlayer2?.leagueName} Army List
                    {match.leaguePlayer2?.leagueName === userLeaguePlayerName && <span className="text-orange-600 dark:text-orange-400 ml-1">(You)</span>}
                  </label>
                  
                  {match.leaguePlayer2?.leagueName === userLeaguePlayerName ? (
                    // Current user - allow selection
                    <>
                      <select
                        name="leaguePlayer2ArmyListId"
                        value={formData.leaguePlayer2ArmyListId}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Select your list...</option>
                        {player2Lists.map((list) => (
                          <option key={list.id} value={list.id}>
                            {list.name} {list.isActive ? '(Active)' : ''}
                          </option>
                        ))}
                      </select>
                      {player2Lists.length === 0 && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          You need to create an army list first.
                        </p>
                      )}
                    </>
                  ) : (
                    // Opponent - show their active list
                    <>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-600 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                        {(() => {
                          const activeList = player2Lists.find((list) => list.isActive);
                          return activeList ? `${activeList.name} (Active List)` : 'No active list';
                        })()}
                      </div>
                      {player2Lists.find((list) => list.isActive) ? null : (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Opponent has no active army list.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isCrypticCabinScoring && (
            <div className="space-y-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">Bonus Points (Cryptic Cabin Standard)</h4>
                <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                  Select applicable bonus points for each player:
                </p>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">{match.leaguePlayer1?.leagueName}</h5>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="leaguePlayer1BonusPoints.lostButScored50Percent"
                          checked={formData.leaguePlayer1BonusPoints.lostButScored50Percent}
                          onChange={handleChange}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Lost but scored 50%+ of opponent's points (+1)
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="leaguePlayer1BonusPoints.scoredAllPrimaryObjectives"
                          checked={formData.leaguePlayer1BonusPoints.scoredAllPrimaryObjectives}
                          onChange={handleChange}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Scored all primary objectives 3+ turns (+1)
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">{match.leaguePlayer2?.leagueName}</h5>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="leaguePlayer2BonusPoints.lostButScored50Percent"
                          checked={formData.leaguePlayer2BonusPoints.lostButScored50Percent}
                          onChange={handleChange}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Lost but scored 50%+ of opponent's points (+1)
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="leaguePlayer2BonusPoints.scoredAllPrimaryObjectives"
                          checked={formData.leaguePlayer2BonusPoints.scoredAllPrimaryObjectives}
                          onChange={handleChange}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Scored all primary objectives 3+ turns (+1)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Reporting...' : 'Report Score'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}