'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { LeaguePlayer } from './TableRow';
import ScoreReportModal from './ScoreReportModal';
import AdminScoreModifyModal from './AdminScoreModifyModal';
import GameDetailsModal from './GameDetailsModal';

export enum StatusMatch {
  upcoming,
  planned,
  played,
  abandoned
}

export enum ProposalStatus {
  pending,
  accepted,
  rejected
}

export interface Match {
  documentId: string,
  leaguePlayer1: LeaguePlayer,
  leaguePlayer2: LeaguePlayer,
  statusMatch: StatusMatch,
  leaguePlayer1List: string,
  leaguePlayer2List: string,
  leaguePlayer1Score: number,
  leaguePlayer2Score: number,
  leaguePlayer1Result: number,
  leaguePlayer2Result: number,
  leaguePlayer1BonusPoints?: {
    lostButScored50Percent: boolean,
    scoredAllPrimaryObjectives: boolean
  },
  leaguePlayer2BonusPoints?: {
    lostButScored50Percent: boolean,
    scoredAllPrimaryObjectives: boolean
  },
  leaguePlayer1LeaguePoints?: number,
  leaguePlayer2LeaguePoints?: number,
  matchResult?: string,
  round?: number,
  proposedBy?: LeaguePlayer,
  proposalStatus?: ProposalStatus,
  proposalTimestamp?: Date,
}

