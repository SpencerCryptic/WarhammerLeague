import LeagueDashboard from '@/components/LeagueDashboard'
import React from 'react'

const leagueLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <div>
      <LeagueDashboard></LeagueDashboard>
      <div className='flex p-4 max-w-6xl mx-4 bg-white border border-gray-200 rounded-b-lg shadow-sm dark:bg-gray-800 dark:border-gray-700'>
        {children}
      </div>
      
    </div>
  )
}

export default leagueLayout