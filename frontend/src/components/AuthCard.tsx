import React from 'react';

const AuthCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="fixed inset-0 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
  

export default AuthCard;
