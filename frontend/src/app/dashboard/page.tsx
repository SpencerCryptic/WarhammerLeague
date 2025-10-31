'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import Footer from '@/components/Footer';

const API_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com';

interface League {
  documentId: string;
  name: string;
  statusleague: string;
  description: any;
  startDate: string;
  gameSystem: string;
}

interface LeaguePlayer {
  id: number;
  leagueName: string;
  faction: string;
  firstName?: string;
  lastName?: string;
  wins: number;
  losses: number;
  draws: number;
  rankingPoints: number;
  league: League;
}

interface Match {
  id: number;
  statusMatch: string;
  leaguePlayer1Score: number;
  leaguePlayer2Score: number;
  leaguePlayer1Result: string;
  leaguePlayer2Result: string;
  leaguePlayer1: any;
  leaguePlayer2: any;
  league: League;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userLeagues, setUserLeagues] = useState<LeaguePlayer[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }
    
    setIsAuthenticated(true);
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setUserId(response.data.id);
      fetchUserData(response.data.id);
    } catch (error) {
      setLoading(false);
    }
  };

  const fetchUserData = async (currentUserId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const leaguesResponse = await axios.get(`${API_URL}/api/leagues?populate[league_players][populate]=*`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const playersResponse = await axios.get(`${API_URL}/api/players?populate=*`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const currentUserResponse = await axios.get(`${API_URL}/api/users/me?populate=*`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const userPlayer = currentUserResponse.data.player;

      if (!userPlayer) {
        setUserLeagues([]);
        setLoading(false);
        return;
      }
      const userLeagues = leaguesResponse.data.data
        .filter((league: any) => {
          const hasPlayer = league.league_players?.some((lp: any) => 
            lp.player?.id === userPlayer.id
          );
          return hasPlayer;
        })
        .map((league: any) => {
          // Find the user's league-player record for this league
          const userLeaguePlayer = league.league_players.find((lp: any) => 
            lp.player?.id === userPlayer.id
          );
          return {
            ...userLeaguePlayer,
            league: league
          };
        });

      setUserLeagues(userLeagues);
      await fetchUserMatches();
      
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchUserMatches = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }
      const matchesResponse = await axios.get(`${API_URL}/api/matches/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const userMatches = matchesResponse.data.data || [];
      const upcoming = userMatches.filter((match: any) => 
        match.statusMatch === 'upcoming' || match.statusMatch === 'planned'
      );
      
      const completed = userMatches.filter((match: any) => 
        match.statusMatch === 'played'
      );

      setUpcomingMatches(upcoming);
      setCompletedMatches(completed);
    } catch (error) {
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'bg-green-500';
      case 'planned': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ongoing': return 'Active';
      case 'planned': return 'Upcoming';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  const getDisplayName = (leaguePlayer: any) => {
    if (leaguePlayer?.firstName && leaguePlayer?.lastName) {
      const lastInitial = leaguePlayer.lastName.charAt(0).toUpperCase();
      return `${leaguePlayer.firstName} ${lastInitial}.`;
    }
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0F1117' }}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F1117' }}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">League Dashboard</h1>
          <p className="text-gray-400 text-lg">Track your progress across all leagues</p>
        </div>

        {/* Upcoming Games */}
        <div className="rounded-xl p-8 mb-8 border" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <h2 className="text-2xl font-bold text-white mb-6">Your Upcoming Games</h2>
          
          {upcomingMatches.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No upcoming games</h3>
              <p className="text-gray-500">Your next matches will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingMatches.slice(0, 4).map((match) => (
                <div
                  key={match.id}
                  className="rounded-lg p-4 border hover:shadow-lg transition-all duration-200 cursor-pointer"
                  style={{ backgroundColor: '#2D3548', borderColor: 'rgba(168, 85, 247, 0.2)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.2)'}
                  onClick={() => {
                    if (match.league?.documentId) {
                      window.location.href = `/leagues/${match.league.documentId}`;
                    }
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold" style={{ color: '#FF7F2A' }}>Upcoming Match</span>
                    <span className="text-xs text-gray-400 bg-gray-600 px-2 py-1 rounded">
                      {match.league?.gameSystem || 'Unknown Game'}
                    </span>
                  </div>
                  <div className="text-white font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div>{match.leaguePlayer1?.leagueName || 'TBD'}</div>
                        {getDisplayName(match.leaguePlayer1) && (
                          <div className="text-xs text-gray-400 font-normal mt-0.5">
                            {getDisplayName(match.leaguePlayer1)}
                          </div>
                        )}
                      </div>
                      <span>vs</span>
                      <div className="flex-1">
                        <div>{match.leaguePlayer2?.leagueName || 'TBD'}</div>
                        {getDisplayName(match.leaguePlayer2) && (
                          <div className="text-xs text-gray-400 font-normal mt-0.5">
                            {getDisplayName(match.leaguePlayer2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm mt-2">
                    {match.league?.name || 'Unknown League'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Your Leagues */}
        <div className="rounded-xl p-8 mb-8 border" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <h2 className="text-2xl font-bold text-white mb-6">Your Leagues</h2>
          
          {userLeagues.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No leagues joined yet</h3>
              <p className="text-gray-500 mb-6">Join your first league to start competing!</p>
              <Link
                href="/leagues"
                className="text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
                style={{ backgroundColor: '#FF7F2A' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E86D1A'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF7F2A'}
              >
                Browse Available Leagues
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userLeagues.map((leaguePlayer) => (
                <div
                  key={leaguePlayer.id}
                  className="rounded-lg p-6 border transition-all duration-200"
                  style={{ backgroundColor: '#2D3548', borderColor: 'rgba(168, 85, 247, 0.2)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.2)'}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {leaguePlayer.league?.name || 'Unknown League'}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getStatusColor(leaguePlayer.league?.statusleague || 'unknown')}`}>
                      {getStatusText(leaguePlayer.league?.statusleague || 'unknown')}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Your Name:</span>
                      <span className="text-white font-medium">{leaguePlayer.leagueName || 'Not set'}</span>
                    </div>
                    {leaguePlayer.faction && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Faction:</span>
                        <span className="text-white">{leaguePlayer.faction}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Game System:</span>
                      <span className="text-white">{leaguePlayer.league?.gameSystem || 'Unknown'}</span>
                    </div>
                  </div>

                  <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: '#1E2330' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">Record</span>
                      <span className="text-white font-semibold">
                        {leaguePlayer.wins || 0}W-{leaguePlayer.losses || 0}L-{leaguePlayer.draws || 0}D
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Points</span>
                      <span className="font-bold" style={{ color: '#FF7F2A' }}>{leaguePlayer.rankingPoints || 0}</span>
                    </div>
                  </div>

                  {leaguePlayer.league?.documentId && (
                    <Link
                      href={`/leagues/${leaguePlayer.league.documentId}`}
                      className="block w-full text-white text-center py-2 rounded-lg transition-colors duration-200"
                      style={{ backgroundColor: '#A855F7' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9333EA'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A855F7'}
                    >
                      View League
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Previous Matches */}
        <div className="rounded-xl p-8 border" style={{ backgroundColor: '#1E2330', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          <h2 className="text-2xl font-bold text-white mb-6">Previous Matches</h2>
          
          {completedMatches.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No completed matches</h3>
              <p className="text-gray-500">Your match history will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedMatches.slice(0, 10).map((match) => (
                <div key={match.id} className="rounded-lg p-4 border" style={{ backgroundColor: '#2D3548', borderColor: 'rgba(168, 85, 247, 0.2)' }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        <div>
                          <div>{match.leaguePlayer1?.leagueName || 'Unknown'}</div>
                          {getDisplayName(match.leaguePlayer1) && (
                            <div className="text-xs text-gray-400 font-normal">
                              {getDisplayName(match.leaguePlayer1)}
                            </div>
                          )}
                        </div>
                        <span>vs</span>
                        <div>
                          <div>{match.leaguePlayer2?.leagueName || 'Unknown'}</div>
                          {getDisplayName(match.leaguePlayer2) && (
                            <div className="text-xs text-gray-400 font-normal">
                              {getDisplayName(match.leaguePlayer2)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        {match.league?.name || 'Unknown League'} • {match.league?.gameSystem || 'Unknown Game'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">
                        {match.leaguePlayer1Score || 0} - {match.leaguePlayer2Score || 0}
                      </div>
                      <div className="text-xs text-gray-400">
                        {match.leaguePlayer1Result === 'win' ? 'W' : match.leaguePlayer1Result === 'loss' ? 'L' : 'D'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}