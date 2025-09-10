'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react'

const LeagueDashboard = () => {
  
  const [league, setLeague] = useState(null)

  const getLeague = async (documentId: string) => {
    useEffect(() => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leagues/${documentId}`)
      .then((res) => res.json())
      .then((data) => {
          setLeague(data);
      });
    }, []) 
  }
  const pathName: string[] = usePathname().split('/')
  const documentId = pathName[2]
  getLeague(documentId)
  const selected: string = pathName.length === 4 ? pathName[3] : ''
  if (!league) {
    return <div>
        no league
    </div>
  }
  return (
    <div className="mb-8">
      <div className="max-w-6xl mx-4 mb-6">
        <h1 className='text-5xl font-bold text-white'>
          {league['data']['name']}
        </h1>
      </div>
      <div className="max-w-6xl mx-4">
        <div className="flex border-b border-gray-700">
          <Link href={'/leagues/' + documentId + '/'}>
            <button className={`px-6 py-3 font-medium transition-all duration-200 border-b-2 ${
              selected === '' 
                ? 'text-orange-400 border-orange-400' 
                : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
            }`}>
              Overview
            </button>
          </Link>
          <Link href={'/leagues/' + documentId + '/matches'}>
            <button className={`px-6 py-3 font-medium transition-all duration-200 border-b-2 ${
              selected === 'matches' 
                ? 'text-orange-400 border-orange-400' 
                : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
            }`}>
              Matches
            </button>
          </Link>
          <Link href={'/leagues/' + documentId + '/table'}>
            <button className={`px-6 py-3 font-medium transition-all duration-200 border-b-2 ${
              selected === 'table' 
                ? 'text-orange-400 border-orange-400' 
                : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
            }`}>
              Table
            </button>
          </Link>
          <Link href={'/leagues/' + documentId + '/playerDetails'}>
            <button className={`px-6 py-3 font-medium transition-all duration-200 border-b-2 ${
              selected === 'playerDetails' 
                ? 'text-orange-400 border-orange-400' 
                : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
            }`}>
              Player Details
            </button>
          </Link>
        </div>
      </div>
    </div>
   
  )
}

export default LeagueDashboard