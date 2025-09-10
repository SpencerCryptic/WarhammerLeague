'use client';

import { useState, useEffect } from 'react';

interface LeagueAdminControlsProps {
  league: any;
  documentId: string;
}

export default function LeagueAdminControls({ league, documentId }: LeagueAdminControlsProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otps, setOtps] = useState<any[]>([]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [generatingOTP, setGeneratingOTP] = useState(false);

  // Check if current user is logged in and get user info
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // TEMPORARY: Use stored user data instead of API call due to Strapi permissions issue
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        // Mock the expected structure for admin users
        const userWithRole = {
          ...userData,
          role: { name: 'Admin', type: 'admin' }
        };
        setCurrentUser(userWithRole);
        return;
      } catch (error) {
        console.error('Error parsing stored user data:', error);
      }
    }

    const fetchUser = async () => {
      try {
        const response = await fetch('${process.env.NEXT_PUBLIC_API_URL}/api/users/me', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  // Check if current user is the league owner
  const isLeagueOwner = currentUser && league?.createdByUser?.id === currentUser.id;

  const handleStartLeague = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('You must be logged in to start the league');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leagues/${documentId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setMessage('League started successfully! Matches have been generated.');
        // Refresh the page to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.error?.message || 'Failed to start league');
      }
    } catch (error) {
      setMessage('Error starting league');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch OTPs for the league
  const fetchOTPs = async () => {
    setOtpLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/otps/league/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOtps(data.data || []);
      } else {
        console.error('Failed to fetch OTPs');
        setOtps([]);
      }
    } catch (error) {
      console.error('Error fetching OTPs:', error);
      setOtps([]);
    } finally {
      setOtpLoading(false);
    }
  };

  // Generate new OTPs
  const generateOTPs = async () => {
    setGeneratingOTP(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${process.env.NEXT_PUBLIC_API_URL}/api/otps/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          leagueId: documentId,
          count: 5
        }),
      });

      if (response.ok) {
        await fetchOTPs(); // Refresh the list
        setMessage('Generated 5 new OTPs successfully!');
      } else {
        const errorData = await response.json();
        setMessage(errorData.error?.message || 'Failed to generate OTPs');
      }
    } catch (error) {
      console.error('Error generating OTPs:', error);
      setMessage('Error generating OTPs');
    } finally {
      setGeneratingOTP(false);
    }
  };

  // Fetch OTPs when modal opens
  useEffect(() => {
    if (showOTPModal && documentId) {
      fetchOTPs();
    }
  }, [showOTPModal, documentId]);

  // Don't show controls if user is not the league owner
  if (!isLeagueOwner) {
    return null;
  }

  const playerCount = league?.league_players?.length || 0;
  const canStartLeague = league?.statusleague === 'planned' && playerCount >= 2;

  return (
    <div className="max-w-6xl m-4 p-6 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg shadow-sm dark:bg-gradient-to-r dark:from-orange-900/20 dark:to-red-900/20 dark:border-orange-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">
            League Admin Controls
          </h3>
          <p className="text-sm text-orange-600 dark:text-orange-300">
            You are the organiser of this league
          </p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.includes('successfully') || message.includes('started')
            ? 'bg-green-100 text-green-700 border border-green-400' 
            : 'bg-red-100 text-red-700 border border-red-400'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-3">
        {/* Admin Action Buttons */}
        <div className="flex gap-3">
          {/* Start League Button */}
          {league?.statusleague === 'planned' && (
            <button
              onClick={handleStartLeague}
              disabled={!canStartLeague || isLoading}
              className={`px-4 py-2 rounded-md font-semibold transition-colors ${
                canStartLeague && !isLoading
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Starting League...' : 'Start League'}
            </button>
          )}
          
          {/* Manage OTPs Button - show if league has password and useOTP */}
          {league?.leaguePassword && league?.useOTP && (
            <button
              onClick={() => setShowOTPModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors"
            >
              Manage OTPs
            </button>
          )}
        </div>
        
        {/* Start League Requirements */}
        {league?.statusleague === 'planned' && !canStartLeague && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {playerCount < 2 
              ? `Need at least 2 players to start (currently ${playerCount})` 
              : 'League cannot be started'
            }
          </p>
        )}

        {/* League Status Info */}
        <div className="text-sm space-y-1">
          <p><strong>Status:</strong> 
            <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
              league?.statusleague === 'planned' ? 'bg-yellow-100 text-yellow-800' :
              league?.statusleague === 'ongoing' ? 'bg-green-100 text-green-800' :
              league?.statusleague === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {league?.statusleague || 'Unknown'}
            </span>
          </p>
          <p><strong>Players Registered:</strong> {playerCount}</p>
          {league?.statusleague === 'ongoing' && (
            <p className="text-green-600 font-medium">League is active with matches generated!</p>
          )}
        </div>

        {league?.statusleague === 'planned' && (
          <div className="pt-2 border-t border-orange-200 dark:border-orange-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              More admin controls coming soon: Edit league, Delete league, Manage players
            </p>
          </div>
        )}
      </div>

      {/* OTP Management Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Manage OTPs
              </h3>
              <button
                onClick={() => setShowOTPModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Generate New OTP
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  Create a one-time password for a player to join this league.
                </p>
                <button 
                  onClick={generateOTPs}
                  disabled={generatingOTP}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingOTP ? 'Generating...' : 'Generate 5 OTPs'}
                </button>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                  Active OTPs
                </h4>
                {otpLoading ? (
                  <div className="flex justify-center py-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                ) : otps.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No active OTPs for this league.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {otps.map((otp) => (
                      <div
                        key={otp.documentId}
                        className={`p-3 rounded-md border text-sm ${
                          otp.isUsed
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className={`font-mono font-bold ${
                              otp.isUsed 
                                ? 'text-red-600 dark:text-red-400 line-through' 
                                : 'text-green-700 dark:text-green-300'
                            }`}>
                              {otp.code}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              otp.isUsed
                                ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                : 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                            }`}>
                              {otp.isUsed ? 'Used' : 'Active'}
                            </span>
                          </div>
                          {!otp.isUsed && (
                            <button
                              onClick={() => navigator.clipboard.writeText(otp.code)}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              title="Copy to clipboard"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {otp.isUsed ? (
                            `Used ${new Date(otp.usedAt).toLocaleDateString()}`
                          ) : (
                            `Expires ${new Date(otp.expiresAt).toLocaleDateString()}`
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}