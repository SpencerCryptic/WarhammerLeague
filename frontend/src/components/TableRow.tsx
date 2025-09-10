"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { use, useEffect, useRef, useState } from 'react'
import { Match } from './MatchesDashboard';
import ArmyListManager from './ArmyListManager';

export interface LeaguePlayer {
  documentId: string,
  leagueName: string, 
  faction: string,
  wins: number,
  draws: number,
  losses: number,
  rankingPoints: number,
  armyLists: any[]
}

const TableRow = () => {
  
  const [leaguePlayers, setLeaguePlayers] = useState<LeaguePlayer[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [activeList, setActiveList] = useState({id: '', list: ''})
  const [showArmyListManager, setShowArmyListManager] = useState(false)
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [selectedPlayerFaction, setSelectedPlayerFaction] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const getLeague = (documentId: string) => {
    useEffect(() => {
      fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues/${documentId}`)
      .then((res) => res.json())
      .then((data) => {
          setMatches(data.data.matches || [])
          const players = data.data.league_players || [];
          const sortedPlayers = players.sort((a: LeaguePlayer, b: LeaguePlayer) => {
            if (b.rankingPoints - a.rankingPoints != 0 ) {
              return b.rankingPoints - a.rankingPoints;
            }
            let aVictoryPoints = 0
            let bVictoryPoints = 0
            data.data.matches.forEach((match: Match) => {
              if (match.leaguePlayer1.documentId === a.documentId) {
                aVictoryPoints += match.leaguePlayer1Score;
              } else if (match.leaguePlayer2.documentId === a.documentId) {
                aVictoryPoints += match.leaguePlayer2Score;
              } else if (match.leaguePlayer2.documentId === b.documentId) {
                bVictoryPoints += match.leaguePlayer2Score;
              } else if (match.leaguePlayer2.documentId === b.documentId) {
                bVictoryPoints += match.leaguePlayer2Score;
              }
            })
            return bVictoryPoints - aVictoryPoints;
          });
          setLeaguePlayers(sortedPlayers);
          setIsLoading(false);
      });
    }, []) 
  }
  
  const toggleExpand = (event: React.MouseEvent<HTMLButtonElement>, documentId: string) => {
    setActiveList({
      id: documentId, 
      list: documentId === '' ? '' : JSON.stringify(leaguePlayers.find((player: LeaguePlayer) => player.documentId === documentId)?.armyLists || [])
    })
  }
  
  const copylist = (event: React.MouseEvent<HTMLButtonElement>, list: string) => {
    navigator.clipboard.writeText(list)
  }

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${position}`;
    }
  }

  const getRankStyle = (position: number) => {
    switch (position) {
      case 1: return 'text-yellow-500 font-bold';
      case 2: return 'text-gray-400 font-bold';
      case 3: return 'text-amber-600 font-bold';
      default: return 'text-gray-600 dark:text-gray-400 font-medium';
    }
  }

  const getVictoryPoints = (player: LeaguePlayer) => {
    let victoryPoints = 0;
    matches.forEach((match: Match) => {
      if (match.leaguePlayer1.documentId === player.documentId) {
        victoryPoints += match.leaguePlayer1Score;
      } else if (match.leaguePlayer2.documentId === player.documentId) {
        victoryPoints += match.leaguePlayer2Score;
      }
    });
    return victoryPoints;
  }

  const getWinRate = (player: LeaguePlayer) => {
    const total = player.wins + player.draws + player.losses;
    if (total === 0) return 0;
    return Math.round((player.wins / total) * 100);
  }

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('https://accessible-positivity-e213bb2958.strapiapp.com/api/users/me?populate=player', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);

  const pathName: string[] = usePathname().split('/')
  const documentId = pathName[2]
  getLeague(documentId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white text-xl">Loading standings...</div>
      </div>
    );
  }

  if (leaguePlayers.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-8">
        <h3 className="text-2xl font-bold mb-3 text-gray-800 dark:text-gray-200">No Players Yet</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Players will appear here once they join the league.
        </p>
      </div>
    );
  }
    
  return (
    <div className="w-full">
      {activeList.id === '' ? (
        <div className="space-y-6">
          {/* League Standings Header */}
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
              <span className="w-1 h-8 bg-orange-500 mr-3 rounded-full"></span>
              League Standings
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {leaguePlayers.length} players competing • Ranked by league points
            </p>
          </div>

          {/* League Table */}
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Pos
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="text-center py-4 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Pl
                    </th>
                    <th className="text-center py-4 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      W
                    </th>
                    <th className="text-center py-4 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      D
                    </th>
                    <th className="text-center py-4 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      L
                    </th>
                    <th className="text-center py-4 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      VP
                    </th>
                    <th className="text-center py-4 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      WR
                    </th>
                    <th className="text-center py-4 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Pts
                    </th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {leaguePlayers.map((player: LeaguePlayer, index: number) => {
                    const position = index + 1;
                    const totalGames = player.wins + player.draws + player.losses;
                    const victoryPoints = getVictoryPoints(player);
                    const winRate = getWinRate(player);
                    
                    return (
                      <tr 
                        key={player.documentId}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                      >
                        <td className="py-4 px-6">
                          <div className={`text-lg font-bold ${getRankStyle(position)}`}>
                            {position}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <div className="text-base font-semibold text-gray-900 dark:text-white capitalize">
                              {player.leagueName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {player.faction}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-center text-gray-900 dark:text-white font-medium">
                          {totalGames}
                        </td>
                        <td className="py-4 px-3 text-center text-green-600 dark:text-green-400 font-medium">
                          {player.wins}
                        </td>
                        <td className="py-4 px-3 text-center text-yellow-600 dark:text-yellow-400 font-medium">
                          {player.draws}
                        </td>
                        <td className="py-4 px-3 text-center text-red-600 dark:text-red-400 font-medium">
                          {player.losses}
                        </td>
                        <td className="py-4 px-3 text-center text-blue-600 dark:text-blue-400 font-medium">
                          {victoryPoints}
                        </td>
                        <td className="py-4 px-3 text-center text-purple-600 dark:text-purple-400 font-medium">
                          {winRate}%
                        </td>
                        <td className="py-4 px-3 text-center">
                          <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            {player.rankingPoints}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex space-x-2 justify-end">
                            <button 
                              type='button' 
                              onClick={(e) => toggleExpand(e, player.documentId)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200"
                            >
                              View List
                            </button>
                            {currentUser?.player?.documentId === player.documentId && (
                              <button 
                                type='button' 
                                onClick={() => {
                                  setSelectedPlayerId(player.documentId);
                                  setSelectedPlayerFaction(player.faction);
                                  setShowArmyListManager(true);
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200"
                              >
                                Manage Lists
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // Individual Player List View
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <button 
                type='button' 
                onClick={(e) => toggleExpand(e, '')}
                className="flex items-center text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 font-medium transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Standings
              </button>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                {leaguePlayers.find((player: LeaguePlayer) => player.documentId === activeList.id)!.leagueName}'s List
              </h1>
              
              <button 
                type='button' 
                onClick={(e) => copylist(e, activeList.list)}
                className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy List
              </button>
            </div>
          </div>

          {/* Army List */}
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Army List
              </h3>
            </div>
            <div className="p-6">
              {(() => {
                const player = leaguePlayers.find((player: LeaguePlayer) => player.documentId === activeList.id);
                const armyLists = player?.armyLists || [];
                
                if (armyLists.length === 0) {
                  return (
                    <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No army lists added yet. Click "Manage Lists" to add your first list!
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-6">
                    {armyLists.map((list: any, index: number) => (
                      <div key={list.id || index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-lg text-gray-900 dark:text-white">{list.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{list.faction}</p>
                            {list.isActive && (
                              <span className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full mt-1">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Created: {new Date(list.createdDate).toLocaleDateString()}
                          </p>
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-gray-800 p-3 rounded">
                          {list.listContent}
                        </pre>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      
      {/* Army List Manager Modal */}
      {showArmyListManager && (
        <ArmyListManager
          leaguePlayerId={selectedPlayerId}
          currentFaction={selectedPlayerFaction}
          onClose={() => {
            setShowArmyListManager(false);
            setSelectedPlayerId('');
            setSelectedPlayerFaction('');
          }}
        />
      )}
    </div>
  )
}

export default TableRow