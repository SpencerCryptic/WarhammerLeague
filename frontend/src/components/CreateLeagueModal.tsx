'use client';

import { useState, useCallback, useEffect } from 'react';

const API_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com';

interface CreateLeagueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateLeagueModal({ isOpen, onClose }: CreateLeagueModalProps) {
  console.log('🔍 CreateLeagueModal rendered, isOpen:', isOpen);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    gameSystem: '',
    format: '',
    startDate: '',
    leaguePassword: '',
    useOTP: false,
    statusleague: 'upcoming',
    rulesetType: 'cryptic_cabin_standard',
    customScoring: {
      gameWon: 3,
      gameDrawn: 1,
      gameLost: 0
    }
  });

  const [loading, setLoading] = useState(false);

  // Debug: Track when modal state changes
  useEffect(() => {
    console.log('🔍 Modal formData changed:', formData);
  }, [formData]);

  const gameSystemOptions = [
    'Warhammer: 40,000',
    'Warhammer: Age of Sigmar',
    'Warhammer: Kill Team',
    'Warhammer: The Horus Heresy',
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
    { value: 'cryptic_cabin_standard_no_bonus', label: 'Cryptic Cabin Standard No Bonus' },
    { value: 'cryptic_cabin_standard', label: 'Cryptic Cabin Standard' },
    { value: 'custom', label: 'Custom Rules' }
  ];

  const getCrypticCabinStandardNoBonus = () => ({
    gameWon: 3,
    gameDrawn: 1,
    gameLost: 0,
    bonusPoints: {
      lostButScored50Percent: 0
    },
    maxPointsPerGame: 3
  });

  const getCrypticCabinScoring = () => ({
    gameWon: 4,
    gameDrawn: 2,
    gameLost: 0,
    bonusPoints: {
      lostButScored50Percent: 1
    },
    maxPointsPerGame: 5
  });

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  console.log('🔍 handleSubmit called with formData:', formData);

  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      alert('You must be logged in to create a league');
      setLoading(false);
      return;
    }

    // Validate required fields
    console.log('🔍 Validating required fields...');
    
    if (!formData.name || !formData.name.trim()) {
      console.log('🚫 Validation failed: League name is required');
      alert('League name is required');
      setLoading(false);
      return;
    }
    
    if (!formData.gameSystem) {
      console.log('🚫 Validation failed: Game system is required');
      alert('Game system is required');
      setLoading(false);
      return;
    }
    
    if (!formData.format) {
      console.log('🚫 Validation failed: Format is required');
      alert('Format is required');
      setLoading(false);
      return;
    }
    
    if (!formData.startDate) {
      console.log('🚫 Validation failed: Start date is required');
      alert('Start date is required');
      setLoading(false);
      return;
    }
    
    console.log('✅ All validation passed, proceeding with league creation...');

    const requestData = {
      ...formData,
      statusleague: 'planned',
      description: formData.description ? [
        {
          type: 'paragraph',
          children: [{ type: 'text', text: formData.description }]
        }
      ] : [],
      scoringRules: formData.rulesetType === 'cryptic_cabin_standard_no_bonus'
        ? getCrypticCabinStandardNoBonus()
        : formData.rulesetType === 'cryptic_cabin_standard'
        ? getCrypticCabinScoring()
        : {
            gameWon: formData.customScoring.gameWon,
            gameDrawn: formData.customScoring.gameDrawn,
            gameLost: formData.customScoring.gameLost,
            bonusPoints: {
              lostButScored50Percent: 0
            },
            maxPointsPerGame: formData.customScoring.gameWon
          },
      // Ensure league is published, not draft
      publishedAt: new Date().toISOString()
    };

    console.log('🔍 CreateLeagueModal: Sending data:', requestData);

    const response = await fetch(`${API_URL}/api/leagues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ data: requestData }),
    });

    if (response.ok) {
      const result = await response.json();
      
      setFormData({
        name: '',
        description: '',
        gameSystem: '',
        format: '',
        startDate: '',
        leaguePassword: '',
        useOTP: false,
        statusleague: 'planned',
        rulesetType: 'cryptic_cabin_standard',
        customScoring: {
          gameWon: 3,
          gameDrawn: 1,
          gameLost: 0
        }
      });
      
      onClose();
      window.location.reload();
    } else {
      const errorText = await response.text();
      alert(`Failed to create league: ${errorText}`);
    }
  } catch (error) {
    console.error('Error creating league:', error);
    alert('Error creating league');
  } finally {
    setLoading(false);
  }
};

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    
    // For checkbox inputs, use checked value; for others use value
    const inputValue = type === 'checkbox' ? checked : value;
    
    console.log('🔍 handleChange called:', { name, value, type, checked, inputValue });
    
    // Handle nested customScoring fields
    if (name.startsWith('customScoring.')) {
      const field = name.split('.')[1];
      setFormData(prevData => {
        const newFormData = {
          ...prevData,
          customScoring: {
            ...prevData.customScoring,
            [field]: parseInt(value) || 0
          }
        };
        console.log('🔍 Setting formData (customScoring):', newFormData);
        return newFormData;
      });
    } else {
      setFormData(prevData => {
        const newFormData = {
          ...prevData,
          [name]: inputValue
        };
        console.log('🔍 Setting formData (normal):', newFormData);
        return newFormData;
      });
    }
  }, []);

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

        <form onSubmit={handleSubmit} className="space-y-4" onSubmitCapture={(e) => console.log('🔍 Form onSubmitCapture triggered', e)}>
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
            {formData.rulesetType === 'cryptic_cabin_standard_no_bonus' && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm text-blue-700 dark:text-blue-300">
                <strong>Cryptic Cabin Standard No Bonus:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Win: 3 points</li>
                  <li>• Draw: 1 point</li>
                  <li>• Loss: 0 points</li>
                </ul>
              </div>
            )}
            {formData.rulesetType === 'cryptic_cabin_standard' && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm text-blue-700 dark:text-blue-300">
                <strong>Cryptic Cabin Standard:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Win: 4 points</li>
                  <li>• Draw: 2 points</li>
                  <li>• Loss: 0 points</li>
                  <li>• +1 bonus: Lost but scored 50%+ of opponent's points</li>
                </ul>
              </div>
            )}
            {formData.rulesetType === 'custom' && (
              <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-3">Custom Scoring Configuration</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                      Points for Win
                    </label>
                    <input
                      type="number"
                      name="customScoring.gameWon"
                      value={formData.customScoring.gameWon}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-2 py-1 text-sm border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 dark:bg-green-800/20 dark:border-green-600 dark:text-green-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                      Points for Draw
                    </label>
                    <input
                      type="number"
                      name="customScoring.gameDrawn"
                      value={formData.customScoring.gameDrawn}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-2 py-1 text-sm border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 dark:bg-green-800/20 dark:border-green-600 dark:text-green-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                      Points for Loss
                    </label>
                    <input
                      type="number"
                      name="customScoring.gameLost"
                      value={formData.customScoring.gameLost}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-2 py-1 text-sm border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 dark:bg-green-800/20 dark:border-green-600 dark:text-green-100"
                    />
                  </div>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  Note: Bonus point configurations are temporarily disabled and will be added in a future update.
                </p>
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
              placeholder="Leave empty for open league"
            />
            
            {/* OTP Checkbox - only show if league has password */}
            {formData.leaguePassword && (
              <div className="mt-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="useOTP"
                    checked={formData.useOTP}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Use OTP (One-Time Password) system instead of fixed password
                  </span>
                </label>
                
                {formData.useOTP && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          OTP System Enabled
                        </h3>
                        <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                          Players will need to request a One-Time Password from you to join. 
                          You'll be able to generate and manage OTPs after creating the league.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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