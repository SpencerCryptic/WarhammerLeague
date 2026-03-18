'use client';

import React from 'react';

interface PlayerInfo {
  documentId?: string;
  leagueName: string;
  faction?: string;
}

interface Match {
  id?: string;
  documentId?: string;
  round: number;
  bracketPosition: number;
  leaguePlayer1?: PlayerInfo;
  leaguePlayer2?: PlayerInfo;
  leaguePlayer1Score?: number;
  leaguePlayer2Score?: number;
  matchResult?: 'player1_win' | 'player2_win' | 'draw' | 'unplayed';
  statusMatch?: 'upcoming' | 'planned' | 'played' | 'abandoned';
}

interface TournamentBracketProps {
  matches: Match[];
  totalRounds: number;
  bracketSize?: number;
  leaguePlayers?: PlayerInfo[]; // in seed order from generatePlayoffs
}

// Standard tournament bracket seeding order
function generateBracketOrder(n: number): number[] {
  if (n === 1) return [0];
  const half = generateBracketOrder(n / 2);
  return half.flatMap((seed) => [seed, n - 1 - seed]);
}

export default function TournamentBracket({ matches, totalRounds, bracketSize, leaguePlayers }: TournamentBracketProps) {
  const matchLookup: Record<string, Match> = {};
  matches.forEach(m => {
    matchLookup[`${m.round}-${m.bracketPosition}`] = m;
  });

  const hasRound0 = matches.some(m => m.round === 0);
  const round0Matches = matches.filter(m => m.round === 0);
  const effectiveBracketSize = bracketSize || Math.pow(2, totalRounds);

  // Build the seeded player list for QF placeholders
  // League players are in seed order. Play-in participants are the last ones.
  // Play-in losers are removed, winners stay.
  let seededPlayers: (PlayerInfo | null)[] = [];
  if (leaguePlayers && leaguePlayers.length > 0) {
    // Identify play-in participant documentIds
    const playInPlayerIds = new Set<string>();
    const playInLoserIds = new Set<string>();
    round0Matches.forEach(m => {
      if (m.leaguePlayer1?.documentId) playInPlayerIds.add(m.leaguePlayer1.documentId);
      if (m.leaguePlayer2?.documentId) playInPlayerIds.add(m.leaguePlayer2.documentId);
      // If resolved, identify loser
      if (m.matchResult === 'player1_win' && m.leaguePlayer2?.documentId) {
        playInLoserIds.add(m.leaguePlayer2.documentId);
      } else if (m.matchResult === 'player2_win' && m.leaguePlayer1?.documentId) {
        playInLoserIds.add(m.leaguePlayer1.documentId);
      }
    });

    // Bye players = not in play-ins
    const byePlayers = leaguePlayers.filter(
      lp => lp.documentId && !playInPlayerIds.has(lp.documentId)
    );

    // Play-in winners (resolved) or null placeholder (unresolved)
    const playInWinners: (PlayerInfo | null)[] = [];
    round0Matches.forEach(m => {
      if (m.matchResult === 'player1_win') {
        playInWinners.push(m.leaguePlayer1 || null);
      } else if (m.matchResult === 'player2_win') {
        playInWinners.push(m.leaguePlayer2 || null);
      } else {
        playInWinners.push(null); // unresolved
      }
    });

    // Seeded order: bye players first (already in seed order), then play-in winners
    seededPlayers = [...byePlayers, ...playInWinners];
  }

  // Build round info
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

  // Pre-compute QF placeholder matches using seeded bracket order
  const bracketOrder = generateBracketOrder(effectiveBracketSize);
  const qfPlaceholders: Match[] = [];
  if (seededPlayers.length > 0) {
    const qfCount = effectiveBracketSize / 2;
    for (let i = 0; i < qfCount; i++) {
      const p1Idx = bracketOrder[i * 2];
      const p2Idx = bracketOrder[i * 2 + 1];
      const p1 = seededPlayers[p1Idx] || undefined;
      const p2 = seededPlayers[p2Idx] || undefined;
      qfPlaceholders.push({
        round: 1,
        bracketPosition: i + 1,
        leaguePlayer1: p1 ? { leagueName: p1.leagueName, faction: p1.faction } : undefined,
        leaguePlayer2: p2 ? { leagueName: p2.leagueName, faction: p2.faction } : undefined,
        matchResult: 'unplayed',
        statusMatch: 'upcoming',
      });
    }
  }

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
            const isPlayIn = round === 0;
            const roundFromFirst = isPlayIn ? 0 : round - 1;
            const multiplier = Math.pow(2, roundFromFirst);
            const slotHeight = CARD_H + BASE_GAP;
            const gap = slotHeight * multiplier - CARD_H;
            const topPad = isPlayIn ? 0 : (slotHeight * (multiplier - 1)) / 2;

            // Build match slots for this round
            const slots: Match[] = [];
            for (let pos = 1; pos <= matchCount; pos++) {
              const actual = matchLookup[`${round}-${pos}`];
              if (actual) {
                slots.push(actual);
              } else if (round === 1 && qfPlaceholders[pos - 1]) {
                // Use seeded QF placeholder
                slots.push(qfPlaceholders[pos - 1]);
              } else {
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
                <div className="flex flex-col" style={{ width: `${colWidth}px`, gap: `${gap}px` }}>
                  {slots.map((match, i) => (
                    <MatchCard key={`${round}-${i}`} match={match} />
                  ))}
                </div>
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
      <div
        className="flex items-center justify-between px-3 h-[39px] border-b"
        style={{
          borderColor: 'rgba(75, 85, 99, 0.25)',
          backgroundColor: p1Win ? 'rgba(5, 150, 105, 0.15)' : 'transparent',
        }}
      >
        <span className={`text-sm truncate ${
          !p1Name ? 'text-gray-600 italic' :
          p1Win ? 'text-white font-bold' :
          isPlayed && !p1Win ? 'text-gray-500' : 'text-gray-200'
        }`}>
          {p1Name || 'TBD'}
        </span>
        {isPlayed && match.leaguePlayer1Score != null && (
          <span className={`text-sm font-mono ml-2 ${p1Win ? 'text-white font-bold' : 'text-gray-500'}`}>
            {match.leaguePlayer1Score}
          </span>
        )}
      </div>
      <div
        className="flex items-center justify-between px-3 h-[39px]"
        style={{ backgroundColor: p2Win ? 'rgba(5, 150, 105, 0.15)' : 'transparent' }}
      >
        <span className={`text-sm truncate ${
          !p2Name ? 'text-gray-600 italic' :
          p2Win ? 'text-white font-bold' :
          isPlayed && !p2Win ? 'text-gray-500' : 'text-gray-200'
        }`}>
          {p2Name || 'TBD'}
        </span>
        {isPlayed && match.leaguePlayer2Score != null && (
          <span className={`text-sm font-mono ml-2 ${p2Win ? 'text-white font-bold' : 'text-gray-500'}`}>
            {match.leaguePlayer2Score}
          </span>
        )}
      </div>
    </div>
  );
}

function Connectors({
  matchCount, cardHeight, gap, width, isPlayIn,
}: {
  matchCount: number; cardHeight: number; gap: number; width: number; isPlayIn: boolean;
}) {
  if (isPlayIn) {
    const midY = cardHeight / 2;
    return (
      <div style={{ width: `${width}px` }}>
        <svg width={width} height={cardHeight}>
          <line x1={0} y1={midY} x2={width} y2={midY} stroke="rgba(168, 85, 247, 0.3)" strokeWidth={2} />
        </svg>
      </div>
    );
  }

  const pairCount = Math.ceil(matchCount / 2);
  const slotH = cardHeight + gap;
  const pairH = slotH * 2;
  const stroke = 'rgba(168, 85, 247, 0.3)';

  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: `${width}px` }}>
      {Array.from({ length: pairCount }).map((_, i) => {
        const y1 = cardHeight / 2;
        const y2 = slotH + cardHeight / 2;
        const mid = (y1 + y2) / 2;
        return (
          <svg key={i} width={width} height={pairH} className="flex-shrink-0">
            <line x1={0} y1={y1} x2={width / 2} y2={y1} stroke={stroke} strokeWidth={2} />
            <line x1={width / 2} y1={y1} x2={width / 2} y2={mid} stroke={stroke} strokeWidth={2} />
            <line x1={0} y1={y2} x2={width / 2} y2={y2} stroke={stroke} strokeWidth={2} />
            <line x1={width / 2} y1={y2} x2={width / 2} y2={mid} stroke={stroke} strokeWidth={2} />
            <line x1={width / 2} y1={mid} x2={width} y2={mid} stroke={stroke} strokeWidth={2} />
          </svg>
        );
      })}
    </div>
  );
}