const MatchesDashboard = () => {
  const [league, setLeague] = useState<any>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userLeaguePlayerName, setUserLeaguePlayerName] = useState<string | null>(null)
  const [scoreModalOpen, setScoreModalOpen] = useState(false)
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [gameDetailsModalOpen, setGameDetailsModalOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  
  const getLeague = async (documentId: string) => {
    useEffect(() => {
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/users/me?populate[player]=*&populate[role]=*`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(userData => {
          setCurrentUser(userData);
          setIsAdmin(userData?.role?.name === 'Admin' || userData?.role?.name === 'LeagueCreator');
          
          fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues/${documentId}?populate[matches][populate]=*&populate[league_players][populate]=*`)
          .then((res) => res.json())
          .then((data) => {
            setLeague(data.data);
            setMatches(data.data.matches || []);
            
            if (userData?.player && data.data.league_players) {
              const userLeaguePlayer = data.data.league_players.find(
                (lp: any) => lp.player?.id === userData.player.id
              );
              if (userLeaguePlayer) {
                setUserLeaguePlayerName(userLeaguePlayer.leagueName);
              }
            }
            
            setIsLoading(false);
          });
        })
        .catch(error => {
          console.error('Error fetching user:', error);
          setIsLoading(false);
        });
      } else {
        fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues/${documentId}?populate[matches][populate]=*`)
        .then((res) => res.json())
        .then((data) => {
          setLeague(data.data);
          setMatches(data.data.matches || []);
          setIsLoading(false);
        });
      }
    }, []) 
  }
  
  const pathName: string[] = usePathname().split('/')
  const leagueDocumentId = pathName[2]
  getLeague(leagueDocumentId)

  const isUserInMatch = (match: Match, userLeaguePlayerName?: string): boolean => {
    if (!currentUser && !userLeaguePlayerName) return false;
    
    if (userLeaguePlayerName) {
      return match.leaguePlayer1?.leagueName === userLeaguePlayerName ||
             match.leaguePlayer2?.leagueName === userLeaguePlayerName;
    }
    
    if (currentUser?.player) {
      const userPlayerId = currentUser.player.id;
      const player1 = match.leaguePlayer1 as any;
      const player2 = match.leaguePlayer2 as any;
      
      return player1?.player?.id === userPlayerId ||
             player2?.player?.id === userPlayerId;
    }
    
    return false;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'played':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'planned':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'abandoned':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getMatchCardStyle = (isUserMatch: boolean) => {
    if (isUserMatch) {
      return 'bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20 border-orange-400 dark:border-orange-600 ring-2 ring-orange-400/30';
    }
    return 'bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-gray-200 dark:border-gray-700';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white text-xl">Loading matches...</div>
      </div>
    );
  }

  if (league && league.statusleague?.toString() === 'planned') {
    return (
      <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 rounded-xl shadow-lg p-8 border border-blue-200 dark:border-blue-800">
        <h3 className="text-2xl font-bold mb-3 text-blue-800 dark:text-blue-300">League Not Started</h3>
        <p className="text-lg text-blue-700 dark:text-blue-400">
          This league is scheduled to begin on {league.startDate ? new Date(league.startDate).toLocaleDateString() : 'a date to be determined'}.
        </p>
      </div>
    );
  } 

  if (matches.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-8">
        <h3 className="text-2xl font-bold mb-3 text-gray-800 dark:text-gray-200">No Matches Yet</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Matches will appear here once the league organizer creates them.
        </p>
      </div>
    );
  }

  // Group matches by round
  const groupedMatches = matches.reduce((acc: { [key: string]: Match[] }, match: Match) => {
    const round = match.round || 1;
    const roundKey = `Round ${round}`;
    if (!acc[roundKey]) {
      acc[roundKey] = [];
    }
    acc[roundKey].push(match);
    return acc;
  }, {});

  // Sort rounds numerically
  const sortedRounds = Object.keys(groupedMatches).sort((a, b) => {
    const roundA = parseInt(a.replace('Round ', ''));
    const roundB = parseInt(b.replace('Round ', ''));
    return roundA - roundB;
  });

  return (
    <div className="space-y-8">
      <ScoreReportModal
        isOpen={scoreModalOpen}
        onClose={() => {
          setScoreModalOpen(false);
          setSelectedMatch(null);
        }}
        match={selectedMatch}
        userLeaguePlayerName={userLeaguePlayerName || ''}
        league={league}
      />
      
      <AdminScoreModifyModal
        isOpen={adminModalOpen}
        onClose={() => {
          setAdminModalOpen(false);
          setSelectedMatch(null);
        }}
        match={selectedMatch}
        league={league}
      />
      
      <GameDetailsModal
        isOpen={gameDetailsModalOpen}
        onClose={() => {
          setGameDetailsModalOpen(false);
          setSelectedMatch(null);
        }}
        match={selectedMatch}
      />

      {sortedRounds.map((roundName) => (
        <div key={roundName} className="space-y-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-3xl font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              {roundName}
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-orange-500/50 to-transparent"></div>
          </div>
          
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {groupedMatches[roundName].map((match: Match) => {
          const isUserMatch = isUserInMatch(match, userLeaguePlayerName || undefined);
          const matchStatus = match.statusMatch?.toString() || 'upcoming';
          const isPlayed = matchStatus === 'played';
          
          return (
            <div
              key={match.documentId}
              className={`relative overflow-hidden rounded-lg shadow-lg p-3 sm:p-4 lg:p-6 border transition-all duration-300 hover:shadow-xl hover:scale-105 ${getMatchCardStyle(isUserMatch)} ${(isUserMatch && !isPlayed) || isPlayed ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (isPlayed) {
                  setSelectedMatch(match);
                  setGameDetailsModalOpen(true);
                } else if (isUserMatch && !isPlayed) {
                  setSelectedMatch(match);
                  setScoreModalOpen(true);
                }
              }}
            >
              {isUserMatch && (
                <>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl"></div>
                  {!isPlayed && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      Click to Report
                    </div>
                  )}
                </>
              )}
              
              <div className="relative">
                <div className="flex justify-between items-start mb-2 sm:mb-4">
                  <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(matchStatus)}`}>
                    {matchStatus}
                  </span>
                  {match.proposalTimestamp && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(match.proposalTimestamp).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="space-y-2 sm:space-y-4">
                  <div className={`p-2 sm:p-3 rounded-lg ${isUserMatch && match.leaguePlayer1?.leagueName === userLeaguePlayerName ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {match.leaguePlayer1?.leagueName || 'TBD'}
                      </div>
                      {isPlayed && (
                        <div className={`text-2xl font-bold ${match.leaguePlayer1Result === 2 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {match.leaguePlayer1Score}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {match.leaguePlayer1?.faction}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">VS</span>
                  </div>

                  <div className={`p-2 sm:p-3 rounded-lg ${isUserMatch && match.leaguePlayer2?.leagueName === userLeaguePlayerName ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {match.leaguePlayer2?.leagueName || 'TBD'}
                      </div>
                      {isPlayed && (
                        <div className={`text-2xl font-bold ${match.leaguePlayer2Result === 2 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {match.leaguePlayer2Score}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {match.leaguePlayer2?.faction}
                    </div>
                  </div>
                </div>

                {isPlayed && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      {match.leaguePlayer1Result === 2 ? `${match.leaguePlayer1.leagueName} Victory` :
                       match.leaguePlayer2Result === 2 ? `${match.leaguePlayer2.leagueName} Victory` :
                       'Draw'}
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        🔍 Click to view army lists
                      </span>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  {isUserMatch && !isPlayed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMatch(match);
                        setScoreModalOpen(true);
                      }}
                      className="w-full px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
                    >
                      📝 Report Score
                    </button>
                  )}
                  
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMatch(match);
                        setAdminModalOpen(true);
                      }}
                      className="w-full px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>🔧</span>
                      <span>Admin: Modify Score</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default MatchesDashboard