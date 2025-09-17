'use client';
import React, { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthCard from '@/components/AuthCard';

const API_URL = 'https://accessible-positivity-e213bb2958.strapiapp.com';

const EmailConfirmationContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const confirmationToken = searchParams.get('confirmation');
    
    if (!confirmationToken) {
      setError('No confirmation token provided. Please check your email link.');
      setLoading(false);
      return;
    }

    const confirmEmail = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/auth/email-confirmation?confirmation=${confirmationToken}`);
        
        setMessage('Email confirmed successfully! You can now login to your account.');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
        
      } catch (error: any) {
        console.error('Email confirmation error:', error);
        setError(error.response?.data?.message || 'Email confirmation failed. The link may be expired or invalid.');
      } finally {
        setLoading(false);
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  return (
    <AuthCard title="Email Confirmation">
      <div className="text-center">
        {loading && (
          <div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Confirming your email...</p>
          </div>
        )}
        
        {message && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <p className="text-green-800 dark:text-green-200">{message}</p>
            <p className="text-green-600 dark:text-green-400 text-sm mt-2">Redirecting to login...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        
        {!loading && (
          <div className="mt-6">
            <a 
              href="/auth/login" 
              className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 font-medium"
            >
              Go to Login
            </a>
          </div>
        )}
      </div>
    </AuthCard>
  );
};

export default function EmailConfirmationPage() {
  return (
    <Suspense fallback={
      <AuthCard title="Email Confirmation">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </AuthCard>
    }>
      <EmailConfirmationContent />
    </Suspense>
  );
}