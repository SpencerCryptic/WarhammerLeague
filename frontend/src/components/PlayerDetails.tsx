"use client";
import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation';

const PlayerDetailsComponent = () => {

  const [leaguePlayer, setLeaguePlayer] = useState<any>(null)
  const getLeague = (documentId: string) => {
    useEffect(() => {
      fetch(`http://localhost:1337/api/leagues/${documentId}`)
      .then((res) => res.json())
      .then((data) => {
        const currentLeaguePlayer = data.data.league_players.find((lp: any) => {
          return user ? lp.player.email === JSON.parse(user).email : null
        });
        setLeaguePlayer(currentLeaguePlayer)
      });
    }, [])
  }

  const user =  localStorage.getItem('user');
  const pathName: string[] = usePathname().split('/');
  const leagueDocumentId = pathName[2];
  getLeague(leagueDocumentId);
  return (
    <div>
       <textarea defaultValue={ leaguePlayer ? leaguePlayer.playList : '' } className="block whitespace-pre-wrap p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-900 dark:border-gray-700"></textarea>
    </div>
  )
}

export default PlayerDetailsComponent