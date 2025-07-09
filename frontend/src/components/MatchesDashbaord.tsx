'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { LeaguePlayer } from './TableRow';

export enum StatusMatch {
  upcoming,
  planned,
  played,
  abandoned
}

export enum ProposalStatus {
  pending,
  accepted,
  rejected
}

export interface Match {
  documentId: string,
  leaguePlayer1: LeaguePlayer,
  leaguePlayer2: LeaguePlayer,
  statusMatch: StatusMatch,
  leaguePlayer1List: string,
  leaguePlayer2List: string,
  leaguePlayer1Score: number,
  leaguePlayer2Score: number,
  leaguePlayer1Result: number,
  leaguePlayer2Result: number,
  proposedBy: LeaguePlayer,
  proposalStatus: ProposalStatus,
  proposalTimestamp: Date,
}

const MatchesDashboard = () => {
  const [league, setLeague] = useState<any>(null)
  const [matches, setMatches] = useState<Match[]>([])
  
  const getLeague = async (documentId: string) => {
    useEffect(() => {
      fetch(`http://localhost:1337/api/leagues/${documentId}`)
      .then((res) => res.json())
      .then((data) => {
        setLeague(data.data);
        setMatches(data.data.matches);
      });
    }, []) 
  }
  
  const pathName: string[] = usePathname().split('/')
  const documentId = pathName[2]
  getLeague(documentId)

  if (league && league.statusleague.toString() === 'planned') {
    return <div>
      <p>League has not yet started!</p>
    </div>
  } 

  return (
    <div>
      {matches.map((match: Match) => (
        <div key={match.documentId} className="m-4 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-all duration-150">
          <ul>
            <li className='pb-4'>
              <p className='text-sm text-gray-400 capitalize'>{match.statusMatch}</p>
              <p>{match.proposalTimestamp ? match.proposalTimestamp.toDateString() : ''}</p>
            </li>
            <li className='mx-4 pb-4'>
              <div className='flex'>
                <p className='capitalize'>{match.leaguePlayer1.leagueName}</p>
                <p className={match.leaguePlayer1Result === 2 ? 'font-bold' : '' + 'ml-auto'}>{match.statusMatch.toString() === 'played' ? match.leaguePlayer1Score : ''}</p>              
              </div>
              <p className='text-xs text-gray-400'>{match.leaguePlayer1.faction}</p>
            </li>
            <li className='mx-4 pb-4'>
              <div className='flex'>
                <p className='capitalize'>{match.leaguePlayer2.leagueName}</p>
                <p className={match.leaguePlayer2Result === 2 ? 'font-bold' : ''}>{match.statusMatch.toString() === 'played' ? match.leaguePlayer2Score: ''}</p>
              </div>
              <p className='text-xs text-gray-400'>{match.leaguePlayer2.faction}</p>
            </li>
          </ul>
        </div>
      ))}
    </div>
  )
}

export default MatchesDashboard