import Link from 'next/link';
import React from 'react';
import qs from 'qs';

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

const fetchLeagues = async (gameSystem?: string) => {
  const query = qs.stringify({
    filters: {
      gameSystem: {
        $eq: gameSystem,
      },
    },
  }, { encodeValuesOnly: true });

  const url = `http://localhost:1337/api/leagues${gameSystem ? `?${query}` : ''}`;
  console.log('Fetching:', url); // optional

  const res = await fetch(url);
  return await res.json();
};


export default async function Leagues({ searchParams }: { searchParams?: { gameSystem?: string } }) {
  const gameSystem = searchParams?.gameSystem || '';
  const leagues = await fetchLeagues(gameSystem);

  return (
    <div>
      <div className='flex items-center mb-10'>
        <h1 className='text-6xl'>Leagues</h1>
        <div className="ml-auto">
        <form method="GET" action="/leagues" className="ml-auto flex items-center gap-2">
  <select
    name="gameSystem"
    className="px-4 py-2 rounded bg-orange-600 text-white"
    defaultValue={gameSystem}
  >
    <option value="">All Games</option>
    <option value="Warhammer: 40,000">Warhammer: 40,000</option>
    <option value="Warhammer: Age of Sigmar">Warhammer: Age of Sigmar</option>
    <option value="Warhammer: Kill Team">Warhammer: Kill Team</option>
    <option value="Warhammer: Warcry">Warhammer: Warcry</option>
    <option value="Warhammer: Necromunda">Warhammer: Necromunda</option>
    <option value="A Song of Ice and Fire">A Song of Ice and Fire</option>
    <option value="Middle Earth SBG">Middle Earth SBG</option>
    <option value="Marvel Crisis Protocol">Marvel Crisis Protocol</option>
    <option value="Conquest">Conquest</option>
  </select>
  <button
    type="submit"
    className="px-3 py-2 rounded bg-orange-700 text-white"
  >
    Filter
  </button>
</form>

</div>

      </div>

      <div className="grid grid-cols-1 grid-rows-1 md:grid-cols-3">
        {leagues.data.map((league: any) => (
          <div key={league.documentId}>
            <Link
              href={`/leagues/${encodeURIComponent(league.documentId)}`}
              className="block max-w-sm m-4 p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{league.name}</h5>
              <p className="font-normal text-gray-700 dark:text-gray-400">
                Game: <strong>{league.gameSystem}</strong>
              </p>
              <p className="font-normal text-gray-700 dark:text-gray-400">
                Player Count: <strong>{league.league_players.length}</strong>
              </p>
              <p className="font-normal text-gray-700 dark:text-gray-400">
                League Starts: <strong>{new Date(league.startDate).toLocaleDateString()}</strong>
              </p>
              <p className="font-normal text-gray-700 dark:text-gray-400">
                Status: <strong>{league.statusleague}</strong>
              </p>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
