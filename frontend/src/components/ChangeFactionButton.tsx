'use client';

import { useState } from 'react';

interface ChangeFactionButtonProps {
  leaguePlayerId: string;
  currentFaction: string;
  gameSystem: string;
  leagueStatus: string;
  onFactionChanged: () => void;
}

export default function ChangeFactionButton({
  leaguePlayerId,
  currentFaction,
  gameSystem,
  leagueStatus,
  onFactionChanged
}: ChangeFactionButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFaction, setNewFaction] = useState(currentFaction);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Only allow faction changes when league is planned
  // If league is ongoing or completed, don't show the button
  if (leagueStatus !== 'planned') {
    return null;
  }

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
      'Warhammer: The Old World': [
        'Tomb Kings of Khemri',
        'Kingdom of Bretonnia',
        'Empire of Man',
        'Orc & Goblin Tribes',
        'Dwarfen Mountain Holds',
        'High Elves',
        'Wood Elves',
        'Warriors of Chaos',
        'Beastmen Brayherds',
        'Dark Elves',
        'Skaven',
        'Vampire Counts',
        'Lizardmen',
        'Ogre Kingdoms',
        'Daemons of Chaos',
        'Cathay'
      ],
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
        setError('You must be logged in to change faction');
        setLoading(false);
        return;
      }

      const response = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues/players/${leaguePlayerId}/faction`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ faction: newFaction }),
      });

      if (response.ok) {
        setIsModalOpen(false);
        onFactionChanged();
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to change faction');
      }
    } catch (error) {
      setError('Error changing faction');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
      >
        Change Faction
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Change Faction</h2>
              <button
                onClick={() => setIsModalOpen(false)}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Faction
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-900 dark:text-white">
                  {currentFaction || 'None'}
                </div>
              </div>

              {factionOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Faction
                  </label>
                  <select
                    value={newFaction}
                    onChange={(e) => setNewFaction(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
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

              <div className="text-sm text-gray-600 dark:text-gray-400">
                Note: You can only change your faction while the league is in planned status.
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newFaction || newFaction === currentFaction}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Faction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
