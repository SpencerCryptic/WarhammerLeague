'use client';

import React, { useState, useEffect } from 'react';
import { LeaguePlayer } from './TableRow';
import { Match } from './MatchesDashboard';

interface LeagueStatsProps {
  leagueId: string;
  players: LeaguePlayer[];
  matches: Match[];
}

interface PlayerStats extends LeaguePlayer {
  totalGames: number;
  victoryPoints: number;
  winRate: number;
  averageVictoryPoints: number;
  mostPlayedOpponent?: string;
  longestWinStreak: number;
  currentStreak: number;
  biggestVictory?: { score: number; opponent: string };
}

interface LeagueStatistics {
  totalMatches: number;
  completedMatches: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  mostActivePlayer?: string;
  mostWins?: string;
  bestWinRate?: string;
  highestVictoryPoints?: string;
  matchesPerRound: { [key: number]: number };
  factionDistribution: { [key: string]: number };
  scoreDistribution: { [key: string]: number };
}

export default function LeagueStats({ leagueId, players, matches }: LeagueStatsProps) {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [leagueStats, setLeagueStats] = useState<LeagueStatistics | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'players' | 'records'>('overview');

  useEffect(() => {
    calculateStats();
  }, [players, matches]);

  const calculateStats = () => {
    // Calculate enhanced player stats
    const enhancedPlayers: PlayerStats[] = players.map(player => {
      const playerMatches = matches.filter(match => 
        match.leaguePlayer1.documentId === player.documentId || 
        match.leaguePlayer2.documentId === player.documentId
      );
      
      let victoryPoints = 0;
      let opponents: string[] = [];
      let wins = 0;
      let winStreak = 0;
      let longestWinStreak = 0;
      let biggestVictory = { score: 0, opponent: '' };
      
      // Sort matches chronologically if they have dates
      const sortedMatches = playerMatches.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return 0;
      });

      sortedMatches.forEach(match => {
        const isPlayer1 = match.leaguePlayer1.documentId === player.documentId;
        const playerScore = isPlayer1 ? match.leaguePlayer1Score : match.leaguePlayer2Score;
        const opponentScore = isPlayer1 ? match.leaguePlayer2Score : match.leaguePlayer1Score;
        const opponentName = isPlayer1 ? match.leaguePlayer2.leagueName : match.leaguePlayer1.leagueName;
        
        victoryPoints += playerScore;
        opponents.push(opponentName);
        
        // Track biggest victory
        if (playerScore > biggestVictory.score) {
          biggestVictory = { score: playerScore, opponent: opponentName };
        }
        
        // Calculate win streaks
        if (playerScore > opponentScore) {
          wins++;
          winStreak++;
          longestWinStreak = Math.max(longestWinStreak, winStreak);
        } else {
          winStreak = 0;
        }
      });

      // Find most played opponent
      const opponentCounts = opponents.reduce((acc, opponent) => {
        acc[opponent] = (acc[opponent] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });
      
      const mostPlayedOpponent = Object.keys(opponentCounts).reduce((a, b) => 
        opponentCounts[a] > opponentCounts[b] ? a : b, '');

      const totalGames = player.wins + player.draws + player.losses;
      const winRate = totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0;
      const averageVictoryPoints = totalGames > 0 ? Math.round(victoryPoints / totalGames) : 0;

      return {
        ...player,
        totalGames,
        victoryPoints,
        winRate,
        averageVictoryPoints,
        mostPlayedOpponent: opponents.length > 0 ? mostPlayedOpponent : undefined,
        longestWinStreak,
        currentStreak: winStreak,
        biggestVictory: biggestVictory.score > 0 ? biggestVictory : undefined
      };
    });

    setPlayerStats(enhancedPlayers);

    // Calculate league-wide statistics
    const completedMatches = matches.filter(match => match.leaguePlayer1Score > 0 || match.leaguePlayer2Score > 0);
    const allScores = completedMatches.flatMap(match => [match.leaguePlayer1Score, match.leaguePlayer2Score]);
    
    const factionCounts = players.reduce((acc, player) => {
      const faction = player.faction?.name || 'No Faction';
      acc[faction] = (acc[faction] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const scoreRanges = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0
    };

    allScores.forEach(score => {
      if (score <= 20) scoreRanges['0-20']++;
      else if (score <= 40) scoreRanges['21-40']++;
      else if (score <= 60) scoreRanges['41-60']++;
      else if (score <= 80) scoreRanges['61-80']++;
      else scoreRanges['81-100']++;
    });

    const roundCounts = completedMatches.reduce((acc, match) => {
      const round = match.round || 1;
      acc[round] = (acc[round] || 0) + 1;
      return acc;
    }, {} as { [key: number]: number });

    // Find record holders
    const mostActivePlayer = enhancedPlayers.reduce((prev, current) => 
      current.totalGames > prev.totalGames ? current : prev
    ).leagueName;

    const mostWins = enhancedPlayers.reduce((prev, current) => 
      current.wins > prev.wins ? current : prev
    ).leagueName;

    const bestWinRatePlayer = enhancedPlayers
      .filter(p => p.totalGames >= 3) // Only consider players with at least 3 games
      .reduce((prev, current) => current.winRate > prev.winRate ? current : prev);

    const highestVPPlayer = enhancedPlayers.reduce((prev, current) => 
      current.victoryPoints > prev.victoryPoints ? current : prev
    ).leagueName;

    const leagueStatistics: LeagueStatistics = {
      totalMatches: matches.length,
      completedMatches: completedMatches.length,
      averageScore: allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0,
      highestScore: allScores.length > 0 ? Math.max(...allScores) : 0,
      lowestScore: allScores.length > 0 ? Math.min(...allScores) : 0,
      mostActivePlayer,
      mostWins,
      bestWinRate: bestWinRatePlayer ? bestWinRatePlayer.leagueName : undefined,
      highestVictoryPoints: highestVPPlayer,
      matchesPerRound: roundCounts,
      factionDistribution: factionCounts,
      scoreDistribution: scoreRanges
    };

    setLeagueStats(leagueStatistics);
  };

  const StatCard = ({ title, value, subtitle, color = 'blue' }: {
    title: string;
    value: string | number;
    subtitle?: string;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  }) => {
    const colorClasses = {
      blue: 'text-blue-600 dark:text-blue-400',
      green: 'text-green-600 dark:text-green-400',
      purple: 'text-purple-600 dark:text-purple-400',
      orange: 'text-orange-600 dark:text-orange-400',
      red: 'text-red-600 dark:text-red-400'
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className={`text-2xl font-bold ${colorClasses[color]} mb-1`}>
          {value}
        </div>
        <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {subtitle}
          </div>
        )}
      </div>
    );
  };

  if (!leagueStats) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500 dark:text-gray-400">Calculating statistics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
          <span className="w-1 h-8 bg-purple-500 mr-3 rounded-full"></span>
          League Statistics
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive analysis and insights
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'players', name: 'Player Stats' },
            { id: 'records', name: 'Records' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <StatCard 
              title="Total Matches" 
              value={leagueStats.totalMatches}
              color="blue"
            />
            <StatCard 
              title="Completed" 
              value={leagueStats.completedMatches}
              color="green"
            />
            <StatCard 
              title="Average Score" 
              value={leagueStats.averageScore}
              color="purple"
            />
            <StatCard 
              title="Highest Score" 
              value={leagueStats.highestScore}
              color="orange"
            />
            <StatCard 
              title="Active Players" 
              value={players.length}
              color="blue"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Faction Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Faction Distribution
              </h3>
              <div className="space-y-2">
                {Object.entries(leagueStats.factionDistribution).map(([faction, count]) => (
                  <div key={faction} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{faction}</span>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="bg-purple-200 dark:bg-purple-700 h-2 rounded-full"
                        style={{ width: `${Math.max((count / players.length) * 100, 10)}px` }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Score Distribution
              </h3>
              <div className="space-y-2">
                {Object.entries(leagueStats.scoreDistribution).map(([range, count]) => (
                  <div key={range} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{range} points</span>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="bg-blue-200 dark:bg-blue-700 h-2 rounded-full"
                        style={{ width: `${Math.max((count / Object.values(leagueStats.scoreDistribution).reduce((a, b) => a + b, 0)) * 100, 5)}px` }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Stats Tab */}
      {selectedTab === 'players' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {playerStats.map(player => (
              <div key={player.documentId} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                    {player.leagueName}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {player.faction?.name || 'No faction'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Games Played</div>
                    <div className="font-medium text-gray-900 dark:text-white">{player.totalGames}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Win Rate</div>
                    <div className="font-medium text-gray-900 dark:text-white">{player.winRate}%</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Victory Points</div>
                    <div className="font-medium text-gray-900 dark:text-white">{player.victoryPoints}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Avg VP/Game</div>
                    <div className="font-medium text-gray-900 dark:text-white">{player.averageVictoryPoints}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Win Streak</div>
                    <div className="font-medium text-gray-900 dark:text-white">{player.longestWinStreak}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">League Points</div>
                    <div className="font-medium text-orange-600 dark:text-orange-400">{player.rankingPoints}</div>
                  </div>
                </div>

                {player.biggestVictory && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Biggest Victory</div>
                    <div className="text-sm font-medium text-green-600 dark:text-green-400">
                      {player.biggestVictory.score} pts vs {player.biggestVictory.opponent}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Records Tab */}
      {selectedTab === 'records' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard 
              title="Most Active Player" 
              value={leagueStats.mostActivePlayer || 'N/A'}
              subtitle="Most games played"
              color="blue"
            />
            <StatCard 
              title="Most Wins" 
              value={leagueStats.mostWins || 'N/A'}
              subtitle="Total victories"
              color="green"
            />
            <StatCard 
              title="Best Win Rate" 
              value={leagueStats.bestWinRate || 'N/A'}
              subtitle="Min. 3 games"
              color="purple"
            />
            <StatCard 
              title="Highest Victory Points" 
              value={leagueStats.highestVictoryPoints || 'N/A'}
              subtitle="Total VP accumulated"
              color="orange"
            />
            <StatCard 
              title="Highest Single Score" 
              value={leagueStats.highestScore}
              subtitle="Best individual performance"
              color="red"
            />
            <StatCard 
              title="League Average" 
              value={`${leagueStats.averageScore} pts`}
              subtitle="Average score per game"
              color="blue"
            />
          </div>

          {/* Detailed Records */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Performers
              </h3>
              <div className="space-y-3">
                {playerStats
                  .sort((a, b) => b.rankingPoints - a.rankingPoints)
                  .slice(0, 5)
                  .map((player, index) => (
                    <div key={player.documentId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {player.leagueName}
                        </span>
                      </div>
                      <span className="text-orange-600 dark:text-orange-400 font-medium">
                        {player.rankingPoints} LP
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Notable Achievements
              </h3>
              <div className="space-y-3">
                {playerStats
                  .filter(p => p.longestWinStreak > 0)
                  .sort((a, b) => b.longestWinStreak - a.longestWinStreak)
                  .slice(0, 5)
                  .map(player => (
                    <div key={player.documentId} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {player.leagueName}
                      </span>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        {player.longestWinStreak} win streak
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}