'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import TournamentBracket from '@/components/TournamentBracket';

const API_BASE = 'https://accessible-positivity-e213bb2958.strapiapp.com/api';

interface LeagueOption {
  documentId: string;
  name: string;
  gameSystem: string;
  statusleague: string;
  playerCount: number;
}

interface PoolData {
  name: string;
  documentId: string;
  players: {
    documentId: string;
    leagueName: string;
    faction: string;
    rankingPoints: number;
    wins: number;
    draws: number;
    losses: number;
    vp: number;
  }[];
}

interface PlayoffLeague {
  documentId: string;
  name: string;
  matches: any[];
  league_players: any[];
}

export default function PlayoffsPage() {
  const [allLeagues, setAllLeagues] = useState<LeagueOption[]>([]);
  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>([]);
  const [qualifiersPerPool, setQualifiersPerPool] = useState(3);
  const [playoffName, setPlayoffName] = useState('');
  const [pools, setPools] = useState<PoolData[]>([]);
  const [playoffLeague, setPlayoffLeague] = useState<PlayoffLeague | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPools, setLoadingPools] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingBracket, setGeneratingBracket] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  // Fetch all leagues + check for existing playoff
  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/leagues`);
      const data = await res.json();
      const leagues = data.data || [];

      // Check for existing playoff league
      const existing = leagues.find(
        (l: any) => l.format === 'single_elimination' && l.name?.toLowerCase().includes('playoff')
      );
      if (existing) {
        const fullRes = await fetch(
          `${API_BASE}/leagues/${existing.documentId}?populate[league_players][populate]=*&populate[matches][populate]=*`
        );
        const fullData = await fullRes.json();
        setPlayoffLeague(fullData.data);
      }

      // Available pool leagues (round_robin, ongoing or completed)
      const poolOptions: LeagueOption[] = leagues
        .filter((l: any) => l.format !== 'single_elimination')
        .map((l: any) => ({
          documentId: l.documentId,
          name: l.name,
          gameSystem: l.gameSystem || '',
          statusleague: l.statusleague || '',
          playerCount: l.league_players?.length || 0,
        }));

      setAllLeagues(poolOptions);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leagues');
    } finally {
      setLoading(false);
    }
  };

  // Fetch pool standings when selection changes
  const fetchPoolData = async (ids: string[]) => {
    if (ids.length === 0) { setPools([]); return; }
    setLoadingPools(true);
    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(
            `${API_BASE}/leagues/${id}?populate[league_players][populate]=*&populate[matches]=*`
          );
          const data = await res.json();
          if (!data.data) return null;

          const league = data.data;
          const matches = league.matches || [];
          const players = (league.league_players || [])
            .filter((p: any) => p.status !== 'dropped')
            .map((p: any) => {
              let vp = 0;
              for (const m of matches) {
                if (m.leaguePlayer1?.documentId === p.documentId) vp += m.leaguePlayer1Score || 0;
                if (m.leaguePlayer2?.documentId === p.documentId) vp += m.leaguePlayer2Score || 0;
              }
              return { ...p, vp };
            })
            .sort((a: any, b: any) => {
              if (b.rankingPoints !== a.rankingPoints) return b.rankingPoints - a.rankingPoints;
              if (b.wins !== a.wins) return b.wins - a.wins;
              return b.vp - a.vp;
            });

          return { name: league.name, documentId: league.documentId, players } as PoolData;
        })
      );
      setPools(results.filter(Boolean) as PoolData[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingPools(false);
    }
  };

  const togglePool = (id: string) => {
    setSelectedPoolIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      fetchPoolData(next);
      return next;
    });
  };

  const handleGeneratePlayoffs = async () => {
    if (selectedPoolIds.length < 2) {
      setError('Select at least 2 pools.');
      return;
    }
    if (!playoffName.trim()) {
      setError('Enter a name for the playoff league.');
      return;
    }
    if (!confirm('Generate the playoff league? This will create play-in matches if needed.')) return;

    setGenerating(true);
    setError('');
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE}/leagues/generate-playoffs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          poolLeagueIds: selectedPoolIds,
          name: playoffName.trim(),
          qualifiersPerPool,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to generate playoffs');

      await fetchLeagues();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateBracket = async () => {
    if (!playoffLeague) return;
    if (!confirm('Generate the full bracket? All play-in matches must be resolved.')) return;

    setGeneratingBracket(true);
    setError('');
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE}/leagues/${playoffLeague.documentId}/generate-playoffs-bracket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to generate bracket');

      await fetchLeagues();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingBracket(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-white text-xl text-center">Loading playoffs...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Playoffs Admin</h2>
          <p className="text-gray-600 dark:text-gray-400">You must be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  // Determine current state
  const playInMatches = playoffLeague?.matches?.filter((m: any) => m.round === 0) || [];
  const unresolvedPlayIns = playInMatches.filter((m: any) => m.matchResult === 'unplayed');
  const bracketMatches = playoffLeague?.matches?.filter((m: any) => m.round >= 1) || [];
  const hasBracket = bracketMatches.length > 0;
  const state = !playoffLeague ? 'setup' : !hasBracket ? 'play-in' : 'bracket';

  // Compute qualifier preview
  const totalQualifiers = pools.reduce((sum, p) => sum + Math.min(qualifiersPerPool, p.players.length), 0);
  const bracketSize = totalQualifiers >= 2 ? Math.pow(2, Math.floor(Math.log2(totalQualifiers))) : 0;
  const numPlayIns = totalQualifiers - bracketSize;
  const totalRounds = bracketSize > 0 ? Math.log2(bracketSize) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
          <span className="w-1 h-10 bg-orange-500 mr-3 rounded-full"></span>
          Playoffs
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Select pools, choose how many qualify per pool, preview the bracket structure, then generate.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* STATE: Setup / Pool Selection */}
      {state === 'setup' && (
        <>
          {/* Pool Selection */}
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Select Pools</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pick the pool leagues that feed into this playoff. You can select any number (2+).
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allLeagues.map((league) => {
                const selected = selectedPoolIds.includes(league.documentId);
                return (
                  <button
                    key={league.documentId}
                    onClick={() => togglePool(league.documentId)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      selected
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{league.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {league.gameSystem} &middot; {league.playerCount} players &middot; {league.statusleague}
                    </div>
                  </button>
                );
              })}
            </div>

            {allLeagues.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No leagues found.</p>
            )}
          </div>

          {/* Config */}
          {selectedPoolIds.length >= 2 && (
            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Playoff Settings</h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Playoff Name
                  </label>
                  <input
                    type="text"
                    value={playoffName}
                    onChange={(e) => setPlayoffName(e.target.value)}
                    placeholder="e.g. Bristol 40K Playoffs"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Qualifiers Per Pool
                  </label>
                  <select
                    value={qualifiersPerPool}
                    onChange={(e) => {
                      setQualifiersPerPool(Number(e.target.value));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>Top {n}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bracket math preview */}
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm space-y-1">
                <div className="text-gray-700 dark:text-gray-300">
                  <strong>{selectedPoolIds.length}</strong> pools &times; <strong>{qualifiersPerPool}</strong> per pool = <strong>{totalQualifiers}</strong> qualifiers
                </div>
                {bracketSize > 0 && (
                  <>
                    <div className="text-gray-700 dark:text-gray-300">
                      Bracket size: <strong>{bracketSize}</strong> players &middot; <strong>{totalRounds}</strong> rounds
                    </div>
                    {numPlayIns > 0 ? (
                      <div className="text-orange-600 dark:text-orange-400">
                        <strong>{numPlayIns}</strong> play-in match{numPlayIns > 1 ? 'es' : ''} needed ({numPlayIns * 2} players compete for {numPlayIns} spot{numPlayIns > 1 ? 's' : ''})
                      </div>
                    ) : (
                      <div className="text-green-600 dark:text-green-400">
                        Perfect bracket — no play-ins needed
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Pool Standings Preview */}
          {loadingPools && (
            <div className="text-center text-gray-500 py-4">Loading pool standings...</div>
          )}

          {pools.map((pool) => (
            <div key={pool.documentId} className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{pool.name}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Pos</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Player</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">W</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">D</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">L</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">VP</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {pool.players.map((player, idx) => (
                      <tr
                        key={player.documentId}
                        className={idx < qualifiersPerPool ? 'bg-green-50 dark:bg-green-900/10' : ''}
                      >
                        <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="text-gray-900 dark:text-white font-medium">{player.leagueName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{player.faction}</div>
                        </td>
                        <td className="py-3 px-4 text-center text-green-600 dark:text-green-400">{player.wins}</td>
                        <td className="py-3 px-4 text-center text-yellow-600 dark:text-yellow-400">{player.draws}</td>
                        <td className="py-3 px-4 text-center text-red-600 dark:text-red-400">{player.losses}</td>
                        <td className="py-3 px-4 text-center text-blue-600 dark:text-blue-400">{player.vp}</td>
                        <td className="py-3 px-4 text-center font-bold text-orange-600 dark:text-orange-400">{player.rankingPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Generate Button */}
          {selectedPoolIds.length >= 2 && pools.length >= 2 && (
            <div className="text-center">
              <button
                onClick={handleGeneratePlayoffs}
                disabled={generating || !playoffName.trim()}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors text-lg"
              >
                {generating ? 'Generating...' : 'Generate Playoffs'}
              </button>
            </div>
          )}
        </>
      )}

      {/* STATE: Play-in */}
      {state === 'play-in' && playoffLeague && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Play-In Matches ({playInMatches.length - unresolvedPlayIns.length}/{playInMatches.length} resolved)
            </h3>

            {playInMatches.length === 0 ? (
              <p className="text-green-600 dark:text-green-400 font-medium">
                No play-ins needed — all qualifiers go straight to the bracket.
              </p>
            ) : (
              <div className="space-y-3">
                {playInMatches.map((m: any, idx: number) => {
                  const resolved = m.matchResult !== 'unplayed';
                  const winnerName = m.matchResult === 'player1_win'
                    ? m.leaguePlayer1?.leagueName
                    : m.matchResult === 'player2_win'
                    ? m.leaguePlayer2?.leagueName
                    : null;

                  return (
                    <div key={m.documentId} className={`flex items-center justify-between p-4 rounded-lg border ${
                      resolved ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/10' : 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10'
                    }`}>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">#{idx + 1}</span>
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {m.leaguePlayer1?.leagueName || 'TBD'}
                        </span>
                        <span className="text-gray-400">vs</span>
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {m.leaguePlayer2?.leagueName || 'TBD'}
                        </span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        resolved
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {resolved ? `Winner: ${winnerName}` : 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {unresolvedPlayIns.length > 0 && (
              <div className="mt-4">
                <Link
                  href={`/leagues/${playoffLeague.documentId}`}
                  className="text-orange-600 hover:text-orange-700 dark:text-orange-400 font-medium underline"
                >
                  Go to league page to submit match results
                </Link>
              </div>
            )}
          </div>

          {(unresolvedPlayIns.length === 0) && (
            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {playInMatches.length === 0
                  ? 'Ready to generate the bracket.'
                  : 'All play-ins resolved. Ready to generate the bracket.'}
              </p>
              <button
                onClick={handleGenerateBracket}
                disabled={generatingBracket}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {generatingBracket ? 'Generating...' : 'Generate Bracket'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STATE: Bracket */}
      {state === 'bracket' && playoffLeague && (
        <div className="space-y-6">
          <TournamentBracket
            matches={playoffLeague.matches || []}
            totalRounds={Math.max(...(playoffLeague.matches || []).map((m: any) => m.round || 0))}
          />

          <div className="text-center">
            <Link
              href={`/leagues/${playoffLeague.documentId}`}
              className="text-orange-600 hover:text-orange-700 dark:text-orange-400 font-medium underline"
            >
              View full playoff league page
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
