'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { LeaguePlayer } from './TableRow';
import ScoreReportModal from './ScoreReportModal';

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
  proposedBy: LeaguePlayer,
  proposalStatus: ProposalStatus,
  proposalTimestamp: Date,
}

const MatchesDashboard = () => {
  const [league, setLeague] = useState<any>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userLeaguePlayerName, setUserLeaguePlayerName] = useState<string | null>(null)
  const [scoreModalOpen, setScoreModalOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  
  const getLeague = async (documentId: string) => {
    useEffect(() => {
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`http://localhost:1337/api/users/me?populate=player`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(userData => {
          setCurrentUser(userData);
          
          fetch(`http://localhost:1337/api/leagues/${documentId}?populate[matches][populate]=*&populate[league_players][populate]=*`)
          .then((res) => res.json())
          .then((data) => {
            setLeague(data.data);
            setMatches(data.data.matches || []);
            
            console.log('User data:', userData);
            console.log('League players:', data.data.league_players);
            
            if (userData?.player && data.data.league_players) {
              const userLeaguePlayer = data.data.league_players.find(
                (lp: any) => lp.player?.id === userData.player.id
              );
              console.log('Found user league player:', userLeaguePlayer);
              if (userLeaguePlayer) {
                setUserLeaguePlayerName(userLeaguePlayer.leagueName);
                console.log('User league player name set to:', userLeaguePlayer.leagueName);
              } else {
                console.log('No league player found for user');
              }
            } else {
              console.log('Missing userData.player or league_players');
            }
            
            setIsLoading(false);
          });
        });
      } else {
        fetch(`http://localhost:1337/api/leagues/${documentId}?populate[matches][populate]=*`)
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

  return (
<<<<<<< HEAD
    <div>
      {matches.map((match: Match) => (
        <div key={match.documentId} className="m-4 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-all duration-150">
          <Link href={'/leagues/' + leagueDocumentId + '/matches/' + match.documentId}>
            <ul>
              <li className='pb-4'>
                <p className='text-sm text-gray-400 capitalize'>{match.statusMatch}</p>
                <p>{match.proposalTimestamp ? match.proposalTimestamp.toDateString() : ''}</p>
              </li>
              <li className='mx-4 pb-4'>
                <div className='flex'>
                  <p className='capitalize'>{match.leaguePlayer1.leagueName}</p>
                  <p className={match.leaguePlayer1Result === 2 ? 'font-bold' : '' + 'ml-auto'}>{match.statusMatch.toString() === 'played' ? match.leaguePlayer1Score : ''}</p>              
                </div>
                <p className='text-xs text-gray-400'>{match.leaguePlayer1.faction}</p>
              </li>
              <li className='mx-4 pb-4'>
                <div className='flex'>
                  <p className='capitalize'>{match.leaguePlayer2.leagueName}</p>
                  <p className={match.leaguePlayer2Result === 2 ? 'font-bold' : ''}>{match.statusMatch.toString() === 'played' ? match.leaguePlayer2Score: ''}</p>
                </div>
                <p className='text-xs text-gray-400'>{match.leaguePlayer2.faction}</p>
              </li>
            </ul>
          </Link>
        </div>
      ))}
=======
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((match: Match) => {
          const isUserMatch = isUserInMatch(match, userLeaguePlayerName || undefined);
          console.log('Match:', match.leaguePlayer1?.leagueName, 'vs', match.leaguePlayer2?.leagueName, 'User match?', isUserMatch, 'User name:', userLeaguePlayerName);
          const matchStatus = match.statusMatch?.toString() || 'upcoming';
          const isPlayed = matchStatus === 'played';
          
          return (
            <div
              key={match.documentId}
              className={`relative overflow-hidden rounded-xl shadow-lg p-6 border transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer ${getMatchCardStyle(isUserMatch)}`}
              onClick={() => {
                if (isUserMatch && !isPlayed) {
                  setSelectedMatch(match);
                  setScoreModalOpen(true);
                } else {
                  console.log('Match clicked:', match);
                }
              }}
            >
              {isUserMatch && (
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl"></div>
              )}
              
              <div className="relative">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(matchStatus)}`}>
                    {matchStatus}
                  </span>
                  {match.proposalTimestamp && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(match.proposalTimestamp).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${isUserMatch && match.leaguePlayer1?.leagueName === userLeaguePlayerName ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
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

                  <div className={`p-4 rounded-lg ${isUserMatch && match.leaguePlayer2?.leagueName === userLeaguePlayerName ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
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
                    <div className="text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                      {match.leaguePlayer1Result === 2 ? `${match.leaguePlayer1.leagueName} Victory` :
                       match.leaguePlayer2Result === 2 ? `${match.leaguePlayer2.leagueName} Victory` :
                       'Draw'}
                    </div>
                  </div>
                )}

                {isUserMatch && !isPlayed && (
                  <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-700">
                    <div className="text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                        📝 Click to Report Score
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
>>>>>>> 6bad08262e1b25fd21b15de587143452f3151beb
    </div>
  )
}

export default MatchesDashboard