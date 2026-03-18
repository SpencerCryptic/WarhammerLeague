'use client';

import MatchesDashboard from '@/components/MatchesDashboard'
import TournamentBracket from '@/components/TournamentBracket'
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const API_BASE = 'https://accessible-positivity-e213bb2958.strapiapp.com/api';

const Matches = () => {
  const params = useParams();
  const documentId = params.leagueDocumentId as string;
  const [format, setFormat] = useState<string | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documentId) return;
    fetch(`${API_BASE}/leagues/${documentId}?populate[matches][populate]=*`)
      .then(res => res.json())
      .then(data => {
        setFormat(data.data?.format || 'round_robin');
        setMatches(data.data?.matches || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [documentId]);

  if (loading) {
    return <div className="text-white text-center py-12">Loading...</div>;
  }

  if (format === 'single_elimination' && matches.length > 0) {
    const maxRound = Math.max(...matches.map((m: any) => m.round || 0));
    return (
      <div className="w-full">
        <TournamentBracket matches={matches} totalRounds={maxRound} />
      </div>
    );
  }

  return (
    <div>
      <MatchesDashboard />
    </div>
  );
}

export default Matches
