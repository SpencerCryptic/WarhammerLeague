"use client";
import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation';
import ArmyListManager from './ArmyListManager';
import ChangeFactionButton from './ChangeFactionButton';

const PlayerDetailsComponent = () => {
  const [leaguePlayer, setLeaguePlayer] = useState<any>(null)
  const [league, setLeague] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [showArmyListManager, setShowArmyListManager] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const pathName: string[] = usePathname().split('/');
  const leagueDocumentId = pathName[2];

  useEffect(() => {
    // Get user from localStorage safely
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  const fetchLeagueData = () => {
    if (!leagueDocumentId) return;

    fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues/${leagueDocumentId}`)
      .then((res) => res.json())
      .then((data) => {
        setLeague(data.data);
        const currentLeaguePlayer = data.data.league_players.find((lp: any) => {
          return user ? lp.player.email === user.email : null
        });
        setLeaguePlayer(currentLeaguePlayer)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLeagueData();
  }, [leagueDocumentId, user])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-600 dark:text-gray-300">Loading player details...</div>
      </div>
    );
  }

  if (!leaguePlayer) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-8">
        <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-200">Player Details</h3>
        <p className="text-gray-600 dark:text-gray-400">
          You haven't joined this league yet.
        </p>
      </div>
    );
  }

  const armyLists = leaguePlayer?.armyLists || [];

  return (
    <div className="space-y-6">
      {/* Player Info Header */}
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 capitalize">
              {leaguePlayer.leagueName}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">{leaguePlayer.faction}</p>
            <div className="flex space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span>W: {leaguePlayer.wins}</span>
              <span>D: {leaguePlayer.draws}</span>
              <span>L: {leaguePlayer.losses}</span>
              <span>Pts: {leaguePlayer.rankingPoints}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <ChangeFactionButton
              leaguePlayerId={leaguePlayer.documentId}
              currentFaction={leaguePlayer.faction}
              gameSystem={league?.gameSystem || ''}
              leagueStatus={league?.statusleague || 'planned'}
              onFactionChanged={fetchLeagueData}
            />
            <button
              onClick={() => setShowArmyListManager(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 flex items-center"
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Manage Army Lists
            </button>
          </div>
        </div>
      </div>

      {/* Army Lists Section */}
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Army Lists ({armyLists.length})
          </h3>
        </div>
        <div className="p-6">
          {armyLists.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                No army lists added yet
              </div>
              <button
                onClick={() => setShowArmyListManager(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Add Your First List
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {armyLists.map((list: any, index: number) => (
                <div 
                  key={list.id || index} 
                  className={`border rounded-lg p-4 ${
                    list.isActive 
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{list.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{list.faction}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {list.isActive && (
                          <span className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full">
                            Active
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Created: {new Date(list.createdDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded p-3">
                    <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {list.listContent.substring(0, 300)}
                      {list.listContent.length > 300 && '...'}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Army List Manager Modal */}
      {showArmyListManager && (
        <ArmyListManager
          leaguePlayerId={leaguePlayer.documentId}
          currentFaction={leaguePlayer.faction}
          onClose={() => setShowArmyListManager(false)}
        />
      )}
    </div>
  )
}

export default PlayerDetailsComponent