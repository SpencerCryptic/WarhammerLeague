'use client';
// Force deployment - OTP email functionality
import { useState, useEffect } from 'react';

const API_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com';

interface OTP {
  id: number;
  documentId: string;
  code: string;
  isUsed: boolean;
  usedBy?: {
    username: string;
    email: string;
  };
  usedAt?: string;
  expiresAt: string;
  createdAt: string;
}

interface OTPManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagueId: string;
  leagueName: string;
}

export default function OTPManagementModal({ isOpen, onClose, leagueId, leagueName }: OTPManagementModalProps) {
  const [otps, setOTPs] = useState<OTP[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedOTP, setCopiedOTP] = useState<string | null>(null);
  const [emailToSend, setEmailToSend] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const fetchOTPs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/otps/league/${leagueId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOTPs(data.data);
      } else {
        console.error('Failed to fetch OTPs');
      }
    } catch (error) {
      console.error('Error fetching OTPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateOTPs = async (count: number = 10) => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      console.log('🔍 OTP Generation Debug:');
      console.log('- League ID:', leagueId);
      console.log('- Token exists:', !!token);
      console.log('- Stored user:', storedUser ? JSON.parse(storedUser) : 'None');
      console.log('- API URL:', API_URL);
      
      const response = await fetch(`${API_URL}/api/otps/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          leagueId,
          count
        }),
      });

      console.log('- Response status:', response.status);
      console.log('- Response headers:', response.headers);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ OTPs generated successfully:', result);
        await fetchOTPs(); // Refresh the list
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to generate OTPs:', response.status, errorText);
        
        // Show user-friendly error
        alert(`Failed to generate OTPs: ${response.status} - ${errorText.substring(0, 100)}`);
      }
    } catch (error) {
      console.error('💥 Error generating OTPs:', error);
      alert(`Error generating OTPs: ${error}`);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedOTP(code);
      setTimeout(() => setCopiedOTP(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const sendOTPEmail = async () => {
    if (!emailToSend || !emailToSend.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setSendingEmail(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/otps/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: emailToSend,
          leagueId,
          leagueName
        }),
      });

      if (response.ok) {
        setEmailSent(true);
        setEmailToSend('');
        setTimeout(() => setEmailSent(false), 3000);
        await fetchOTPs(); // Refresh OTPs to show the newly generated one
      } else {
        const errorText = await response.text();
        console.error('Failed to send OTP email:', response.status, errorText);
        alert(`Failed to send email: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error sending OTP email:', error);
      alert(`Error sending email: ${error}`);
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    if (isOpen && leagueId) {
      fetchOTPs();
    }
  }, [isOpen, leagueId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">OTP Management</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{leagueName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Email OTP Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Send OTP via Email</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Enter a player's email address to send them an OTP and league invitation link
          </p>
          <div className="flex gap-3">
            <input
              type="email"
              value={emailToSend}
              onChange={(e) => setEmailToSend(e.target.value)}
              placeholder="player@example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={sendingEmail}
            />
            <button
              onClick={sendOTPEmail}
              disabled={sendingEmail || !emailToSend}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {sendingEmail ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send OTP
                </>
              )}
            </button>
          </div>
          {emailSent && (
            <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm rounded">
              ✅ OTP email sent successfully!
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Generated OTPs</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Share these codes manually with players to grant secure access to the league
            </p>
          </div>
          <button
            onClick={() => generateOTPs(10)}
            disabled={generating}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate 10 More'}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {otps.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No OTPs generated yet.</p>
                <button
                  onClick={() => generateOTPs(10)}
                  className="mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  Generate your first batch
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {otps.map((otp) => (
                  <div
                    key={otp.documentId}
                    className={`p-4 rounded-lg border ${
                      otp.isUsed
                        ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="font-mono text-lg font-bold">
                          {otp.isUsed ? (
                            <span className="text-gray-400 line-through">{otp.code}</span>
                          ) : (
                            <span className="text-green-700 dark:text-green-300">{otp.code}</span>
                          )}
                        </div>
                        <div className="text-sm">
                          {otp.isUsed ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300">
                              Used
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {!otp.isUsed && (
                          <button
                            onClick={() => copyToClipboard(otp.code)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Copy to clipboard"
                          >
                            {copiedOTP === otp.code ? (
                              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        )}
                        
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {otp.isUsed && otp.usedBy ? (
                            <div>
                              <div>Used by: {otp.usedBy.username}</div>
                              <div>On: {new Date(otp.usedAt!).toLocaleDateString()}</div>
                            </div>
                          ) : (
                            <div>
                              <div>Created: {new Date(otp.createdAt).toLocaleDateString()}</div>
                              <div>Expires: {new Date(otp.expiresAt).toLocaleDateString()}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}