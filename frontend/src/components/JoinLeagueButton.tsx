'use client';

import { useState } from 'react';
import JoinLeagueModal from './JoinLeagueModal';

interface JoinLeagueButtonProps {
  leagueId: string;
  hasPassword: boolean;
  gameSystem: string;
  status: string;
}

export default function JoinLeagueButton({ 
  leagueId, 
  hasPassword, 
  gameSystem, 
  status 
}: JoinLeagueButtonProps) {
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Don't show join button if league is not planned
  if (status !== 'planned') {
    return null;
  }

  return (
    <>
      <div className="max-w-6xl m-4 p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-sm dark:bg-blue-900/20 dark:border-blue-700">
        <h3 className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-200">
          Join This League
        </h3>
        <p className="text-blue-600 dark:text-blue-300 mb-4">
          This league is open for registration. Sign up to participate!
        </p>
        <button
          onClick={() => setShowJoinModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors"
        >
          Join League
        </button>
      </div>

      <JoinLeagueModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        leagueId={leagueId}
        hasPassword={hasPassword}
        gameSystem={gameSystem}
      />
    </>
  );
}