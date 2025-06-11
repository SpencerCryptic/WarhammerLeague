import Link from 'next/link';
import React from 'react'

function timeUntil(startDate: Date) {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();

  if (diffMs <= 0) return "League is live";

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diffMs / (1000 * 60)) % 60);

  return `${days}d ${hours}h ${mins}m until start`;
}

const fetchLeagues = async () => {
  const response = await fetch('http://localhost:1337/api/leagues');
  return await response.json();
}

const Leagues = async () => {
  const leagues = await fetchLeagues();
  return (
    <div>
      <h1 className='mb-20 text-6xl'>
        Leagues
      </h1>
      <div className="grid grid-cols-1 grid-rows-1 md:grid-cols-3">
        {
          leagues.data.map((league: any) => (          
            <div key={league.documentId}>
              <Link href={`/leagues/${encodeURIComponent(league.documentId)}`} className="block max-w-sm m-4 p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">                   
                <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{ league.name }</h5>
                <p className="font-normal text-gray-700 dark:text-gray-400">Player Count: <strong>{league.league_players.length}</strong></p>
                <p className="font-normal text-gray-700 dark:text-gray-400">League Starts: <strong>{new Date(league?.startDate).toLocaleDateString()}</strong></p>
                <p className="font-normal text-gray-700 dark:text-gray-400">Status: <strong>{league.statusleague}</strong></p>
              </Link>
            </div>
          ))
        }
      </div>
    </div>
    
  )
}

export default Leagues