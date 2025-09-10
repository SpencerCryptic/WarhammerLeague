'use client';
import React, { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

const API_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, {
        email: email
      });
      
      setMessage('Password reset email has been sent! Please check your email inbox and follow the instructions to reset your password.');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Forgot Your Password?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          {/* Messages */}
          {message && (
            <div className="mb-6 p-4 bg-green-600 text-white rounded-lg text-center">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-600 text-white rounded-lg text-center">
              {error}
            </div>
          )}

          {!message ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter your email address"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
                  loading
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700 focus:ring-2 focus:ring-orange-500'
                }`}
              >
                {loading ? 'Sending...' : 'Send Reset Email'}
              </button>
            </form>
          ) : null}
          
          <div className="mt-6 text-center">
            <Link 
              href="/auth/login"
              className="text-orange-400 hover:text-orange-300 text-sm font-medium"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;