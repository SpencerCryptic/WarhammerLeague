import Tabgroup from '@/components/Tabgroup';
import React from 'react'

const leagueDashboardLayout = ({children}: Readonly<{children: React.ReactNode;}>) => {
  return (
    <div className="block max-w-6xl m-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
      <Tabgroup />
      {children}
    </div>

  )
}

export default leagueDashboardLayout