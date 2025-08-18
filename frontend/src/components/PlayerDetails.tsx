"use client";
import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation';

const [league, setLeague] = useState<any>(null)

const getLeague = (documentId: string) => {
  useEffect(() => {
    fetch(`http://localhost:1337/api/leagues/${documentId}`)
    .then((res) => res.json())
    .then((data) => {
      setLeague(data.data);
    });
  })

}

const PlayerDetailsComponent = () => {
  console.log('here')
  const user =  localStorage.getItem('user');
  const pathName: string[] = usePathname().split('/');
  const leagueDocumentId = pathName[2];
  getLeague(leagueDocumentId);
  const leaguePlayer = league.data.league_players.find((lp: any) => {
    return user ? lp.player.email === JSON.parse(user).email : null
  });
  console.log(leaguePlayer)
  return (
    <div>
        <p>lol</p>
       <textarea className="block whitespace-pre-wrap p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-900 dark:border-gray-700">
          { leaguePlayer ? leaguePlayer.playList : '' }
        </textarea>
    </div>
  )
}

export default PlayerDetailsComponent