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

  if (format === 'single_elimination') {
    const maxRound = Math.max(0, ...matches.map((m: any) => m.round || 0));
    return (
      <div className="w-full">
        <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
            <span className="w-1 h-8 bg-orange-500 mr-3 rounded-full"></span>
            Playoff Bracket
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Single-elimination tournament bracket
          </p>
        </div>
        {matches.length > 0 ? (
          <TournamentBracket matches={matches} totalRounds={maxRound} />
        ) : (
          <div className="text-center py-12 text-gray-500">
            Bracket not yet generated.
          </div>
        )}
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
