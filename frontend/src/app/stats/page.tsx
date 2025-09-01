'use client';

import GlobalLeaderboards from '@/components/GlobalLeaderboards';
import React from 'react'

const Stats = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="pt-12 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <GlobalLeaderboards />
        </div>
      </div>
    </div>
  );
};

export default Stats;