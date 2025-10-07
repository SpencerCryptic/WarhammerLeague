'use client';

import React, { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

interface League {
  id: string;
  documentId: string;
  name: string;
  statusleague: string;
  gameSystem: string;
  league_players?: any[];
}

interface CreateKnockoutTournamentProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tournament: any) => void;
}

export default function CreateKnockoutTournament({ isOpen, onClose, onSuccess }: CreateKnockoutTournamentProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gameSystem, setGameSystem] = useState('Warhammer: 40,000');
  const [sourceLeagues, setSourceLeagues] = useState<string[]>([]);
  const [availableLeagues, setAvailableLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const gameSystemOptions = [
    'Warhammer: 40,000',
    'Warhammer: Age of Sigmar',
    'Warhammer: Kill Team',
    'Warhammer: Warcry',
    'Warhammer: Necromunda',
    'A Song of Ice and Fire',
    'Middle Earth SBG',
    'Marvel Crisis Protocol',
    'Conquest'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchAvailableLeagues();
    }
  }, [isOpen]);

  const fetchAvailableLeagues = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/leagues`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter completed leagues that have players
        const completedLeagues = data.data.filter((league: League) => 
          league.statusleague === 'completed' && league.league_players && league.league_players.length > 0
        );
        setAvailableLeagues(completedLeagues);
      } else {
        setError('Failed to fetch leagues');
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
      setError('Error fetching leagues');
    } finally {
      setLoading(false);
    }
  };

  const handleSourceLeagueToggle = (leagueId: string) => {
    setSourceLeagues(prev => 
      prev.includes(leagueId) 
        ? prev.filter(id => id !== leagueId)
        : [...prev, leagueId]
    );
  };

  const getTotalPlayers = () => {
    return sourceLeagues.reduce((total, leagueId) => {
      const league = availableLeagues.find(l => l.documentId === leagueId);
      return total + (league?.league_players?.length || 0);
    }, 0);
  };

  const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalPlayers = getTotalPlayers();
    if (!isPowerOfTwo(totalPlayers)) {
      setError(`Total players must be a power of 2 (2, 4, 8, 16, etc.). Currently: ${totalPlayers}`);
      return;
    }

    setCreating(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/leagues/create-knockout-tournament`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          gameSystem,
          sourceLeagueIds: sourceLeagues,
          format: 'single_elimination'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        onSuccess?.(result.data);
        onClose();
        // Reset form
        setName('');
        setDescription('');
        setSourceLeagues([]);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to create tournament');
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      setError('Error creating tournament');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Knockout Tournament</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tournament Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="e.g. Summer Championship Finals"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Tournament description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Game System
            </label>
            <select
              value={gameSystem}
              onChange={(e) => setGameSystem(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {gameSystemOptions.map(system => (
                <option key={system} value={system}>{system}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Source Leagues ({sourceLeagues.length} selected)
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Select completed leagues to pull players from. Total players: {getTotalPlayers()}
              {getTotalPlayers() > 0 && !isPowerOfTwo(getTotalPlayers()) && (
                <span className="text-red-500 ml-2">⚠️ Must be power of 2!</span>
              )}
            </p>
            
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3">
                {availableLeagues.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No completed leagues available</p>
                ) : (
                  availableLeagues.map(league => (
                    <label key={league.documentId} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sourceLeagues.includes(league.documentId)}
                        onChange={() => handleSourceLeagueToggle(league.documentId)}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{league.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {league.gameSystem} • {league.league_players?.length || 0} players
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || sourceLeagues.length === 0 || !isPowerOfTwo(getTotalPlayers())}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}