'use client';

import React from 'react';

interface Match {
  id?: string;
  documentId?: string;
  round: number;
  bracketPosition: number;
  leaguePlayer1?: {
    leagueName: string;
    faction?: string;
  };
  leaguePlayer2?: {
    leagueName: string;
    faction?: string;
  };
  leaguePlayer1Score?: number;
  leaguePlayer2Score?: number;
  matchResult?: 'player1_win' | 'player2_win' | 'draw' | 'unplayed';
  statusMatch?: 'upcoming' | 'planned' | 'played' | 'abandoned';
}

interface TournamentBracketProps {
  matches: Match[];
  totalRounds: number;
  bracketSize?: number; // e.g. 8 for an 8-player bracket
}

export default function TournamentBracket({ matches, totalRounds, bracketSize }: TournamentBracketProps) {
  // Build a lookup of actual matches by round+position
  const matchLookup: Record<string, Match> = {};
  matches.forEach(m => {
    matchLookup[`${m.round}-${m.bracketPosition}`] = m;
  });

  const hasRound0 = matches.some(m => m.round === 0);
  const round0Matches = matches.filter(m => m.round === 0);

  // Build the full bracket skeleton
  // For each round from 1 to totalRounds, we know exactly how many matches there should be
  const effectiveBracketSize = bracketSize || Math.pow(2, totalRounds);
  const rounds: { round: number; name: string; matchCount: number }[] = [];

  if (hasRound0) {
    rounds.push({ round: 0, name: 'Play-In', matchCount: round0Matches.length || 1 });
  }

  for (let r = 1; r <= totalRounds; r++) {
    const count = effectiveBracketSize / Math.pow(2, r);
    let name: string;
    if (r === totalRounds) name = 'Final';
    else if (r === totalRounds - 1) name = 'Semifinals';
    else if (r === totalRounds - 2) name = 'Quarterfinals';
    else name = `Round ${r}`;
    rounds.push({ round: r, name, matchCount: count });
  }

  // Match card dimensions
  const CARD_H = 80;
  const BASE_GAP = 12;

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-fit p-4 md:p-8">
        {/* Round headers */}
        <div className="flex" style={{ gap: '0px' }}>
          {rounds.map(({ round, name }) => (
            <div key={`h-${round}`} className="flex-shrink-0" style={{ width: round === 0 ? '240px' : '280px' }}>
              <div
                className="text-center text-sm font-bold uppercase tracking-wider mb-3 pb-2 border-b"
                style={{ color: '#FF7F2A', borderColor: 'rgba(168, 85, 247, 0.2)' }}
              >
                {name}
              </div>
            </div>
          ))}
        </div>

        {/* Bracket body */}
        <div className="flex" style={{ gap: '0px' }}>
          {rounds.map(({ round, matchCount }, roundIdx) => {
            // Calculate spacing
            const isPlayIn = round === 0;
            const roundFromFirst = isPlayIn ? 0 : round - 1;
            const multiplier = Math.pow(2, roundFromFirst);
            const slotHeight = CARD_H + BASE_GAP;
            const gap = slotHeight * multiplier - CARD_H;
            const topPad = isPlayIn ? 0 : (slotHeight * (multiplier - 1)) / 2;

            // Build match slots
            const slots: Match[] = [];
            for (let pos = 1; pos <= matchCount; pos++) {
              const actual = matchLookup[`${round}-${pos}`];
              if (actual) {
                slots.push(actual);
              } else {
                // Placeholder
                slots.push({
                  round,
                  bracketPosition: pos,
                  matchResult: 'unplayed',
                  statusMatch: 'upcoming',
                });
              }
            }

            const isLastRound = roundIdx === rounds.length - 1;
            const colWidth = isPlayIn ? 200 : 220;
            const connectorW = isPlayIn ? 40 : 60;

            return (
              <div key={round} className="flex flex-shrink-0" style={{ paddingTop: `${topPad}px` }}>
                {/* Match cards column */}
                <div className="flex flex-col" style={{ width: `${colWidth}px`, gap: `${gap}px` }}>
                  {slots.map((match, i) => (
                    <MatchCard key={`${round}-${i}`} match={match} />
                  ))}
                </div>

                {/* Connector lines */}
                {!isLastRound && slots.length > 0 && (
                  <Connectors
                    matchCount={slots.length}
                    cardHeight={CARD_H}
                    gap={gap}
                    width={connectorW}
                    isPlayIn={isPlayIn}
                  />
                )}
              </div>
            );
          })}
        </div>

        {matches.length === 0 && !bracketSize && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No bracket matches generated yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const isPlayed = match.statusMatch === 'played';
  const p1Win = match.matchResult === 'player1_win';
  const p2Win = match.matchResult === 'player2_win';
  const p1Name = match.leaguePlayer1?.leagueName;
  const p2Name = match.leaguePlayer2?.leagueName;
  const isEmpty = !p1Name && !p2Name;

  return (
    <div
      className="rounded overflow-hidden border flex-shrink-0"
      style={{
        height: '80px',
        backgroundColor: isEmpty ? 'rgba(30, 35, 48, 0.4)' : '#1E2330',
        borderColor: isPlayed
          ? '#059669'
          : isEmpty
          ? 'rgba(75, 85, 99, 0.2)'
          : 'rgba(168, 85, 247, 0.25)',
      }}
    >
      {/* Player 1 */}
      <div
        className="flex items-center justify-between px-3 h-[39px] border-b"
        style={{
          borderColor: 'rgba(75, 85, 99, 0.25)',
          backgroundColor: p1Win ? 'rgba(5, 150, 105, 0.15)' : 'transparent',
        }}
      >
        <span
          className={`text-sm truncate ${
            !p1Name ? 'text-gray-600 italic' :
            p1Win ? 'text-white font-bold' :
            isPlayed && !p1Win ? 'text-gray-500' : 'text-gray-200'
          }`}
        >
          {p1Name || 'TBD'}
        </span>
        {isPlayed && match.leaguePlayer1Score !== undefined && match.leaguePlayer1Score !== null && (
          <span className={`text-sm font-mono ml-2 ${p1Win ? 'text-white font-bold' : 'text-gray-500'}`}>
            {match.leaguePlayer1Score}
          </span>
        )}
      </div>

      {/* Player 2 */}
      <div
        className="flex items-center justify-between px-3 h-[39px]"
        style={{
          backgroundColor: p2Win ? 'rgba(5, 150, 105, 0.15)' : 'transparent',
        }}
      >
        <span
          className={`text-sm truncate ${
            !p2Name ? 'text-gray-600 italic' :
            p2Win ? 'text-white font-bold' :
            isPlayed && !p2Win ? 'text-gray-500' : 'text-gray-200'
          }`}
        >
          {p2Name || 'TBD'}
        </span>
        {isPlayed && match.leaguePlayer2Score !== undefined && match.leaguePlayer2Score !== null && (
          <span className={`text-sm font-mono ml-2 ${p2Win ? 'text-white font-bold' : 'text-gray-500'}`}>
            {match.leaguePlayer2Score}
          </span>
        )}
      </div>
    </div>
  );
}

function Connectors({
  matchCount,
  cardHeight,
  gap,
  width,
  isPlayIn,
}: {
  matchCount: number;
  cardHeight: number;
  gap: number;
  width: number;
  isPlayIn: boolean;
}) {
  if (isPlayIn) {
    // Play-in just draws a single horizontal line from the match center to the right
    const midY = cardHeight / 2;
    return (
      <div style={{ width: `${width}px` }}>
        <svg width={width} height={cardHeight}>
          <line x1={0} y1={midY} x2={width} y2={midY} stroke="rgba(168, 85, 247, 0.3)" strokeWidth={2} />
        </svg>
      </div>
    );
  }

  // Standard bracket: pair up matches, draw lines merging into one
  const pairCount = Math.ceil(matchCount / 2);
  const slotH = cardHeight + gap;
  const pairH = slotH * 2;
  const stroke = 'rgba(168, 85, 247, 0.3)';

  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: `${width}px` }}>
      {Array.from({ length: pairCount }).map((_, i) => {
        const y1 = cardHeight / 2; // center of top match
        const y2 = slotH + cardHeight / 2; // center of bottom match
        const mid = (y1 + y2) / 2;

        return (
          <svg key={i} width={width} height={pairH} className="flex-shrink-0">
            {/* Top match → right */}
            <line x1={0} y1={y1} x2={width / 2} y2={y1} stroke={stroke} strokeWidth={2} />
            {/* Top → mid vertical */}
            <line x1={width / 2} y1={y1} x2={width / 2} y2={mid} stroke={stroke} strokeWidth={2} />
            {/* Bottom match → right */}
            <line x1={0} y1={y2} x2={width / 2} y2={y2} stroke={stroke} strokeWidth={2} />
            {/* Bottom → mid vertical */}
            <line x1={width / 2} y1={y2} x2={width / 2} y2={mid} stroke={stroke} strokeWidth={2} />
            {/* Mid → next round */}
            <line x1={width / 2} y1={mid} x2={width} y2={mid} stroke={stroke} strokeWidth={2} />
          </svg>
        );
      })}
    </div>
  );
}
