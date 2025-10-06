"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/router';
import React from 'react'

const Tabgroup = () => {
  const pathname = usePathname();
  const [tab, setTab] = React.useState('overview')
  const switchTab = (tabName: string) => {
    setTab(tabName);
  }
  
  return (
    <ul className="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200 rounded-t-lg bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-800" id="defaultTab" data-tabs-toggle="#defaultTabContent" role="tablist">
      <li className="me-2">
        <Link href={`${pathname}`}>
          <button
          id="overview"
          onClick={() => switchTab("overview")} 
          className={`inline-block p-4 rounded-ss-lg hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 ${tab === 'overview' ? 'text-orange-600 dark:text-orange-400' : 'hover:text-gray-600 dark:hover:text-gray-300'}`}>
            Overview
        </button>
        </Link>
      </li>
      <li className="me-2">
        <Link href={`${pathname}/table`}>
          <button
          id="table"
          onClick={() => switchTab("table")} 
          className={`inline-block p-4 rounded-ss-lg hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 ${tab === 'table' ? 'text-orange-600 dark:text-orange-400' : 'hover:text-gray-600 dark:hover:text-gray-300'}`}>
            Table
        </button>
        </Link>
      </li>
      <li className="me-2">
        <Link href={`/${pathname}/matches`}>
          <button
        id="matches"
        onClick={() => switchTab("matches")}
        className={`inline-block p-4 rounded-ss-lg hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 ${tab === 'matches' ? 'text-orange-600 dark:text-orange-400' : 'hover:text-gray-600 dark:hover:text-gray-300'}`}>
          Matches
        </button>
        </Link>
      </li>
      <li className="me-2">
        <Link href={`${pathname}/lists`}>
          <button
          id="lists"
          onClick={() => switchTab("lists")}
          className={`inline-block p-4 rounded-ss-lg hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 ${tab === 'lists' ? 'text-orange-600 dark:text-orange-400' : 'hover:text-gray-600 dark:hover:text-gray-300'}`}>
            Lists
          </button>
        </Link>
      </li>
    </ul>

  )
}

export default Tabgroup