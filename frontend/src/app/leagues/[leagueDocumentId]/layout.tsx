import LeagueDashboard from '@/components/LeagueDashboard'
import React from 'react'

const leagueLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F1117' }}>
      <div className="pt-12 pb-20">
        <LeagueDashboard />
        <div className='max-w-6xl mx-4'>
          {children}
        </div>
      </div>
    </div>
  )
}

export default leagueLayout