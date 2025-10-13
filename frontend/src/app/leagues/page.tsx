'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import React from 'react';
import CreateLeagueButtonWrapper from '@/components/CLBWrapper';
import axios from 'axios';
import qs from 'qs';

const API_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com';

export default function Leagues() {
  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState([]);
  const [upcomingLeagues, setUpcomingLeagues] = useState<any[]>([]);
  const [userLeagues, setUserLeagues] = useState<any[]>([]);
  const [plannedLeagues, setPlannedLeagues] = useState<any[]>([]);
  const [archivedLeagues, setArchivedLeagues] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalLeagues: 0, activeLeagues: 0, totalPlayers: 0 });
  const [gameFilter, setGameFilter] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [gameFilter]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/leagues/dashboard`);
      const { upcomingLeagues, currentLeagues, stats } = response.data.data;
      
      setUpcomingLeagues(upcomingLeagues);
      setStats(stats);

      // Fetch all leagues for the full list
      const leaguesResponse = await fetchLeagues(gameFilter);
      setLeagues(leaguesResponse.data);
      
      // Categorize leagues by status
      const planned = leaguesResponse.data.filter((league: any) => league.statusleague === 'planned');
      const archived = leaguesResponse.data.filter((league: any) => league.statusleague === 'archived' || league.statusleague === 'finished');
      setPlannedLeagues(planned);
      setArchivedLeagues(archived);

      // Fetch user's leagues if logged in
      await fetchUserLeagues();
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const fetchUserLeagues = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUserLeagues([]);
        setIsLoggedIn(false);
        return;
      }

      setIsLoggedIn(true);

      // First get current user info
      const userResponse = await axios.get(`${API_URL}/api/users/me?populate[player]=*`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const userId = userResponse.data.id;
      const playerId = userResponse.data.player?.id;

      if (!playerId) {
        setUserLeagues([]);
        return;
      }

      // Get leagues where user is a participant
      const leaguesResponse = await axios.get(`${API_URL}/api/leagues?populate[league_players][populate]=*`);
      const allLeagues = leaguesResponse.data.data;

      // Filter leagues where the user is a participant
      const userParticipantLeagues = allLeagues.filter((league: any) => {
        return league.league_players?.some((lp: any) => lp.player?.id === playerId);
      });

      setUserLeagues(userParticipantLeagues);
    } catch (error) {
      console.error('Error fetching user leagues:', error);
      setUserLeagues([]);
    }
  };

  const fetchLeagues = async (gameSystem?: string) => {
    const query = qs.stringify({
      filters: {
        gameSystem: {
          $eq: gameSystem,
        },
      },
    }, { encodeValuesOnly: true });

    const url = `${API_URL}/api/leagues${gameSystem ? `?${query}` : ''}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      console.error('Failed to fetch leagues:', error);
      return { data: [] };
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGameFilter(e.target.value);
  };

  const getLocationFromName = (name: string) => {
    if (!name) return null;
    const lowerName = name.toLowerCase();
    if (lowerName.includes('bristol')) return 'Bristol';
    if (lowerName.includes('bracknell')) return 'Bracknell';
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1a1a' }}>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="flex justify-between items-center mb-16">
          <div>
            <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
              <span className="text-orange-500">Cryptic Cabin</span> Leagues
            </h2>
            <p className="mt-4 text-xl text-gray-400">
              Browse and join leagues across all game systems
            </p>
          </div>
          <CreateLeagueButtonWrapper />
        </div>

        {/* Filter Section */}
        <div className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <select
              value={gameFilter}
              onChange={handleFilterChange}
              className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-600 focus:border-orange-500 focus:outline-none"
            >
              <option value="">All Games</option>
              <option value="Warhammer: 40,000">Warhammer: 40,000</option>
              <option value="Warhammer: Age of Sigmar">Warhammer: Age of Sigmar</option>
              <option value="Warhammer: Kill Team">Warhammer: Kill Team</option>
              <option value="Warhammer: Warcry">Warhammer: Warcry</option>
              <option value="Warhammer: Necromunda">Warhammer: Necromunda</option>
              <option value="A Song of Ice and Fire">A Song of Ice and Fire</option>
              <option value="Middle Earth SBG">Middle Earth SBG</option>
              <option value="Marvel Crisis Protocol">Marvel Crisis Protocol</option>
              <option value="Conquest">Conquest</option>
            </select>
          </div>
          
          {/* Status Legend */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-300">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-300">Planned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span className="text-gray-300">Archived</span>
            </div>
          </div>
        </div>


        {/* Main Content Container */}
        <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 shadow-2xl">
          {/* Leagues Section - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Upcoming Leagues */}
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 shadow-xl hover:shadow-2xl">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Upcoming Leagues</h3>
              </div>
              
              <div className="space-y-4">
                {upcomingLeagues.length > 0 ? (
                  upcomingLeagues.map((league: any) => (
                    <Link key={league.documentId} href={`/leagues/${league.documentId}`}>
                      <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500 hover:bg-gray-650 transition-colors duration-200 cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-semibold text-white">{league.name}</h4>
                          {getLocationFromName(league.name) && (
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              getLocationFromName(league.name) === 'Bristol'
                                ? 'bg-orange-600'
                                : 'bg-pink-600'
                            }`} title={getLocationFromName(league.name) || ''}></div>
                          )}
                        </div>
                        <div className="flex items-center text-gray-400 text-sm mb-2">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(league.startDate).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="flex items-center text-gray-400 text-sm">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          {league.gameSystem}
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="bg-gray-700 rounded-lg p-6 text-center border-l-4 border-gray-500">
                    <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h4 className="text-lg font-semibold text-gray-400 mb-2">No upcoming leagues</h4>
                    <p className="text-gray-500 text-sm">Check back soon for new leagues</p>
                  </div>
                )}
              </div>
            </div>

            {/* Your Leagues */}
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 shadow-xl hover:shadow-2xl">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Your Leagues</h3>
              </div>
              
              <div className="space-y-6">
                {userLeagues.length > 0 ? (
                  userLeagues.map((league: any) => (
                    <Link key={league.documentId} href={`/leagues/${league.documentId}`}>
                      <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-green-500 hover:bg-gray-650 transition-colors duration-200 cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-semibold text-white">{league.name}</h4>
                          {getLocationFromName(league.name) && (
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              getLocationFromName(league.name) === 'Bristol'
                                ? 'bg-orange-600'
                                : 'bg-pink-600'
                            }`} title={getLocationFromName(league.name) || ''}></div>
                          )}
                        </div>
                        <div className="flex items-center text-gray-400 text-sm mb-2">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {league.league_players?.length || 0} players
                        </div>
                        <div className="flex items-center text-gray-400 text-sm mb-3">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          {league.gameSystem}
                        </div>
                        <p className="text-gray-300 text-sm">
                          Status: <span className={`font-medium ${
                            league.statusleague === 'active' ? 'text-green-400' :
                            league.statusleague === 'planned' ? 'text-blue-400' :
                            'text-gray-400'
                          }`}>
                            {league.statusleague}
                          </span>
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="bg-gray-700 rounded-lg p-6 text-center border-l-4 border-gray-500">
                    <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h4 className="text-lg font-semibold text-gray-400 mb-2">
                      {isLoggedIn ? 'No leagues joined' : 'login to see your leagues'}
                    </h4>
                    <p className="text-gray-500 text-sm">
                      {isLoggedIn ? 'Join a league to see your progress here' : 'Sign in to view and track your league participation'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* All Leagues Section */}
          {leagues.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 shadow-xl hover:shadow-2xl">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">
                  All Leagues {gameFilter && `- ${gameFilter}`}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leagues.map((league: any) => (
                  <Link key={league.documentId} href={`/leagues/${league.documentId}`}>
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-gray-500 hover:bg-gray-650 transition-all duration-200 cursor-pointer">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold text-white">{league.name}</h4>
                          {getLocationFromName(league.name) && (
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              getLocationFromName(league.name) === 'Bristol'
                                ? 'bg-orange-600'
                                : 'bg-pink-600'
                            }`} title={getLocationFromName(league.name) || ''}></div>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          league.statusleague === 'active' ? 'bg-green-500 text-white' :
                          league.statusleague === 'planned' ? 'bg-blue-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {league.statusleague}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-400">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          {league.gameSystem}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {league.league_players?.length || 0} players
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(league.startDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Archived Leagues Section */}
          {archivedLeagues.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 shadow-xl hover:shadow-2xl mt-8">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Archived Leagues</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archivedLeagues.map((league: any) => (
                  <Link key={league.documentId} href={`/leagues/${league.documentId}`}>
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-gray-500 hover:bg-gray-650 transition-all duration-200 cursor-pointer opacity-75">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold text-white">{league.name}</h4>
                          {getLocationFromName(league.name) && (
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              getLocationFromName(league.name) === 'Bristol'
                                ? 'bg-orange-600'
                                : 'bg-pink-600'
                            }`} title={getLocationFromName(league.name) || ''}></div>
                          )}
                        </div>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500 text-white">
                          {league.statusleague}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-400">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          {league.gameSystem}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {league.league_players?.length || 0} players
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(league.startDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
