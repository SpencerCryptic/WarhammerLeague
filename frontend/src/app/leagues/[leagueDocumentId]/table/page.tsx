'use client';

import TableRow from '@/components/TableRow'
import TournamentBracket from '@/components/TournamentBracket'
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const API_BASE = 'https://accessible-positivity-e213bb2958.strapiapp.com/api';

const Table = () => {
  const params = useParams();
  const documentId = params.leagueDocumentId as string;
  const [format, setFormat] = useState<string | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documentId) return;
    fetch(`${API_BASE}/leagues/${documentId}?populate[matches][populate]=*&populate[league_players]=*`)
      .then(res => res.json())
      .then(data => {
        setFormat(data.data?.format || 'round_robin');
        setMatches(data.data?.matches || []);
        const activePlayers = (data.data?.league_players || []).filter((p: any) => p.status !== 'dropped');
        setPlayerCount(activePlayers.length);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [documentId]);

  if (loading) {
    return <div className="text-white text-center py-12">Loading...</div>;
  }

  if (format === 'single_elimination') {
    // Calculate bracket size from player count
    const playInMatches = matches.filter((m: any) => m.round === 0);
    const bracketSize = Math.pow(2, Math.floor(Math.log2(Math.max(playerCount, 2))));
    const totalRounds = Math.log2(bracketSize);

    return (
      <div className="w-full">
        <TournamentBracket
          matches={matches}
          totalRounds={totalRounds}
          bracketSize={bracketSize}
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      <TableRow />
    </div>
  );
}

export default Table
