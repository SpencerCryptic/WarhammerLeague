"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { use, useEffect, useRef, useState } from 'react'

export interface LeaguePlayer {
  documentId: string,
  leagueName: string, 
  faction: string,
  wins: number,
  draws: number,
  losses: number,
  rankingPoints: number,
  playList: string
}

const TableRow = () => {
  
  const [leaguePlayers, setLeaguePlayers] = useState<LeaguePlayer[]>([])
  const [activeList, setActiveList] = useState({id: '', list: ''})
  const [isLoading, setIsLoading] = useState(true)
  
  const getLeague = (documentId: string) => {
    useEffect(() => {
      fetch(`http://localhost:1337/api/leagues/${documentId}`)
      .then((res) => res.json())
      .then((data) => {
          const players = data.data.league_players || [];
          // Sort players by points (wins * 3 + draws) descending
          const sortedPlayers = players.sort((a: LeaguePlayer, b: LeaguePlayer) => {
            const aPoints = a.wins * 3 + a.draws;
            const bPoints = b.wins * 3 + b.draws;
            return bPoints - aPoints;
          });
          setLeaguePlayers(sortedPlayers);
          setIsLoading(false);
      });
    }, []) 
  }
  
  const toggleExpand = (event: React.MouseEvent<HTMLButtonElement>, documentId: string) => {
    setActiveList({
      id: documentId, 
      list: documentId === '' ? '' : leaguePlayers.find((player: LeaguePlayer) => player.documentId === documentId)!.playList
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

  const getWinRate = (player: LeaguePlayer) => {
    const total = player.wins + player.draws + player.losses;
    if (total === 0) return 0;
    return Math.round((player.wins / total) * 100);
  }

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

          {/* Players Cards */}
          <div className="space-y-3">
            {leaguePlayers.map((player: LeaguePlayer, index: number) => {
              const position = index + 1;
              const totalGames = player.wins + player.draws + player.losses;
              const leaguePoints = player.wins * 3 + player.draws;
              const winRate = getWinRate(player);
              
              return (
                <div 
                  key={player.documentId}
                  className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    {/* Left: Rank & Player Info */}
                    <div className="flex items-center space-x-4 w-80">
                      <div className={`text-2xl min-w-[60px] text-center ${getRankStyle(position)}`}>
                        {getRankIcon(position)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize truncate">
                          {player.leagueName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {player.faction}
                        </p>
                      </div>
                    </div>

                    {/* Center: Stats Grid */}
                    <div className="hidden md:grid grid-cols-6 gap-6 text-right">
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{totalGames}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">PLAYED</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">{player.wins}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">WINS</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{player.draws}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">DRAWS</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600 dark:text-red-400">{player.losses}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">LOSSES</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{player.rankingPoints}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">VICTORY PTS</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{winRate}%</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">WIN RATE</div>
                      </div>
                    </div>

                    {/* Right: Points & Actions */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {leaguePoints}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">LEAGUE POINTS</div>
                      <button 
                        type='button' 
                        onClick={(e) => toggleExpand(e, player.documentId)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        View List
                      </button>
                    </div>
                  </div>

                  {/* Mobile Stats */}
                  <div className="md:hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-3 gap-4 text-right">
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {player.wins}-{player.draws}-{player.losses}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">W-D-L</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {player.rankingPoints}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">VICTORY PTS</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                          {winRate}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">WIN RATE</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                {leaguePlayers.find((player: LeaguePlayer) => player.documentId === activeList.id)!.playList}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TableRow