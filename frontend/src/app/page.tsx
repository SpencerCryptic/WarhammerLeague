'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/auth/login');
    }
  }, []);

  return (
    <div className="text-white text-center mt-10 text-2xl">
      Redirecting or loading content...
    </div>
  );
}
