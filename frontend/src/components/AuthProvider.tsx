'use client';

import { useEffect } from 'react';
import { initTokenRefresh } from '@/utils/auth';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize token refresh checker when component mounts
    if (typeof window !== 'undefined') {
      initTokenRefresh();
    }
  }, []);

  return <>{children}</>;
}
