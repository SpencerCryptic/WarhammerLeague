'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react'

const LeagueDashboard = () => {
  
  const [league, setLeague] = useState(null)

  const getLeague = async (documentId: string) => {
    useEffect(() => {
      fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/leagues/${documentId}`)
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
    <div className="mb-4 md:mb-8">
      <div className="max-w-6xl mx-4 mb-3 md:mb-6">
        <h1 className='text-3xl md:text-5xl font-bold text-white'>
          {league['data']['name']}
        </h1>
      </div>
      <div className="max-w-6xl mx-4">
        <div className="flex border-b border-gray-700 overflow-x-auto scrollbar-hide">
          <Link href={'/leagues/' + documentId + '/'}>
            <button className={`px-3 md:px-6 py-2 md:py-3 font-medium transition-all duration-200 border-b-2 flex-shrink-0 whitespace-nowrap ${
              selected === '' 
                ? 'text-orange-400 border-orange-400' 
                : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
            }`}>
              Overview
            </button>
          </Link>
          <Link href={'/leagues/' + documentId + '/matches'}>
            <button className={`px-3 md:px-6 py-2 md:py-3 font-medium transition-all duration-200 border-b-2 flex-shrink-0 whitespace-nowrap ${
              selected === 'matches' 
                ? 'text-orange-400 border-orange-400' 
                : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
            }`}>
              Matches
            </button>
          </Link>
          <Link href={'/leagues/' + documentId + '/table'}>
            <button className={`px-3 md:px-6 py-2 md:py-3 font-medium transition-all duration-200 border-b-2 flex-shrink-0 whitespace-nowrap ${
              selected === 'table' 
                ? 'text-orange-400 border-orange-400' 
                : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
            }`}>
              Table
            </button>
          </Link>
          <Link href={'/leagues/' + documentId + '/lists'}>
            <button className={`px-3 md:px-6 py-2 md:py-3 font-medium transition-all duration-200 border-b-2 flex-shrink-0 whitespace-nowrap ${
              selected === 'lists' 
                ? 'text-orange-400 border-orange-400' 
                : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
            }`}>
              My Lists
            </button>
          </Link>
        </div>
      </div>
    </div>
   
  )
}

export default LeagueDashboard