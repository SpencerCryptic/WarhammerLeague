'use client';

import { useState } from 'react';

interface JoinLeagueModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagueId: string;
  hasPassword: boolean;
  gameSystem: string;
}

export default function JoinLeagueModal({ 
  isOpen, 
  onClose, 
  leagueId, 
  hasPassword, 
  gameSystem 
}: JoinLeagueModalProps) {
  const [formData, setFormData] = useState({
    faction: '',
    password: '',
    goodFaithAccepted: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Game system specific factions
  const getFactionOptions = (gameSystem: string) => {
    const factionMap: { [key: string]: string[] } = {
      'Warhammer: 40,000': [
        'Space Marines (Astartes)',
        'Black Templars',
        'Blood Angels',
        'Dark Angels',
        'Deathwatch',
        'Grey Knights',
        'Imperial Fists',
        'Iron Hands',
        'Raven Guard',
        'Salamanders',
        'Space Marines',
        'Space Wolves',
        'Ultramarines',
        'White Scars',
        'Aeldari',
        'Aeldari Craftworlds',
        'Drukhari',
        'Chaos',
        'Chaos Daemons',
        'Chaos Knights',
        'Chaos Space Marines',
        'Death Guard',
        'Emperor\'s Children',
        'Thousand Sons',
        'World Eaters',
        'Tyranids',
        'Tyranid Swarm',
        'Genestealer Cults',
        'Imperium',
        'Adepta Sororitas',
        'Adeptus Custodes',
        'Adeptus Mechanicus',
        'Astra Militarum',
        'Imperial Knights',
        'Leagues of Votann',
        'Orks',
        'T\'au Empire',
        'Necrons'
      ],
      'Warhammer: Age of Sigmar': [
        'Stormcast Eternals', 'Khorne Bloodbound', 'Sylvaneth', 'Fyreslayers',
        'Seraphon', 'Slaves to Darkness', 'Nighthaunt', 'Daughters of Khaine'
      ],
      'Warhammer: Kill Team': [
        'Adeptus Astartes', 'Death Korps of Krieg', 'Ork Kommandos',
        'Tau Pathfinders', 'Tyranid Genestealers', 'Chaos Cultists'
      ],
      'A Song of Ice and Fire': [
        'Stark', 'Lannister', 'Free Folk', 'Nights Watch', 'Baratheon',
        'Targaryen', 'Greyjoy', 'Martell', 'Bolton', 'Brotherhood Without Banners', 'Neutral'
      ],
      'Warhammer: The Horus Heresy': [
        'Dark Angels', 'White Scars', 'Space Wolves', 'Imperial Fists', 'Blood Angels',
        'Iron Hands', 'Ultramarines', 'Salamanders', 'Raven Guard',
        'Sons of Horus', 'World Eaters', 'Emperor\'s Children', 'Death Guard',
        'Thousand Sons', 'Word Bearers', 'Iron Warriors', 'Night Lords', 'Alpha Legion',
        'Mechanicum', 'Legio Custodes', 'Sisters of Silence', 'Solar Auxilia',
        'Imperialis Auxilia', 'Questoris Knights', 'Daemons of the Ruinstorm', 'Blackshields'
      ],
      // Add more as needed
    };

    return factionMap[gameSystem] || [];
  };

  const factionOptions = getFactionOptions(gameSystem);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to join a league');
        setLoading(false);
        return;
      }

      const response = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues/${leagueId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          faction: formData.faction,
          password: formData.password,
          goodFaithAccepted: formData.goodFaithAccepted
        }),
      });

      if (response.ok) {
        // Success - close modal and refresh page
        onClose();
        window.location.reload();
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to join league');
      }
    } catch (error) {
      setError('Error joining league');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Join League</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {factionOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Faction
              </label>
              <select
                name="faction"
                value={formData.faction}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select a faction</option>
                {factionOptions.map((faction) => (
                  <option key={faction} value={faction}>
                    {faction}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hasPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                League Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          )}

          <div className="flex items-start">
            <input
              type="checkbox"
              name="goodFaithAccepted"
              checked={formData.goodFaithAccepted}
              onChange={handleChange}
              required
              className="mt-1 mr-2"
            />
            <label className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">Good Faith Commitment *</span>
              <br />
              I commit to playing matches in good faith, being respectful to other players, 
              and following the league rules and schedule.
            </label>
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
              disabled={loading || !formData.goodFaithAccepted}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : 'Join League'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}