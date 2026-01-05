'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com';

interface Match {
  id: number;
  documentId: string;
  statusMatch: string;
  round?: number;
  leaguePlayer1Score: number;
  leaguePlayer2Score: number;
  leaguePlayer1List?: string;
  leaguePlayer2List?: string;
  leaguePlayer1: {
    documentId: string;
    leagueName: string;
    faction?: string;
  };
  leaguePlayer2: {
    documentId: string;
    leagueName: string;
    faction?: string;
  };
}

interface LeagueEntry {
  leagueDocumentId: string;
  leagueName: string;
  gameSystem: string;
  leaguePlayerDocumentId: string;
  leagueName_display: string;
  faction?: string;
  wins: number;
  draws: number;
  losses: number;
  rankingPoints: number;
  matches: Match[];
}

interface PlayerProfile {
  documentId: string;
  name: string;
  leagues: LeagueEntry[];
  totalStats: {
    wins: number;
    draws: number;
    losses: number;
    totalGames: number;
    rankingPoints: number;
    victoryPoints: number;
    avgVP: number;
    winRate: number;
  };
}

export default function PlayerProfilePage() {
  const params = useParams();
  const playerDocId = params.playerId as string;
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string>('all');

  useEffect(() => {
    if (playerDocId) {
      fetchPlayerProfile();
    }
  }, [playerDocId]);

  const fetchPlayerProfile = async () => {
    try {
      // Fetch all leagues with league_players populated with player
      const leaguesResponse = await fetch(
        `${API_URL}/api/leagues?populate[league_players][populate][0]=player`
      );
      const leaguesData = await leaguesResponse.json();

      if (!leaguesData.data) {
        setLoading(false);
        return;
      }

      // Find all league_players for this player
      const playerLeagues: LeagueEntry[] = [];
      let playerName = '';

      for (const league of leaguesData.data) {
        const leaguePlayers = league.league_players || [];
        const matchingLP = leaguePlayers.find(
          (lp: any) => lp.player?.documentId === playerDocId
        );

        if (matchingLP) {
          if (!playerName) {
            playerName = matchingLP.player?.name || matchingLP.leagueName || 'Unknown';
          }

          // Fetch matches for this league
          const matchesResponse = await fetch(
            `${API_URL}/api/leagues/${league.documentId}?populate[matches][populate][0]=leaguePlayer1&populate[matches][populate][1]=leaguePlayer2`
          );
          const matchesData = await matchesResponse.json();
          const allMatches = matchesData.data?.matches || [];

          // Filter matches for this league player
          const playerMatches = allMatches.filter(
            (m: Match) =>
              m.leaguePlayer1?.documentId === matchingLP.documentId ||
              m.leaguePlayer2?.documentId === matchingLP.documentId
          );

          playerLeagues.push({
            leagueDocumentId: league.documentId,
            leagueName: league.name,
            gameSystem: league.gameSystem || 'Unknown',
            leaguePlayerDocumentId: matchingLP.documentId,
            leagueName_display: matchingLP.leagueName,
            faction: matchingLP.faction,
            wins: matchingLP.wins || 0,
            draws: matchingLP.draws || 0,
            losses: matchingLP.losses || 0,
            rankingPoints: matchingLP.rankingPoints || 0,
            matches: playerMatches
          });
        }
      }

      if (playerLeagues.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate total stats
      let totalWins = 0, totalDraws = 0, totalLosses = 0, totalRP = 0, totalVP = 0;

      playerLeagues.forEach(league => {
        totalWins += league.wins;
        totalDraws += league.draws;
        totalLosses += league.losses;
        totalRP += league.rankingPoints;

        // Calculate VP from matches
        league.matches.forEach(match => {
          if (match.statusMatch === 'played') {
            if (match.leaguePlayer1?.documentId === league.leaguePlayerDocumentId) {
              totalVP += match.leaguePlayer1Score || 0;
            } else {
              totalVP += match.leaguePlayer2Score || 0;
            }
          }
        });
      });

      const totalGames = totalWins + totalDraws + totalLosses;

      setPlayer({
        documentId: playerDocId,
        name: playerName,
        leagues: playerLeagues,
        totalStats: {
          wins: totalWins,
          draws: totalDraws,
          losses: totalLosses,
          totalGames,
          rankingPoints: totalRP,
          victoryPoints: totalVP,
          avgVP: totalGames > 0 ? Math.round((totalVP / totalGames) * 10) / 10 : 0,
          winRate: totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0
        }
      });
    } catch (error) {
      console.error('Error fetching player profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMatchResult = (match: Match, lpDocId: string) => {
    const isPlayer1 = match.leaguePlayer1?.documentId === lpDocId;
    const playerScore = isPlayer1 ? match.leaguePlayer1Score : match.leaguePlayer2Score;
    const opponentScore = isPlayer1 ? match.leaguePlayer2Score : match.leaguePlayer1Score;

    if (playerScore > opponentScore) return 'win';
    if (playerScore < opponentScore) return 'loss';
    return 'draw';
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-400';
      case 'loss': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getResultBg = (result: string) => {
    switch (result) {
      case 'win': return 'bg-green-900/30 border-green-700/50';
      case 'loss': return 'bg-red-900/30 border-red-700/50';
      default: return 'bg-yellow-900/30 border-yellow-700/50';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-white text-xl">Loading player profile...</div>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Player Not Found</h2>
          <p className="text-gray-400 mb-4">This player profile doesn't exist.</p>
          <Link href="/stats" className="text-orange-400 hover:text-orange-300">
            &larr; Back to Leaderboards
          </Link>
        </div>
      </div>
    );
  }

  // Get all matches from all leagues, optionally filtered
  const allMatches = player.leagues
    .filter(league => selectedLeague === 'all' || league.leagueDocumentId === selectedLeague)
    .flatMap(league => league.matches.map(m => ({ ...m, league })));

  // Sort by most recent (using match id as proxy)
  allMatches.sort((a, b) => b.id - a.id);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Back link */}
      <Link href="/stats" className="text-gray-400 hover:text-white text-sm inline-flex items-center gap-1">
        &larr; Back to Leaderboards
      </Link>

      {/* Player Header */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
        <h1 className="text-3xl font-bold text-white mb-2">{player.name}</h1>
        <p className="text-gray-400">
          {player.leagues.length} {player.leagues.length === 1 ? 'league' : 'leagues'} • {player.totalStats.totalGames} games played
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-green-400">{player.totalStats.wins}</div>
          <div className="text-sm text-gray-400">Wins</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-yellow-400">{player.totalStats.draws}</div>
          <div className="text-sm text-gray-400">Draws</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-red-400">{player.totalStats.losses}</div>
          <div className="text-sm text-gray-400">Losses</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-blue-400">{player.totalStats.winRate}%</div>
          <div className="text-sm text-gray-400">Win Rate</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-purple-400">{player.totalStats.avgVP}</div>
          <div className="text-sm text-gray-400">Avg VP</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-orange-400">{player.totalStats.rankingPoints}</div>
          <div className="text-sm text-gray-400">League Points</div>
        </div>
      </div>

      {/* Leagues Section */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Leagues</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {player.leagues.map((league) => (
            <Link
              key={league.leaguePlayerDocumentId}
              href={`/leagues/${league.leagueDocumentId}`}
              className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-orange-500/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-white">{league.leagueName}</h3>
                  <p className="text-sm text-gray-400">{league.gameSystem}</p>
                </div>
                <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                  {league.faction || 'No faction'}
                </span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-green-400">{league.wins}W</span>
                <span className="text-yellow-400">{league.draws}D</span>
                <span className="text-red-400">{league.losses}L</span>
                <span className="text-orange-400">{league.rankingPoints} LP</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Match History */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Match History</h2>
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 text-sm"
          >
            <option value="all">All Leagues</option>
            {player.leagues.map((league) => (
              <option key={league.leagueDocumentId} value={league.leagueDocumentId}>
                {league.leagueName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {allMatches.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No matches found</div>
          ) : (
            allMatches.filter(m => m.statusMatch === 'played').map((match) => {
              const isPlayer1 = match.leaguePlayer1?.documentId === match.league.leaguePlayerDocumentId;
              const playerScore = isPlayer1 ? match.leaguePlayer1Score : match.leaguePlayer2Score;
              const opponentScore = isPlayer1 ? match.leaguePlayer2Score : match.leaguePlayer1Score;
              const opponent = isPlayer1 ? match.leaguePlayer2 : match.leaguePlayer1;
              const playerList = isPlayer1 ? match.leaguePlayer1List : match.leaguePlayer2List;
              const opponentList = isPlayer1 ? match.leaguePlayer2List : match.leaguePlayer1List;
              const result = getMatchResult(match, match.league.leaguePlayerDocumentId);
              const isExpanded = expandedMatch === match.documentId;

              return (
                <div
                  key={match.documentId}
                  className={`rounded-lg border transition-colors ${getResultBg(result)}`}
                >
                  <button
                    onClick={() => setExpandedMatch(isExpanded ? null : match.documentId)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span className={`font-bold text-lg ${getResultColor(result)}`}>
                          {result.toUpperCase()}
                        </span>
                        <div>
                          <div className="text-white font-medium">
                            vs {opponent?.leagueName || 'Unknown'}
                            {opponent?.faction && (
                              <span className="text-gray-400 text-sm ml-2">({opponent.faction})</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            {match.league.leagueName}
                            {match.round && ` • Round ${match.round}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">
                            {playerScore} - {opponentScore}
                          </div>
                          <div className="text-xs text-gray-400">VP</div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (playerList || opponentList) && (
                    <div className="px-4 pb-4 border-t border-gray-700/50 mt-2 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {playerList && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">
                              {player.name}'s List
                            </h4>
                            <pre className="bg-gray-900/50 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                              {playerList}
                            </pre>
                          </div>
                        )}
                        {opponentList && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">
                              {opponent?.leagueName}'s List
                            </h4>
                            <pre className="bg-gray-900/50 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                              {opponentList}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
