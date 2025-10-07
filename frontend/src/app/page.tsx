'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import Footer from '@/components/Footer';

const API_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com';

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState([]);
  const [currentLeagues, setCurrentLeagues] = useState<any[]>([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalLeagues: 0, activeLeagues: 0, totalPlayers: 0 });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
    
    // Fetch all data with single API call
    fetchDashboardData();
    fetchEvents();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/leagues/dashboard`);
      const { upcomingLeagues, currentLeagues, topPlayers, stats } = response.data.data;
      
      setLeagues(upcomingLeagues);
      setCurrentLeagues(currentLeagues);
      setTopPlayers(topPlayers);
      setStats(stats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      // Fetch events from our backend API
      const response = await axios.get(`${API_URL}/api/leagues/store-events`);
      const events = response.data.data;
      
      // Filter to show only next 3 events
      setUpcomingEvents(events.slice(0, 3));
    } catch (error) {
      console.error('Error fetching events:', error);
      // No fallback events - display empty array
      setUpcomingEvents([]);
    }
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
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 py-6 sm:py-8 lg:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-16">
          <h2 className="text-2xl font-extrabold text-white sm:text-4xl md:text-5xl lg:text-6xl">
            Welcome to <span className="text-orange-500">Cryptic Cabin</span> Leagues
          </h2>
          <p className="mt-4 sm:mt-6 max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-gray-400">
            Join tabletop games and TCG leagues at Cryptic Cabin stores and track your progress
          </p>
          {!isAuthenticated && (
            <div className="mt-6 sm:mt-10">
              <Link 
                href="/auth/register"
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 sm:py-3 sm:px-8 rounded-lg text-base sm:text-lg"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-16">
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 text-center border border-gray-700 hover:border-orange-500 transition-colors duration-300 shadow-lg">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-orange-400 mb-1 sm:mb-2">{stats.totalLeagues}</div>
            <div className="text-gray-300 text-xs sm:text-sm font-medium uppercase tracking-wide">Total Leagues</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 text-center border border-gray-700 hover:border-green-500 transition-colors duration-300 shadow-lg">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-400 mb-1 sm:mb-2">{stats.activeLeagues}</div>
            <div className="text-gray-300 text-xs sm:text-sm font-medium uppercase tracking-wide">Active Now</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 text-center border border-gray-700 hover:border-blue-500 transition-colors duration-300 shadow-lg">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-400 mb-1 sm:mb-2">{stats.totalPlayers}</div>
            <div className="text-gray-300 text-xs sm:text-sm font-medium uppercase tracking-wide">Total Players</div>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="bg-gray-800/50 rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-700 shadow-2xl">
          {/* About Section - Full Width */}
          <div className="mb-8 sm:mb-12">
            <div className="bg-gray-800 rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 shadow-xl hover:shadow-2xl">
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">About Our Leagues</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                <div>
                  <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base lg:text-lg leading-relaxed">
                    Cryptic Cabin Leagues offer tabletop games and TCG leagues across multiple systems. 
                    Whether you're into board games, miniatures, or trading card games, we have a league for you.
                  </p>
                  <ul className="text-gray-300 space-y-2 sm:space-y-3">
                    <li className="flex items-center">
                      <span className="w-2 h-2 sm:w-3 sm:h-3 bg-orange-500 rounded-full mr-3 sm:mr-4"></span>
                      <span className="text-sm sm:text-base lg:text-lg">Multiple game types supported</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 sm:w-3 sm:h-3 bg-orange-500 rounded-full mr-3 sm:mr-4"></span>
                      <span className="text-sm sm:text-base lg:text-lg">Skill-based matchmaking</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 sm:w-3 sm:h-3 bg-orange-500 rounded-full mr-3 sm:mr-4"></span>
                      <span className="text-sm sm:text-base lg:text-lg">Bristol and Bracknell locations</span>
                    </li>
                  </ul>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    {isAuthenticated && (
                      <Link 
                        href="/dashboard" 
                        className="inline-flex items-center text-orange-400 hover:text-orange-300 font-medium text-lg"
                      >
                        View Your Leagues
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                {leagues.length > 0 ? (
                  leagues.map((league: any) => (
                    <div key={league.id} className="bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500 hover:bg-gray-650 transition-colors duration-200">
                      <h4 className="text-lg font-semibold text-white mb-2">{league.name}</h4>
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
                      <div className="flex items-center text-gray-400 text-sm mb-3">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {league.gameSystem}
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {league.description.length > 0 && league.description[0].children?.[0]?.text 
                          ? league.description[0].children[0].text.slice(0, 100) + (league.description[0].children[0].text.length > 100 ? '...' : '')
                          : 'Competitive league - Join now!'}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-700 rounded-lg p-6 text-center border-l-4 border-gray-500">
                    <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h4 className="text-lg font-semibold text-gray-400 mb-2">No upcoming leagues</h4>
                    <p className="text-gray-500 text-sm">Check back soon for new leagues</p>
                    <p className="text-gray-400 mt-1">Be the first to create one!</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6">
                <Link 
                  href={isAuthenticated ? "/leagues" : "/auth/register"}
                  className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium"
                >
                  {isAuthenticated ? "Join a League" : "Sign Up to Join"}
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Current Leagues */}
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 shadow-xl hover:shadow-2xl">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Current Leagues</h3>
              </div>
              
              <div className="space-y-4">
                {currentLeagues.length > 0 ? (
                  currentLeagues.map((league: any) => (
                    <div key={league.id} className="bg-gray-700 rounded-lg p-4 border-l-4 border-green-500 hover:bg-gray-650 transition-colors duration-200">
                      <h4 className="text-lg font-semibold text-white mb-2">{league.name}</h4>
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
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {league.description.length > 0 && league.description[0].children?.[0]?.text 
                          ? league.description[0].children[0].text.slice(0, 100) + (league.description[0].children[0].text.length > 100 ? '...' : '')
                          : 'League matches in progress with active players battling for the top spot.'}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-700 rounded-lg p-6 text-center border-l-4 border-gray-500">
                    <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h4 className="text-lg font-semibold text-gray-400 mb-2">No active leagues</h4>
                    <p className="text-gray-500 text-sm">All leagues are either planned or completed</p>
                    <p className="text-gray-400 mt-1">Start a league to begin the competition!</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6">
                <Link 
                  href={isAuthenticated ? "/leagues" : "/auth/register"}
                  className="inline-flex items-center text-green-400 hover:text-green-300 font-medium"
                >
                  {isAuthenticated ? "View Active Leagues" : "Join the Action"}
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Top Players Section */}
          <div className="mb-12">
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 shadow-xl hover:shadow-2xl">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Top Players</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topPlayers.length > 0 ? (
                  topPlayers.map((player: any, index: number) => {
                    const rankColors = ['bg-yellow-500', 'bg-gray-400', 'bg-orange-600'];
                    const textColors = ['text-black', 'text-black', 'text-white'];
                    
                    return (
                      <div key={player.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-650 transition-all duration-200 border border-gray-600 hover:border-gray-500">
                        <div className="flex items-center flex-1 min-w-0 mr-4">
                          <div className={`w-10 h-10 ${rankColors[index]} rounded-full flex items-center justify-center ${textColors[index]} font-bold text-sm mr-3 shadow-md flex-shrink-0`}>
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-semibold text-lg truncate">{player.leagueName || 'Anonymous'}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-orange-400 font-bold text-lg leading-tight whitespace-nowrap">{player.rankingPoints} pts</p>
                          <p className="text-gray-400 text-sm mt-1">{player.wins}W-{player.losses}L</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-gray-700 rounded-lg p-8 text-center border border-gray-600 md:col-span-3">
                    <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h4 className="text-lg font-semibold text-gray-400 mb-2">No players yet</h4>
                    <p className="text-gray-500 text-sm">Join a league to see leaderboards!</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6">
                <Link 
                  href={isAuthenticated ? "/leaderboards" : "/auth/register"}
                  className="inline-flex items-center text-orange-400 hover:text-orange-300 font-medium"
                >
                  View Full Leaderboard
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Store Events Section - Full Width */}
          <div className="mb-12">
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 shadow-xl hover:shadow-2xl">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Store Events</h3>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event: any, index: number) => {
                    const colorClasses = {
                      'green-500': 'border-green-500 bg-green-500/10',
                      'blue-500': 'border-blue-500 bg-blue-500/10', 
                      'purple-500': 'border-purple-500 bg-purple-500/10',
                      'yellow-500': 'border-yellow-500 bg-yellow-500/10',
                      'red-500': 'border-red-500 bg-red-500/10'
                    };
                    const colorClass = colorClasses[event.color as keyof typeof colorClasses] || 'border-gray-500 bg-gray-500/10';
                    
                    const gameTypeColors = {
                      'TCG': 'bg-blue-600 text-white',
                      'Miniatures': 'bg-green-600 text-white',
                      'Table Top Game': 'bg-purple-600 text-white',
                      'Workshop': 'bg-orange-600 text-white',
                      'Board Games': 'bg-indigo-600 text-white',
                      'Mixed': 'bg-gray-600 text-white'
                    };
                    const gameTypeClass = gameTypeColors[event.gameType as keyof typeof gameTypeColors] || 'bg-gray-600 text-white';
                    
                    return (
                      <div key={index} className={`bg-gray-700 rounded-lg p-4 border-l-4 ${colorClass} hover:bg-gray-650 transition-all duration-200`}>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-lg font-semibold text-white">{event.title}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${gameTypeClass}`}>
                            {event.gameType}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-400 text-sm mb-2">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {event.date}
                        </div>
                        <div className="flex items-center text-gray-400 text-sm mb-3">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Cryptic Cabin {event.location}
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{event.description}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-gray-700 rounded-lg p-8 text-center border border-gray-600 md:col-span-3">
                    <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <h4 className="text-lg font-semibold text-gray-400 mb-2">No events available</h4>
                    <p className="text-gray-500 text-sm">Check back soon for upcoming store events</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6">
                <a 
                  href="https://crypticcabin.com/pages/events"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-orange-400 hover:text-orange-300 font-medium"
                >
                  View All Events
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
