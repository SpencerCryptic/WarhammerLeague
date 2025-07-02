'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react'

const LeagueDashboard = () => {
  
  const [league, setLeague] = useState(null)

  const getLeague = async (documentId: string) => {
    useEffect(() => {
      fetch(`http://localhost:1337/api/leagues/${documentId}`)
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
    <div>
       <h1 className='mb-20 text-6xl'>
        {league['data']['name']}
      </h1>
      <ul className="flex max-w-6xl mt-4 mx-4 bg-white border border-gray-200 rounded-t-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <li className={`inline-block rounded-tl-lg hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 ease-linear transition-all duration-150 ${ selected==='' ? 'text-orange-500 dark:text-orange-400' : 'hover:text-gray-600 dark:hover:text-gray-300'}`}>
          <Link href={ '/leagues/' + documentId + '/' }>
            <div className='p-4'>
              Overview
            </div>
          </Link>
        </li>
        <li className={`inline-block hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 ease-linear transition-all duration-150 ${ selected==='matches' ? 'text-orange-500 dark:text-orange-400' : 'hover:text-gray-600 dark:hover:text-gray-300'}`}>
          <Link href={ '/leagues/' + documentId + '/matches'}>
            <div className='p-4'>
              Matches
            </div>
          </Link>
        </li>
        <li className={`inline-block hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 ease-linear transition-all duration-150 ${ selected==='table' ? 'text-orange-500 dark:text-orange-400' : 'hover:text-gray-600 dark:hover:text-gray-300'}`}>
          <Link href={ '/leagues/' + documentId + '/table'}>
            <div className='p-4'>
              Table
            </div>
          </Link>
        </li>
        <li className={`inline-block hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 ease-linear transition-all duration-150 ${ selected==='playerDetails' ? 'text-orange-500 dark:text-orange-400' : 'hover:text-gray-600 dark:hover:text-gray-300'}`}>
          <Link href={ '/leagues/' + documentId + '/playerDetails'}>
            <div className='p-4'>
              Player Details
            </div>
          </Link>
        </li>
      </ul>
    </div>
   
  )
}

export default LeagueDashboard