'use client';

import { useState } from 'react';

interface CreateLeagueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateLeagueModal({ isOpen, onClose }: CreateLeagueModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    gameSystem: '',
    format: '',
    startDate: '',
    leaguePassword: '',
    statusleague: 'upcoming',
    rulesetType: 'cryptic_cabin_standard'
  });

  const [loading, setLoading] = useState(false);

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

  const formatOptions = [
    { value: 'round_robin', label: 'Round Robin' },
    { value: 'single_elimination', label: 'Single Elimination' },
    { value: 'double_elimination', label: 'Double Elimination' },
    { value: 'group_to_elimination', label: 'Group to Elimination' }
  ];

  const rulesetOptions = [
    { value: 'cryptic_cabin_standard', label: 'Cryptic Cabin Standard' },
    { value: 'custom', label: 'Custom Rules' }
  ];

  const getCrypticCabinScoring = () => ({
    gameWon: 4,
    gameDrawn: 2,
    gameLost: 0,
    bonusPoints: {
      lostButScored50Percent: 1,
      scoredAllPrimaryObjectives: 1
    },
    maxPointsPerGame: 5
  });

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    // ✅ Fixed: Use 'token' instead of 'authToken'
    const token = localStorage.getItem('token');
    
    console.log('🔍 Token:', token); // Debug log
    
    if (!token) {
      alert('You must be logged in to create a league');
      return;
    }

    // ✅ Fixed: Prepare data without wrapping in 'data' object
    const requestData = {
      ...formData,
      statusleague: 'planned', // ✅ Fixed: Use valid status value
      // Convert description to blocks format if needed
      description: formData.description ? [
        {
          type: 'paragraph',
          children: [{ type: 'text', text: formData.description }]
        }
      ] : [],
      // Add scoring rules based on ruleset type
      scoringRules: formData.rulesetType === 'cryptic_cabin_standard' 
        ? getCrypticCabinScoring() 
        : {
            gameWon: 3,
            gameDrawn: 1,
            gameLost: 0,
            bonusPoints: {
              lostButScored50Percent: 0,
              scoredAllPrimaryObjectives: 0
            },
            maxPointsPerGame: 3
          }
    };

    console.log('🔍 Sending data:', requestData); // Debug log

    const response = await fetch('http://localhost:1337/api/leagues', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      // ✅ Fixed: Send data directly, not wrapped in 'data' object
      body: JSON.stringify(requestData),
    });

    console.log('🔍 Response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('🔍 Success:', result);
      
      setFormData({
        name: '',
        description: '',
        gameSystem: '',
        format: '',
        startDate: '',
        leaguePassword: '',
        statusleague: 'planned',
        rulesetType: 'cryptic_cabin_standard'
      });
      
      onClose();
      window.location.reload();
    } else {
      const errorText = await response.text();
      console.error('🔍 Error response:', errorText);
      alert(`Failed to create league: ${errorText}`);
    }
  } catch (error) {
    console.error('🔍 Error creating league:', error);
    alert('Error creating league');
  } finally {
    setLoading(false);
  }
};

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New League</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              League Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Game System *
            </label>
            <select
              name="gameSystem"
              value={formData.gameSystem}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Select a game system</option>
              {gameSystemOptions.map((system) => (
                <option key={system} value={system}>
                  {system}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Format *
            </label>
            <select
              name="format"
              value={formData.format}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Select a format</option>
              {formatOptions.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Scoring Rules *
            </label>
            <select
              name="rulesetType"
              value={formData.rulesetType}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {rulesetOptions.map((ruleset) => (
                <option key={ruleset.value} value={ruleset.value}>
                  {ruleset.label}
                </option>
              ))}
            </select>
            {formData.rulesetType === 'cryptic_cabin_standard' && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm text-blue-700 dark:text-blue-300">
                <strong>Cryptic Cabin Standard:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Win: 4 points</li>
                  <li>• Draw: 2 points</li>
                  <li>• Loss: 0 points</li>
                  <li>• +1 bonus: Lost but scored 50%+ of opponent's points</li>
                  <li>• +1 bonus: Scored all primary objectives on 3+ turns</li>
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date *
            </label>
            <input
              type="datetime-local"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              League Password (optional)
            </label>
            <input
              type="text"
              name="leaguePassword"
              value={formData.leaguePassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

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
              {loading ? 'Creating...' : 'Create League'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}