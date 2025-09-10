'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import LeagueStats from '@/components/LeagueStats';
import { LeaguePlayer } from '@/components/TableRow';
import { Match } from '@/components/MatchesDashboard';

export default function StatsPage() {
  const [leaguePlayers, setLeaguePlayers] = useState<LeaguePlayer[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const pathname = usePathname();
  const documentId = pathname.split('/')[2];

  useEffect(() => {
    const fetchLeagueData = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leagues/${documentId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch league data');
        }

        const data = await response.json();
        
        setMatches(data.data.matches || []);
        
        const players = data.data.league_players || [];
        const sortedPlayers = players.sort((a: LeaguePlayer, b: LeaguePlayer) => {
          if (b.rankingPoints - a.rankingPoints !== 0) {
            return b.rankingPoints - a.rankingPoints;
          }
          
          // Tiebreaker by victory points
          let aVictoryPoints = 0;
          let bVictoryPoints = 0;
          
          data.data.matches.forEach((match: Match) => {
            if (match.leaguePlayer1.documentId === a.documentId) {
              aVictoryPoints += match.leaguePlayer1Score;
            } else if (match.leaguePlayer2.documentId === a.documentId) {
              aVictoryPoints += match.leaguePlayer2Score;
            }
            
            if (match.leaguePlayer1.documentId === b.documentId) {
              bVictoryPoints += match.leaguePlayer1Score;
            } else if (match.leaguePlayer2.documentId === b.documentId) {
              bVictoryPoints += match.leaguePlayer2Score;
            }
          });
          
          return bVictoryPoints - aVictoryPoints;
        });
        
        setLeaguePlayers(sortedPlayers);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching league data:', error);
        setError('Failed to load league statistics');
        setIsLoading(false);
      }
    };

    if (documentId) {
      fetchLeagueData();
    }
  }, [documentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white text-xl">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    );
  }

  if (leaguePlayers.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-8">
        <h3 className="text-2xl font-bold mb-3 text-gray-800 dark:text-gray-200">No Data Available</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Statistics will appear once players join the league and matches are played.
        </p>
      </div>
    );
  }

  return (
    <LeagueStats 
      leagueId={documentId}
      players={leaguePlayers}
      matches={matches}
    />
  );
}