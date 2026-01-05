'use client';

import React, { useState, useEffect } from 'react';

interface LeaderboardEntry {
  id: string;
  playerName: string;
  leagueCount: number;
  wins: number;
  draws: number;
  losses: number;
  rankingPoints: number;
  victoryPoints: number;
  winRate: number;
  totalGames: number;
  avgVPPerGame: number;
}

interface GameSystemStats {
  gameSystem: string;
  playerCount: number;
  leagueCount: number;
  topPlayers: LeaderboardEntry[];
}

interface GlobalStats {
  totalLeagues: number;
  totalPlayers: number;
  totalMatches: number;
  mostPopularFaction: string;
  gameSystems: GameSystemStats[];
  leaderboards: {
    topByPoints: LeaderboardEntry[];
    topByWinRate: LeaderboardEntry[];
    mostActive: LeaderboardEntry[];
  };
}

export default function GlobalLeaderboards() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState<string>('points');

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    try {
      // Fetch all leagues with players and matches (for VP calculation)
      const leaguesResponse = await fetch('https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues?populate[league_players][populate]=player&populate[matches][populate][leaguePlayer1]=documentId&populate[matches][populate][leaguePlayer2]=documentId');
      const leaguesData = await leaguesResponse.json();

      if (!leaguesData.data) {
        setLoading(false);
        return;
      }

      let totalGamesPlayed = 0;
      let factionCounts: { [key: string]: number } = {};
      const playerStatsMap = new Map();
      const gameSystemStatsMap = new Map<string, { players: Map<string, any>, leagueCount: number }>();

      // First pass: collect league player document IDs to player IDs mapping
      const leaguePlayerToPlayer = new Map<string, { playerId: string; playerName: string }>();

      leaguesData.data.forEach((league: any) => {
        (league.league_players || []).forEach((lp: any) => {
          if (lp.documentId && lp.player?.id) {
            leaguePlayerToPlayer.set(lp.documentId, {
              playerId: lp.player.id,
              playerName: lp.player.name || 'Anonymous'
            });
          }
        });
      });

      leaguesData.data.forEach((league: any) => {
        const gameSystem = league.gameSystem || 'Unknown';

        // Track game system stats
        if (!gameSystemStatsMap.has(gameSystem)) {
          gameSystemStatsMap.set(gameSystem, { players: new Map(), leagueCount: 0 });
        }
        const gsStats = gameSystemStatsMap.get(gameSystem)!;
        gsStats.leagueCount += 1;

        // Calculate VP from matches for this league
        const matchVPMap = new Map<string, number>(); // leaguePlayer documentId -> VP
        (league.matches || []).forEach((match: any) => {
          if (match.statusMatch === 'played') {
            const lp1DocId = match.leaguePlayer1?.documentId;
            const lp2DocId = match.leaguePlayer2?.documentId;

            if (lp1DocId) {
              matchVPMap.set(lp1DocId, (matchVPMap.get(lp1DocId) || 0) + (match.leaguePlayer1Score || 0));
            }
            if (lp2DocId) {
              matchVPMap.set(lp2DocId, (matchVPMap.get(lp2DocId) || 0) + (match.leaguePlayer2Score || 0));
            }
          }
        });

        (league.league_players || []).forEach((leaguePlayer: any) => {
          const playerId = leaguePlayer.player?.id;
          if (!playerId) return;

          const playerName = leaguePlayer.player?.name || 'Anonymous';
          const playerGames = (leaguePlayer.wins || 0) + (leaguePlayer.draws || 0) + (leaguePlayer.losses || 0);
          const playerVP = matchVPMap.get(leaguePlayer.documentId) || 0;
          totalGamesPlayed += playerGames;

          // Global player stats
          if (!playerStatsMap.has(playerId)) {
            playerStatsMap.set(playerId, {
              id: playerId,
              playerName: playerName,
              wins: 0,
              draws: 0,
              losses: 0,
              rankingPoints: 0,
              victoryPoints: 0,
              totalGames: 0,
              leagueCount: 0
            });
          }

          const globalStats = playerStatsMap.get(playerId);
          globalStats.wins += leaguePlayer.wins || 0;
          globalStats.draws += leaguePlayer.draws || 0;
          globalStats.losses += leaguePlayer.losses || 0;
          globalStats.rankingPoints += leaguePlayer.rankingPoints || 0;
          globalStats.victoryPoints += playerVP;
          globalStats.totalGames += playerGames;
          globalStats.leagueCount += 1;

          // Game-system specific player stats
          if (!gsStats.players.has(playerId)) {
            gsStats.players.set(playerId, {
              id: playerId,
              playerName: playerName,
              wins: 0,
              draws: 0,
              losses: 0,
              rankingPoints: 0,
              victoryPoints: 0,
              totalGames: 0,
              leagueCount: 0
            });
          }

          const gsPlayerStats = gsStats.players.get(playerId);
          gsPlayerStats.wins += leaguePlayer.wins || 0;
          gsPlayerStats.draws += leaguePlayer.draws || 0;
          gsPlayerStats.losses += leaguePlayer.losses || 0;
          gsPlayerStats.rankingPoints += leaguePlayer.rankingPoints || 0;
          gsPlayerStats.victoryPoints += playerVP;
          gsPlayerStats.totalGames += playerGames;
          gsPlayerStats.leagueCount += 1;

          // Count factions
          const factionName = leaguePlayer.faction || 'No Faction';
          factionCounts[factionName] = (factionCounts[factionName] || 0) + 1;
        });
      });

      // Convert global map to array and calculate win rates
      const allPlayers: LeaderboardEntry[] = Array.from(playerStatsMap.values()).map(player => ({
        ...player,
        winRate: player.totalGames > 0 ? Math.round((player.wins / player.totalGames) * 100) : 0,
        avgVPPerGame: player.totalGames > 0 ? Math.round((player.victoryPoints / player.totalGames) * 10) / 10 : 0
      }));

      // Convert game system stats
      const gameSystems: GameSystemStats[] = Array.from(gameSystemStatsMap.entries()).map(([gameSystem, data]) => {
        const players: LeaderboardEntry[] = Array.from(data.players.values()).map(player => ({
          ...player,
          winRate: player.totalGames > 0 ? Math.round((player.wins / player.totalGames) * 100) : 0,
          avgVPPerGame: player.totalGames > 0 ? Math.round((player.victoryPoints / player.totalGames) * 10) / 10 : 0
        }));

        // Sort by average VP per game
        const topPlayers = [...players]
          .filter(p => p.totalGames >= 2) // Minimum 2 games
          .sort((a, b) => b.avgVPPerGame - a.avgVPPerGame)
          .slice(0, 10);

        return {
          gameSystem,
          playerCount: data.players.size,
          leagueCount: data.leagueCount,
          topPlayers
        };
      }).sort((a, b) => b.playerCount - a.playerCount); // Sort by player count

      // Find most popular faction
      const mostPopularFaction = Object.keys(factionCounts).length > 0
        ? Object.keys(factionCounts).reduce((a, b) => factionCounts[a] > factionCounts[b] ? a : b)
        : 'None';

      // Create global leaderboards
      const topByPoints = [...allPlayers]
        .sort((a, b) => b.rankingPoints - a.rankingPoints)
        .slice(0, 10);

      const topByWinRate = [...allPlayers]
        .filter(p => p.totalGames >= 3)
        .sort((a, b) => b.winRate - a.winRate)
        .slice(0, 10);

      const mostActive = [...allPlayers]
        .sort((a, b) => b.totalGames - a.totalGames)
        .slice(0, 10);

      const totalMatches = Math.floor(totalGamesPlayed / 2);

      setStats({
        totalLeagues: leaguesData.data.length,
        totalPlayers: playerStatsMap.size,
        totalMatches,
        mostPopularFaction,
        gameSystems,
        leaderboards: {
          topByPoints,
          topByWinRate,
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

  const getGameSystemShortName = (gameSystem: string) => {
    const shortNames: { [key: string]: string } = {
      'Warhammer: 40,000': '40K',
      'Warhammer: The Horus Heresy': 'Heresy',
      'Warhammer: The Old World': 'Old World',
      'A Song of Ice and Fire': 'ASOIAF'
    };
    return shortNames[gameSystem] || gameSystem;
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
    if (selectedBoard === 'points') return stats.leaderboards.topByPoints;
    if (selectedBoard === 'winrate') return stats.leaderboards.topByWinRate;
    if (selectedBoard === 'active') return stats.leaderboards.mostActive;

    // Game-specific tab
    const gameStats = stats.gameSystems.find(gs => gs.gameSystem === selectedBoard);
    return gameStats?.topPlayers || [];
  };

  const getMetricValue = (player: LeaderboardEntry) => {
    if (selectedBoard === 'points') return `${player.rankingPoints} LP`;
    if (selectedBoard === 'winrate') return `${player.winRate}%`;
    if (selectedBoard === 'active') return `${player.totalGames} games`;

    // Game-specific: show avg VP per game
    return `${player.avgVPPerGame} avg VP`;
  };

  const getTabTitle = () => {
    if (selectedBoard === 'points') return 'Top by League Points';
    if (selectedBoard === 'winrate') return 'Best Win Rates';
    if (selectedBoard === 'active') return 'Most Active Players';
    return `Top in ${selectedBoard}`;
  };

  const getTabDescription = () => {
    if (selectedBoard === 'points') return 'Players ranked by total league points earned';
    if (selectedBoard === 'winrate') return 'Players with best win percentage (minimum 3 games)';
    if (selectedBoard === 'active') return 'Players who have played the most games';
    return 'Players ranked by average victory points per game (minimum 2 games)';
  };

  // Build tabs array
  const globalTabs = [
    { id: 'points', name: 'League Points' },
    { id: 'winrate', name: 'Win Rate' },
    { id: 'active', name: 'Most Active' }
  ];

  const gameTabs = stats.gameSystems.map(gs => ({
    id: gs.gameSystem,
    name: getGameSystemShortName(gs.gameSystem)
  }));

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1 text-lg">
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
          <nav className="flex flex-wrap px-4">
            {/* Global tabs */}
            <div className="flex space-x-4 border-r border-gray-200 dark:border-gray-700 pr-4 mr-4">
              {globalTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedBoard(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                    selectedBoard === tab.id
                      ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
            {/* Game-specific tabs */}
            <div className="flex space-x-4">
              {gameTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedBoard(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                    selectedBoard === tab.id
                      ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </nav>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {getTabTitle()}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getTabDescription()}
            </p>
          </div>

          <div className="space-y-2">
            {getCurrentLeaderboard().map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`text-lg min-w-[40px] text-center ${getRankStyle(index + 1)}`}>
                    {getRankIcon(index + 1)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {player.playerName}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {player.leagueCount} {player.leagueCount === 1 ? 'league' : 'leagues'} • {player.totalGames} games
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {getMetricValue(player)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {player.wins}W-{player.draws}D-{player.losses}L
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
