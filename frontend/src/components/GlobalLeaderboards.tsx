'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface LeaderboardEntry {
  id: string;
  leagueName: string;
  leagueId: string;
  leagueTitle: string;
  faction?: string;
  wins: number;
  draws: number;
  losses: number;
  rankingPoints: number;
  victoryPoints: number;
  winRate: number;
  totalGames: number;
}

interface GlobalStats {
  totalLeagues: number;
  totalPlayers: number;
  totalMatches: number;
  averageWinRate: number;
  mostPopularFaction: string;
  leaderboards: {
    topByPoints: LeaderboardEntry[];
    topByWinRate: LeaderboardEntry[];
    topByVictoryPoints: LeaderboardEntry[];
    mostActive: LeaderboardEntry[];
  };
}

export default function GlobalLeaderboards() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState<'points' | 'winrate' | 'victory' | 'active'>('points');

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    try {
      // Fetch all leagues and their players
      const leaguesResponse = await fetch('https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues?populate=league_players.faction,matches');
      const leaguesData = await leaguesResponse.json();

      if (!leaguesData.data) {
        setLoading(false);
        return;
      }

      let allPlayers: LeaderboardEntry[] = [];
      let totalMatches = 0;
      let factionCounts: { [key: string]: number } = {};

      leaguesData.data.forEach((league: any) => {
        const leagueMatches = league.matches || [];
        totalMatches += leagueMatches.length;

        (league.league_players || []).forEach((player: any) => {
          // Calculate victory points from matches
          let victoryPoints = 0;
          leagueMatches.forEach((match: any) => {
            if (match.leaguePlayer1?.documentId === player.documentId) {
              victoryPoints += match.leaguePlayer1Score || 0;
            } else if (match.leaguePlayer2?.documentId === player.documentId) {
              victoryPoints += match.leaguePlayer2Score || 0;
            }
          });

          const totalGames = (player.wins || 0) + (player.draws || 0) + (player.losses || 0);
          const winRate = totalGames > 0 ? Math.round(((player.wins || 0) / totalGames) * 100) : 0;

          allPlayers.push({
            id: player.documentId,
            leagueName: player.leagueName,
            leagueId: league.documentId,
            leagueTitle: league.name,
            faction: player.faction?.name,
            wins: player.wins || 0,
            draws: player.draws || 0,
            losses: player.losses || 0,
            rankingPoints: player.rankingPoints || 0,
            victoryPoints,
            winRate,
            totalGames
          });

          // Count factions
          const factionName = player.faction?.name || 'No Faction';
          factionCounts[factionName] = (factionCounts[factionName] || 0) + 1;
        });
      });

      // Find most popular faction
      const mostPopularFaction = Object.keys(factionCounts).reduce((a, b) => 
        factionCounts[a] > factionCounts[b] ? a : b, 'No Faction');

      // Calculate average win rate
      const playersWithGames = allPlayers.filter(p => p.totalGames > 0);
      const averageWinRate = playersWithGames.length > 0 
        ? Math.round(playersWithGames.reduce((sum, p) => sum + p.winRate, 0) / playersWithGames.length)
        : 0;

      // Create leaderboards
      const topByPoints = [...allPlayers]
        .sort((a, b) => b.rankingPoints - a.rankingPoints)
        .slice(0, 10);

      const topByWinRate = [...allPlayers]
        .filter(p => p.totalGames >= 3) // Minimum 3 games
        .sort((a, b) => b.winRate - a.winRate)
        .slice(0, 10);

      const topByVictoryPoints = [...allPlayers]
        .sort((a, b) => b.victoryPoints - a.victoryPoints)
        .slice(0, 10);

      const mostActive = [...allPlayers]
        .sort((a, b) => b.totalGames - a.totalGames)
        .slice(0, 10);

      setStats({
        totalLeagues: leaguesData.data.length,
        totalPlayers: allPlayers.length,
        totalMatches,
        averageWinRate,
        mostPopularFaction,
        leaderboards: {
          topByPoints,
          topByWinRate,
          topByVictoryPoints,
          mostActive
        }
      });

    } catch (error) {
      console.error('Error fetching global stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${position}`;
    }
  };

  const getRankStyle = (position: number) => {
    switch (position) {
      case 1: return 'text-yellow-500 font-bold';
      case 2: return 'text-gray-400 font-bold';
      case 3: return 'text-amber-600 font-bold';
      default: return 'text-gray-600 dark:text-gray-400 font-medium';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white text-xl">Loading global statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-8">
        <h3 className="text-2xl font-bold mb-3 text-gray-800 dark:text-gray-200">No Data Available</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Global statistics will appear once leagues are created and matches are played.
        </p>
      </div>
    );
  }

  const getCurrentLeaderboard = () => {
    switch (selectedBoard) {
      case 'points': return stats.leaderboards.topByPoints;
      case 'winrate': return stats.leaderboards.topByWinRate;
      case 'victory': return stats.leaderboards.topByVictoryPoints;
      case 'active': return stats.leaderboards.mostActive;
      default: return stats.leaderboards.topByPoints;
    }
  };

  const getMetricValue = (player: LeaderboardEntry) => {
    switch (selectedBoard) {
      case 'points': return `${player.rankingPoints} LP`;
      case 'winrate': return `${player.winRate}%`;
      case 'victory': return `${player.victoryPoints} VP`;
      case 'active': return `${player.totalGames} games`;
      default: return `${player.rankingPoints} LP`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
          <span className="w-1 h-8 bg-orange-500 mr-3 rounded-full"></span>
          Global Leaderboards
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Top performers across all leagues
        </p>
      </div>

      {/* Global Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
            {stats.totalLeagues}
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            Active Leagues
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
            {stats.totalPlayers}
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            Total Players
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
            {stats.totalMatches}
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            Matches Played
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
            {stats.averageWinRate}%
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            Avg Win Rate
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1 truncate">
            {stats.mostPopularFaction}
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            Top Faction
          </div>
        </div>
      </div>

      {/* Leaderboard Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'points', name: 'League Points', desc: 'Ranked by total league points' },
              { id: 'winrate', name: 'Win Rate', desc: 'Best win percentage (min 3 games)' },
              { id: 'victory', name: 'Victory Points', desc: 'Total victory points scored' },
              { id: 'active', name: 'Most Active', desc: 'Most games played' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedBoard(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  selectedBoard === tab.id
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {selectedBoard === 'points' && 'Top by League Points'}
              {selectedBoard === 'winrate' && 'Best Win Rates'}
              {selectedBoard === 'victory' && 'Highest Victory Points'}
              {selectedBoard === 'active' && 'Most Active Players'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedBoard === 'points' && 'Players ranked by total league points earned'}
              {selectedBoard === 'winrate' && 'Players with best win percentage (minimum 3 games)'}
              {selectedBoard === 'victory' && 'Players who have scored the most victory points'}
              {selectedBoard === 'active' && 'Players who have played the most games'}
            </p>
          </div>

          <div className="space-y-2">
            {getCurrentLeaderboard().map((player, index) => (
              <div 
                key={`${player.leagueId}-${player.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`text-lg min-w-[40px] text-center ${getRankStyle(index + 1)}`}>
                    {getRankIcon(index + 1)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                      {player.leagueName}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Link 
                        href={`/leagues/${player.leagueId}`}
                        className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                      >
                        {player.leagueTitle}
                      </Link>
                      {player.faction && (
                        <>
                          <span>•</span>
                          <span>{player.faction}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {getMetricValue(player)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {player.wins}-{player.draws}-{player.losses}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {getCurrentLeaderboard().length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No players found for this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}