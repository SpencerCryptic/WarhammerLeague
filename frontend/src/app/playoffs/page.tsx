'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import TournamentBracket from '@/components/TournamentBracket';

const API_BASE = 'https://accessible-positivity-e213bb2958.strapiapp.com/api';

interface PlayoffLeague {
  documentId: string;
  name: string;
  gameSystem: string;
  statusleague: string;
  matches: any[];
  league_players: any[];
}

export default function PlayoffsPage() {
  const [playoffs, setPlayoffs] = useState<PlayoffLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayoff, setSelectedPlayoff] = useState<PlayoffLeague | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchPlayoffs();
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/users/me?populate[role]=*`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setIsAdmin(data?.role?.name === 'Admin' || data?.role?.name === 'LeagueCreator');
    } catch {}
  };

  const fetchPlayoffs = async () => {
    try {
      const res = await fetch(`${API_BASE}/leagues`);
      const data = await res.json();
      const allLeagues = data.data || [];

      // Find single_elimination leagues (these are playoffs)
      const playoffLeagues = allLeagues.filter(
        (l: any) => l.format === 'single_elimination'
      );

      // Fetch full data for each playoff league
      const fullPlayoffs = await Promise.all(
        playoffLeagues.map(async (l: any) => {
          const fullRes = await fetch(
            `${API_BASE}/leagues/${l.documentId}?populate[league_players][populate]=*&populate[matches][populate]=*`
          );
          const fullData = await fullRes.json();
          return fullData.data;
        })
      );

      setPlayoffs(fullPlayoffs.filter(Boolean));

      // Auto-select if there's only one
      if (fullPlayoffs.filter(Boolean).length === 1) {
        setSelectedPlayoff(fullPlayoffs[0]);
      }
    } catch (err) {
      console.error('Failed to fetch playoffs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F1117' }}>
        <div className="text-white text-xl">Loading playoffs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F1117' }}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-16">
          <div>
            <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
              <span style={{ color: '#FF7F2A' }}>Playoff</span> Brackets
            </h2>
            <p className="mt-4 text-xl text-gray-400">
              Single-elimination playoffs across all game systems
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/playoffs/admin"
              className="px-6 py-3 rounded-lg font-semibold text-white transition-colors"
              style={{ backgroundColor: '#FF7F2A' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E86D1A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FF7F2A')}
            >
              Manage Playoffs
            </Link>
          )}
        </div>

        <div className="rounded-2xl p-8 border shadow-2xl" style={{ backgroundColor: 'rgba(30, 35, 48, 0.5)', borderColor: 'rgba(168, 85, 247, 0.15)' }}>
          {playoffs.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-16 h-16 text-gray-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="text-2xl font-bold text-gray-400 mb-2">No Active Playoffs</h3>
              <p className="text-gray-500">Playoff brackets will appear here once they are created.</p>
            </div>
          ) : !selectedPlayoff ? (
            /* Multiple playoffs - show list */
            <div>
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mr-4 shadow-lg" style={{ background: 'linear-gradient(to bottom right, #FF7F2A, #E86D1A)' }}>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Active Playoffs</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playoffs.map((playoff) => {
                  const totalMatches = playoff.matches?.length || 0;
                  const playedMatches = playoff.matches?.filter((m: any) => m.matchResult !== 'unplayed').length || 0;
                  const playerCount = playoff.league_players?.length || 0;
                  const maxRound = Math.max(0, ...(playoff.matches || []).map((m: any) => m.round || 0));

                  return (
                    <button
                      key={playoff.documentId}
                      onClick={() => setSelectedPlayoff(playoff)}
                      className="text-left rounded-lg p-4 border transition-all duration-200 cursor-pointer"
                      style={{ backgroundColor: '#2D3548', borderColor: 'rgba(168, 85, 247, 0.2)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)'; e.currentTarget.style.backgroundColor = '#3A4558'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.2)'; e.currentTarget.style.backgroundColor = '#2D3548'; }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-lg font-semibold text-white">{playoff.name}</h4>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-500 text-white">
                          {playoff.statusleague}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-400">
                        {playoff.gameSystem && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {playoff.gameSystem}
                          </div>
                        )}
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {playerCount} players
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          {playedMatches}/{totalMatches} matches played
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Selected playoff - show bracket */
            <div>
              {playoffs.length > 1 && (
                <button
                  onClick={() => setSelectedPlayoff(null)}
                  className="flex items-center text-gray-400 hover:text-white transition-colors mb-6"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to all playoffs
                </button>
              )}

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedPlayoff.name}</h3>
                  {selectedPlayoff.gameSystem && (
                    <p className="text-gray-400 mt-1">{selectedPlayoff.gameSystem}</p>
                  )}
                </div>
                <Link
                  href={`/leagues/${selectedPlayoff.documentId}`}
                  className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  style={{ color: '#FF7F2A', border: '1px solid #FF7F2A' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FF7F2A'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#FF7F2A'; }}
                >
                  View League Page
                </Link>
              </div>

              {(selectedPlayoff.matches || []).filter((m: any) => m.round >= 1).length > 0 ? (
                <TournamentBracket
                  matches={selectedPlayoff.matches || []}
                  totalRounds={Math.max(...(selectedPlayoff.matches || []).map((m: any) => m.round || 0))}
                />
              ) : (
                <div className="text-center py-12">
                  {(selectedPlayoff.matches || []).some((m: any) => m.round === 0) ? (
                    <>
                      <h4 className="text-xl font-bold text-gray-300 mb-2">Play-In Stage</h4>
                      <p className="text-gray-500 mb-6">The bracket will be generated after play-in matches are resolved.</p>
                      <div className="space-y-3 max-w-md mx-auto">
                        {(selectedPlayoff.matches || [])
                          .filter((m: any) => m.round === 0)
                          .map((m: any) => {
                            const resolved = m.matchResult !== 'unplayed';
                            return (
                              <div key={m.documentId} className={`p-4 rounded-lg border ${
                                resolved ? 'border-green-700 bg-green-900/10' : 'border-yellow-700 bg-yellow-900/10'
                              }`}>
                                <div className="flex items-center justify-center gap-4 text-white font-medium">
                                  <span>{m.leaguePlayer1?.leagueName || 'TBD'}</span>
                                  <span className="text-gray-500 text-sm">vs</span>
                                  <span>{m.leaguePlayer2?.leagueName || 'TBD'}</span>
                                </div>
                                {resolved && (
                                  <div className="text-center mt-2 text-sm text-green-400 font-medium">
                                    Winner: {m.matchResult === 'player1_win' ? m.leaguePlayer1?.leagueName : m.leaguePlayer2?.leagueName}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="text-xl font-bold text-gray-300 mb-2">Bracket Not Yet Generated</h4>
                      <p className="text-gray-500">The bracket will appear here once the tournament admin generates it.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
