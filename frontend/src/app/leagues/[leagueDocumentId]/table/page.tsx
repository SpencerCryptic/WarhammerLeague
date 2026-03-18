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
  const [leaguePlayers, setLeaguePlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documentId) return;
    fetch(`${API_BASE}/leagues/${documentId}?populate[matches][populate]=*&populate[league_players]=*`)
      .then(res => res.json())
      .then(data => {
        setFormat(data.data?.format || 'round_robin');
        setMatches(data.data?.matches || []);
        const players = (data.data?.league_players || []).filter((p: any) => p.status !== 'dropped');
        setLeaguePlayers(players);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [documentId]);

  if (loading) {
    return <div className="text-white text-center py-12">Loading...</div>;
  }

  if (format === 'single_elimination') {
    const playerCount = leaguePlayers.length;
    const bs = Math.pow(2, Math.floor(Math.log2(Math.max(playerCount, 2))));
    const tr = Math.log2(bs);

    return (
      <div className="w-full">
        <TournamentBracket
          matches={matches}
          totalRounds={tr}
          bracketSize={bs}
          leaguePlayers={leaguePlayers}
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
