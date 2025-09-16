'use client';

import { useState, useEffect } from 'react';
import { Match } from './MatchesDashboard';

interface GameDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
}

export default function GameDetailsModal({ 
  isOpen, 
  onClose, 
  match 
}: GameDetailsModalProps) {
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({});

  const copyToClipboard = async (text: string, playerId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [playerId]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [playerId]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };
  
  const renderArmyList = (armyListContent: string | null, playerName: string, faction?: string, playerId?: string) => {
    if (!armyListContent) {
      return (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <p className="text-gray-500 dark:text-gray-400 text-center">No army list available</p>
        </div>
      );
    }

    const playerKey = playerId || playerName;
    const isCopied = copiedStates[playerKey];

    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
          <h4 className="font-bold text-lg text-gray-900 dark:text-white">{playerName}</h4>
          {faction && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{faction}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h5 className="font-semibold text-gray-900 dark:text-white">Army List:</h5>
            <button
              onClick={() => copyToClipboard(armyListContent, playerKey)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                isCopied
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
              }`}
            >
              {isCopied ? 'Copied!' : 'Copy List'}
            </button>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-md p-3 max-h-96 overflow-y-auto">
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
              {armyListContent}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Game Details - Round {match?.round}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Game Summary */}
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-orange-800 dark:text-orange-300">Match Result</h3>
                <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm font-medium">
                  PLAYED
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="text-center">
                  <div className="font-bold text-xl text-gray-900 dark:text-white">
                    {match?.leaguePlayer1?.leagueName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {match?.leaguePlayer1?.faction}
                  </div>
                  <div className={`text-3xl font-bold mt-2 ${
                    match?.leaguePlayer1Result === 2 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                  }`}>
                    {match?.leaguePlayer1Score}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">VS</div>
                  <div className="mt-2 text-lg font-medium text-gray-700 dark:text-gray-300">
                    {match?.leaguePlayer1Result === 2 ? `${match?.leaguePlayer1?.leagueName} Victory` :
                     match?.leaguePlayer2Result === 2 ? `${match?.leaguePlayer2?.leagueName} Victory` :
                     'Draw'}
                  </div>
                </div>

                <div className="text-center">
                  <div className="font-bold text-xl text-gray-900 dark:text-white">
                    {match?.leaguePlayer2?.leagueName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {match?.leaguePlayer2?.faction}
                  </div>
                  <div className={`text-3xl font-bold mt-2 ${
                    match?.leaguePlayer2Result === 2 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                  }`}>
                    {match?.leaguePlayer2Score}
                  </div>
                </div>
              </div>
            </div>

            {/* Army Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                  {match?.leaguePlayer1?.leagueName}'s Army List
                </h3>
                {renderArmyList(
                  match?.leaguePlayer1List || null, 
                  match?.leaguePlayer1?.leagueName || 'Player 1',
                  match?.leaguePlayer1?.faction,
                  'player1'
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                  {match?.leaguePlayer2?.leagueName}'s Army List
                </h3>
                {renderArmyList(
                  match?.leaguePlayer2List || null, 
                  match?.leaguePlayer2?.leagueName || 'Player 2',
                  match?.leaguePlayer2?.faction,
                  'player2'
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}