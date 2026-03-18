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
  leaguePlayer1Score?: number;
  leaguePlayer2Score?: number;
  matchResult: 'player1_win' | 'player2_win' | 'draw' | 'unplayed';
  statusMatch: 'upcoming' | 'planned' | 'played' | 'abandoned';
}

interface TournamentBracketProps {
  matches: Match[];
  totalRounds: number;
}

export default function TournamentBracket({ matches, totalRounds }: TournamentBracketProps) {
  const matchesByRound: Record<number, Match[]> = {};
  matches.forEach(match => {
    if (!matchesByRound[match.round]) matchesByRound[match.round] = [];
    matchesByRound[match.round].push(match);
  });
  Object.values(matchesByRound).forEach(arr =>
    arr.sort((a, b) => a.bracketPosition - b.bracketPosition)
  );

  const hasRound0 = matches.some(m => m.round === 0);
  const startRound = hasRound0 ? 0 : 1;
  const rounds = Array.from({ length: totalRounds - startRound + 1 }, (_, i) => i + startRound);

  const getRoundName = (round: number) => {
    if (round === 0) return 'Play-In';
    if (round === totalRounds) return 'Final';
    if (round === totalRounds - 1) return 'Semifinals';
    if (round === totalRounds - 2) return 'Quarterfinals';
    return `Round ${round}`;
  };

  // Match card height + gap determines connector geometry
  const MATCH_HEIGHT = 88; // px per match card
  const BASE_GAP = 16; // px gap at round 1

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No bracket matches generated yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-fit p-4 md:p-8">
        {/* Round headers */}
        <div className="flex mb-2" style={{ gap: '48px' }}>
          {rounds.map(round => (
            <div
              key={`header-${round}`}
              className="text-center text-sm font-bold uppercase tracking-wider"
              style={{ width: '220px', color: '#FF7F2A' }}
            >
              {getRoundName(round)}
            </div>
          ))}
        </div>

        {/* Bracket body */}
        <div className="flex items-start" style={{ gap: 0 }}>
          {rounds.map((round, roundIdx) => {
            const roundMatches = matchesByRound[round] || [];
            // Each subsequent round doubles the spacing
            const roundMultiplier = round === 0 ? 1 : Math.pow(2, round - startRound);
            const matchGap = BASE_GAP + (MATCH_HEIGHT + BASE_GAP) * (roundMultiplier - 1);
            // Offset for centering relative to previous round
            const topOffset = round <= startRound ? 0 : (MATCH_HEIGHT + BASE_GAP) * (Math.pow(2, round - startRound - 1) - 0.5) + BASE_GAP / 2;

            return (
              <div key={round} className="flex items-start" style={{ marginTop: `${topOffset}px` }}>
                {/* Match column */}
                <div className="flex flex-col" style={{ width: '220px', gap: `${matchGap}px` }}>
                  {roundMatches.map(match => (
                    <MatchCard key={match.documentId} match={match} />
                  ))}
                </div>

                {/* Connector lines (not after last round) */}
                {roundIdx < rounds.length - 1 && roundMatches.length > 0 && (
                  <ConnectorLines
                    matchCount={roundMatches.length}
                    matchHeight={MATCH_HEIGHT}
                    gap={matchGap}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const isPlayed = match.statusMatch === 'played';
  const p1Win = match.matchResult === 'player1_win';
  const p2Win = match.matchResult === 'player2_win';
  const p1Name = match.leaguePlayer1?.leagueName || 'TBD';
  const p2Name = match.leaguePlayer2?.leagueName || 'TBD';
  const hasBothPlayers = match.leaguePlayer1 && match.leaguePlayer2;

  return (
    <div
      className="rounded-lg overflow-hidden border"
      style={{
        width: '220px',
        height: '88px',
        backgroundColor: '#1E2330',
        borderColor: isPlayed ? '#059669' : hasBothPlayers ? 'rgba(168, 85, 247, 0.3)' : 'rgba(75, 85, 99, 0.4)',
      }}
    >
      {/* Player 1 */}
      <div
        className="flex items-center justify-between px-3 h-[43px] border-b"
        style={{
          borderColor: 'rgba(75, 85, 99, 0.3)',
          backgroundColor: p1Win ? 'rgba(5, 150, 105, 0.15)' : 'transparent',
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isPlayed && (
            <span className={`text-xs ${p1Win ? 'text-green-400' : 'text-gray-600'}`}>
              {p1Win ? 'W' : 'L'}
            </span>
          )}
          <span
            className={`text-sm truncate ${
              !match.leaguePlayer1 ? 'text-gray-500 italic' :
              p1Win ? 'text-white font-bold' :
              isPlayed && !p1Win ? 'text-gray-500' : 'text-gray-200'
            }`}
          >
            {p1Name}
          </span>
        </div>
        {isPlayed && match.leaguePlayer1Score !== undefined && (
          <span className={`text-sm font-mono ml-2 ${p1Win ? 'text-white font-bold' : 'text-gray-500'}`}>
            {match.leaguePlayer1Score}
          </span>
        )}
      </div>

      {/* Player 2 */}
      <div
        className="flex items-center justify-between px-3 h-[43px]"
        style={{
          backgroundColor: p2Win ? 'rgba(5, 150, 105, 0.15)' : 'transparent',
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isPlayed && (
            <span className={`text-xs ${p2Win ? 'text-green-400' : 'text-gray-600'}`}>
              {p2Win ? 'W' : 'L'}
            </span>
          )}
          <span
            className={`text-sm truncate ${
              !match.leaguePlayer2 ? 'text-gray-500 italic' :
              p2Win ? 'text-white font-bold' :
              isPlayed && !p2Win ? 'text-gray-500' : 'text-gray-200'
            }`}
          >
            {p2Name}
          </span>
        </div>
        {isPlayed && match.leaguePlayer2Score !== undefined && (
          <span className={`text-sm font-mono ml-2 ${p2Win ? 'text-white font-bold' : 'text-gray-500'}`}>
            {match.leaguePlayer2Score}
          </span>
        )}
      </div>
    </div>
  );
}

function ConnectorLines({ matchCount, matchHeight, gap }: { matchCount: number; matchHeight: number; gap: number }) {
  const pairCount = Math.ceil(matchCount / 2);
  const pairHeight = matchHeight * 2 + gap; // height of a pair of matches
  const connectorWidth = 48;
  const midMatch = matchHeight / 2; // vertical center of a match card

  return (
    <div className="flex flex-col" style={{ width: `${connectorWidth}px`, gap: `${gap}px` }}>
      {Array.from({ length: pairCount }).map((_, i) => {
        const top1 = midMatch; // center of first match in pair
        const top2 = matchHeight + gap + midMatch; // center of second match in pair
        const midY = (top1 + top2) / 2; // midpoint where lines merge

        return (
          <svg
            key={i}
            width={connectorWidth}
            height={pairHeight}
            className="flex-shrink-0"
          >
            {/* Horizontal line from match 1 */}
            <line x1={0} y1={top1} x2={connectorWidth / 2} y2={top1} stroke="rgba(168, 85, 247, 0.3)" strokeWidth={2} />
            {/* Vertical line down from match 1 to midpoint */}
            <line x1={connectorWidth / 2} y1={top1} x2={connectorWidth / 2} y2={midY} stroke="rgba(168, 85, 247, 0.3)" strokeWidth={2} />
            {/* Horizontal line from match 2 */}
            <line x1={0} y1={top2} x2={connectorWidth / 2} y2={top2} stroke="rgba(168, 85, 247, 0.3)" strokeWidth={2} />
            {/* Vertical line up from match 2 to midpoint */}
            <line x1={connectorWidth / 2} y1={top2} x2={connectorWidth / 2} y2={midY} stroke="rgba(168, 85, 247, 0.3)" strokeWidth={2} />
            {/* Horizontal line from midpoint to next round */}
            <line x1={connectorWidth / 2} y1={midY} x2={connectorWidth} y2={midY} stroke="rgba(168, 85, 247, 0.3)" strokeWidth={2} />
          </svg>
        );
      })}
    </div>
  );
}
