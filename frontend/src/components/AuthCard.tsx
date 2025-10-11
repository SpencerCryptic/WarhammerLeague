import React from 'react';
import { useRouter } from 'next/navigation';

const AuthCard = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const router = useRouter();

  return (
    <div className="fixed inset-0 flex items-start justify-center px-4 py-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl my-auto relative">
        <button
          onClick={() => router.back()}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
};
  

export default AuthCard;
