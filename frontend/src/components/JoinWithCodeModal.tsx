'use client';

import { useState, useEffect } from 'react';

interface JoinWithCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Faction {
  documentId: string;
  name: string;
  isActive: boolean;
}

interface LeagueInfo {
  name: string;
  gameSystem: string;
}

interface CodeValidation {
  valid: boolean;
  league: LeagueInfo;
  expiry: string;
  usesRemaining: number;
  expired: boolean;
  usedUp: boolean;
}

export default function JoinWithCodeModal({ isOpen, onClose }: JoinWithCodeModalProps) {
  const [step, setStep] = useState<'enter-code' | 'join-league'>('enter-code');
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [codeValidation, setCodeValidation] = useState<CodeValidation | null>(null);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [joinData, setJoinData] = useState({
    leagueName: '',
    faction: '',
    goodFaithAccepted: false
  });

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setStep('enter-code');
      setCode('');
      setCodeValidation(null);
      setFactions([]);
      setJoinData({ leagueName: '', faction: '', goodFaithAccepted: false });
      setError('');
    }
  }, [isOpen]);

  const validateCode = async () => {
    if (!code.trim()) {
      setError('Please enter a join code');
      return;
    }

    setValidating(true);
    setError('');

    try {
      const response = await fetch('http://localhost:1337/api/leagues/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      });

      const result = await response.json();

      if (response.ok && result.data.valid) {
        setCodeValidation(result.data);
        
        // Fetch factions for the game system (we'll need the gameSystemId for this)
        // For now, set some generic factions
        setFactions([
          { documentId: '1', name: 'Generic Faction 1', isActive: true },
          { documentId: '2', name: 'Generic Faction 2', isActive: true }
        ]);
        
        setStep('join-league');
      } else {
        const errorMsg = result.data?.expired ? 'This join code has expired' :
                        result.data?.usedUp ? 'This join code has reached maximum uses' :
                        'Invalid join code';
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Error validating code:', error);
      setError('Failed to validate code. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const joinLeague = async () => {
    if (!joinData.leagueName.trim() || !joinData.goodFaithAccepted) {
      setError('Please fill in all required fields and accept the good faith commitment');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to join a league');
        return;
      }

      const response = await fetch('http://localhost:1337/api/leagues/join-with-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: code.trim(),
          leagueName: joinData.leagueName.trim(),
          faction: joinData.faction || null,
          goodFaithAccepted: joinData.goodFaithAccepted
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully joined ${codeValidation?.league.name}!`);
        onClose();
        window.location.reload(); // Refresh to show new league
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to join league');
      }
    } catch (error) {
      console.error('Error joining league:', error);
      setError('Failed to join league. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setJoinData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {step === 'enter-code' ? 'Join with Code' : 'Complete Registration'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {step === 'enter-code' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Join Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                maxLength={6}
                pattern="[0-9]{6}"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ask your league organizer for the 6-digit join code
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={validateCode}
                disabled={validating || !code.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validating ? 'Validating...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {step === 'join-league' && codeValidation && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                Joining: {codeValidation.league.name}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Game System: {codeValidation.league.gameSystem}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Code expires: {new Date(codeValidation.expiry).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                League Display Name *
              </label>
              <input
                type="text"
                name="leagueName"
                value={joinData.leagueName}
                onChange={handleChange}
                placeholder="How you want to be known in this league"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">This must be unique within this league</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Faction (Optional)
              </label>
              <select
                name="faction"
                value={joinData.faction}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select a faction (optional)</option>
                {factions.filter(f => f.isActive).map(faction => (
                  <option key={faction.documentId} value={faction.documentId}>
                    {faction.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                name="goodFaithAccepted"
                checked={joinData.goodFaithAccepted}
                onChange={handleChange}
                required
                className="mt-1"
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">
                I commit to playing in good faith and will respectfully engage with all league participants *
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setStep('enter-code')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Back
              </button>
              <button
                onClick={joinLeague}
                disabled={loading || !joinData.leagueName.trim() || !joinData.goodFaithAccepted}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Joining...' : 'Join League'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}