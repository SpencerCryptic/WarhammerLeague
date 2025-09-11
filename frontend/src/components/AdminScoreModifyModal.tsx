'use client';

import { useState, useEffect } from 'react';
import { Match } from './MatchesDashboard';

interface AdminScoreModifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  league: any;
}

export default function AdminScoreModifyModal({ 
  isOpen, 
  onClose, 
  match, 
  league 
}: AdminScoreModifyModalProps) {
  const [formData, setFormData] = useState({
    leaguePlayer1Score: '',
    leaguePlayer2Score: '',
    leaguePlayer1BonusPoints: {
      lostButScored50Percent: false,
      scoredAllPrimaryObjectives: false
    },
    leaguePlayer2BonusPoints: {
      lostButScored50Percent: false,
      scoredAllPrimaryObjectives: false
    },
    adminNote: ''
  });

  const [loading, setLoading] = useState(false);

  const isCrypticCabinScoring = league?.rulesetType === 'cryptic_cabin_standard';

  // Pre-populate form with existing match data
  useEffect(() => {
    if (match) {
      setFormData({
        leaguePlayer1Score: match.leaguePlayer1Score?.toString() || '',
        leaguePlayer2Score: match.leaguePlayer2Score?.toString() || '',
        leaguePlayer1BonusPoints: match.leaguePlayer1BonusPoints || {
          lostButScored50Percent: false,
          scoredAllPrimaryObjectives: false
        },
        leaguePlayer2BonusPoints: match.leaguePlayer2BonusPoints || {
          lostButScored50Percent: false,
          scoredAllPrimaryObjectives: false
        },
        adminNote: ''
      });
    }
  }, [match]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to modify scores');
        return;
      }

      const response = await fetch(`https://accessible-positivity-e213bb2958.strapiapp.com/api/matches/${match?.documentId}/admin-modify-score`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          leaguePlayer1Score: parseInt(formData.leaguePlayer1Score),
          leaguePlayer2Score: parseInt(formData.leaguePlayer2Score),
          leaguePlayer1BonusPoints: formData.leaguePlayer1BonusPoints,
          leaguePlayer2BonusPoints: formData.leaguePlayer2BonusPoints,
          adminNote: formData.adminNote || undefined
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Score modified successfully! ${result.message}`);
        onClose();
        window.location.reload();
      } else {
        const errorText = await response.text();
        alert(`Failed to modify score: ${errorText}`);
      }
    } catch (error) {
      alert('Error modifying score');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (name.includes('BonusPoints')) {
      const [player, bonusType] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [player]: {
          ...prev[player as keyof typeof prev.leaguePlayer1BonusPoints],
          [bonusType]: checked
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  if (!isOpen || !match) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">🔧 Admin: Modify Match Score</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">⚠️ Administrative Override</h3>
            <div className="text-sm text-red-700 dark:text-red-300">
              <p><strong>{match.leaguePlayer1?.leagueName}</strong> vs <strong>{match.leaguePlayer2?.leagueName}</strong></p>
              <p className="mt-1">{match.leaguePlayer1?.faction} vs {match.leaguePlayer2?.faction}</p>
              <p className="mt-2 font-medium">
                Current Status: <span className="capitalize">{match.statusMatch}</span>
              </p>
              {match.matchResult !== 'unplayed' && (
                <p className="mt-1">
                  Current Result: <span className="capitalize">{match.matchResult.replace('_', ' ')}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {match.leaguePlayer1?.leagueName} Score *
              </label>
              <input
                type="number"
                name="leaguePlayer1Score"
                value={formData.leaguePlayer1Score}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {match.leaguePlayer2?.leagueName} Score *
              </label>
              <input
                type="number"
                name="leaguePlayer2Score"
                value={formData.leaguePlayer2Score}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          {isCrypticCabinScoring && (
            <div className="space-y-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">Bonus Points (Cryptic Cabin Standard)</h4>
                <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                  Select applicable bonus points for each player:
                </p>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">{match.leaguePlayer1?.leagueName}</h5>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="leaguePlayer1BonusPoints.lostButScored50Percent"
                          checked={formData.leaguePlayer1BonusPoints.lostButScored50Percent}
                          onChange={handleChange}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Lost but scored 50%+ of opponent's points (+1)
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="leaguePlayer1BonusPoints.scoredAllPrimaryObjectives"
                          checked={formData.leaguePlayer1BonusPoints.scoredAllPrimaryObjectives}
                          onChange={handleChange}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Scored all primary objectives 3+ turns (+1)
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">{match.leaguePlayer2?.leagueName}</h5>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="leaguePlayer2BonusPoints.lostButScored50Percent"
                          checked={formData.leaguePlayer2BonusPoints.lostButScored50Percent}
                          onChange={handleChange}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Lost but scored 50%+ of opponent's points (+1)
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="leaguePlayer2BonusPoints.scoredAllPrimaryObjectives"
                          checked={formData.leaguePlayer2BonusPoints.scoredAllPrimaryObjectives}
                          onChange={handleChange}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Scored all primary objectives 3+ turns (+1)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Admin Note (Optional)
            </label>
            <textarea
              name="adminNote"
              value={formData.adminNote}
              onChange={handleChange}
              rows={3}
              placeholder="Reason for score modification (e.g., scoring error, dispute resolution, etc.)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Warning
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>This action will modify existing match scores and update league standings. Player statistics will be recalculated. This action cannot be undone.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Modifying...' : '🔧 Modify Score (Admin)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}