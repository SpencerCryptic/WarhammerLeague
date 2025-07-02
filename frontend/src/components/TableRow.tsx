"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { use, useEffect, useRef, useState } from 'react'

export interface LeaguePlayer {
  documentId: string,
  leagueName: string, 
  faction: string,
  wins: number,
  draws: number,
  losses: number,
  rankingPoints: number,
  playList: string
}

const TableRow = () => {
  
  const [leaguePlayers, setLeaguePlayers] = useState<LeaguePlayer[]>([])
  const [activeList, setActiveList] = useState({id: '', list: ''})
  const getLeague = (documentId: string) => {
    useEffect(() => {
      fetch(`http://localhost:1337/api/leagues/${documentId}`)
      .then((res) => res.json())
      .then((data) => {
          setLeaguePlayers(data.data.league_players);
          console.log
      });
    }, []) 
  }
  const toggleExpand = (event: React.MouseEvent<HTMLButtonElement>, documentId: string) => {
    console.log(activeList)
    setActiveList({id: documentId, list: documentId === '' ? '' : leaguePlayers.find((player: LeaguePlayer) => player.documentId === documentId)!.playList})
  }
  const copylist = (event: React.MouseEvent<HTMLButtonElement>, list: string) => {
    navigator.clipboard.writeText(list)
  }

  const pathName: string[] = usePathname().split('/')
  const documentId = pathName[2]
  getLeague(documentId)
    
  return (
    <div>
      {
        activeList.id === '' ? 
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th className="px-6 py-3">
                Player
              </th>
              <th className="px-6 py-3">
                Faction
              </th>
              <th className="px-6 py-3">
                P
              </th>
              <th className="px-6 py-3">
                W
              </th>
              <th className="px-6 py-3">
                D
              </th>
              <th className="px-6 py-3">
                L
              </th>
              <th className="px-6 py-3">
                VP
              </th>
              <th className="px-6 py-3">
                Pts
              </th>
              <th className="px-6 py-3">
                List
              </th>
            </tr>
          </thead>
          <tbody>
            {leaguePlayers.map((player: LeaguePlayer) => (
              <tr key={player.documentId} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                <td className="px-6 py-4 capitalize">
                  {player.leagueName}
                </td>
                <td className="px-6 py-4">
                  {player.faction}
                </td>
                <td className="px-6 py-4">
                  {(player.wins + player.draws + player.losses).toString()}
                </td>
                <td className="px-6 py-4">
                  {player.wins.toString()}
                </td>
                <td className="px-6 py-4">
                  {player.draws.toString()}
                </td>
                <td className="px-6 py-4">
                  {player.losses.toString()}
                </td>
                <td className="px-6 py-4">
                  {player.rankingPoints.toString()}
                </td>
                <td className="px-6 py-4">
                  {(player.wins * 3 + player.draws).toString()}
                </td>
                <td className='px-6 py-4 hover:text-orange-500 dark:hover:text-orange-400 ease-linear transition-all duration-150'>
                  <button type='button' onClick={(e) => toggleExpand(e, player.documentId)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        :
        <div className='max-w-6xl mx-auto'>
          <div className='flex'>
            <div className='mb-4 mx-5 hover:text-orange-500 dark:hover:text-orange-400 ease-linear transition-all duration-150'>
              <button type='button' onClick={(e) => toggleExpand(e, '')}>
                Back
              </button>
            </div>
            <h1 className='ml-auto text-2xl capitalize'>
              {
                leaguePlayers.find((player: LeaguePlayer) => 
                player.documentId === activeList.id
                )!.leagueName
              }
            </h1>
            <div className='ml-auto mb-4 hover:text-orange-500 dark:hover:text-orange-400 ease-linear transition-all duration-150'>
              <button type='button' onClick={(e) => copylist(e, activeList.list)}>
                Copy
              </button>
            </div>
          </div>
          <p className="block whitespace-pre-wrap p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-900 dark:border-gray-700">
            {
              leaguePlayers.find((player: LeaguePlayer) => 
                player.documentId === activeList.id
              )!.playList
            }
          </p>
          
        </div>
      }
    </div>
  )
}

export default TableRow