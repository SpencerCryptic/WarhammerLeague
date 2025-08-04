import React from 'react';

const AuthCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-center h-full px-4 bg-white dark:bg-[#0a0a0a]">
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
  

export default AuthCard;
