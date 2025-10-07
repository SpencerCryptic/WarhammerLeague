'use client';

import React from 'react';

interface Match {
  id: string;
  documentId: string;
  round: number;
  bracketPosition: number;
  leaguePlayer1?: {
    leagueName: string;
    faction: string;
  };
  leaguePlayer2?: {
    leagueName: string;
    faction: string;
  };
  matchResult: 'player1_win' | 'player2_win' | 'draw' | 'unplayed';
  statusMatch: 'upcoming' | 'planned' | 'played' | 'abandoned';
}

interface TournamentBracketProps {
  matches: Match[];
  totalRounds: number;
}

export default function TournamentBracket({ matches, totalRounds }: TournamentBracketProps) {
  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  // Sort matches within each round by bracket position
  Object.keys(matchesByRound).forEach(round => {
    matchesByRound[parseInt(round)].sort((a, b) => a.bracketPosition - b.bracketPosition);
  });

  const getMatchWinner = (match: Match) => {
    if (match.matchResult === 'player1_win') return match.leaguePlayer1?.leagueName;
    if (match.matchResult === 'player2_win') return match.leaguePlayer2?.leagueName;
    return null;
  };

  const getMatchDisplayText = (match: Match) => {
    if (match.statusMatch === 'planned') return 'TBD';
    if (!match.leaguePlayer1 && !match.leaguePlayer2) return 'TBD';
    if (!match.leaguePlayer1) return match.leaguePlayer2?.leagueName || 'TBD';
    if (!match.leaguePlayer2) return match.leaguePlayer1?.leagueName || 'TBD';
    return null;
  };

  const getRoundName = (round: number) => {
    if (round === totalRounds) return 'Finals';
    if (round === totalRounds - 1) return 'Semifinals';
    if (round === totalRounds - 2) return 'Quarterfinals';
    if (round === 1) return 'Round 1';
    return `Round ${round}`;
  };

  return (
    <div className="w-full overflow-x-auto bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="min-w-fit">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Tournament Bracket
        </h2>
        
        <div className="flex space-x-8">
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map(round => (
            <div key={round} className="flex flex-col">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">
                {getRoundName(round)}
              </h3>
              
              <div className="space-y-4">
                {matchesByRound[round]?.map(match => {
                  const winner = getMatchWinner(match);
                  const displayText = getMatchDisplayText(match);
                  
                  return (
                    <div
                      key={match.documentId}
                      className={`min-w-48 p-4 rounded-lg border-2 ${
                        match.statusMatch === 'played'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : match.statusMatch === 'upcoming'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 bg-gray-50 dark:bg-gray-700 dark:border-gray-600'
                      }`}
                    >
                      {displayText ? (
                        <div className="text-center font-medium text-gray-700 dark:text-gray-300">
                          {displayText}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className={`p-2 rounded text-sm ${
                            winner === match.leaguePlayer1?.leagueName
                              ? 'bg-green-200 dark:bg-green-800 font-bold'
                              : 'bg-gray-100 dark:bg-gray-600'
                          }`}>
                            {match.leaguePlayer1?.leagueName || 'TBD'}
                          </div>
                          
                          <div className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                            VS
                          </div>
                          
                          <div className={`p-2 rounded text-sm ${
                            winner === match.leaguePlayer2?.leagueName
                              ? 'bg-green-200 dark:bg-green-800 font-bold'
                              : 'bg-gray-100 dark:bg-gray-600'
                          }`}>
                            {match.leaguePlayer2?.leagueName || 'TBD'}
                          </div>
                        </div>
                      )}
                      
                      {match.statusMatch === 'played' && winner && (
                        <div className="mt-2 text-center text-xs font-bold text-green-600 dark:text-green-400">
                          Winner: {winner}
                        </div>
                      )}
                      
                      <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {match.statusMatch}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {matches.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-lg">No bracket matches generated yet.</p>
            <p className="text-sm mt-2">Start the tournament to generate the bracket.</p>
          </div>
        )}
      </div>
    </div>
  );
}