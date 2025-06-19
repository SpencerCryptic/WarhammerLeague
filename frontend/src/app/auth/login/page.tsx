'use client';
import React, { useState, FormEvent, useEffect } from 'react';
import axios from 'axios';
import AuthCard from '@/components/AuthCard';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const LoginPage = () => {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/auth/local`, { identifier, password });
      const { jwt, user } = res.data;
      localStorage.setItem('token', jwt);
      localStorage.setItem('user', JSON.stringify(user));
      window.location.href = '/dashboard';
    } catch {
      setError('Login failed. Please check your credentials.');
    }
  };

  return (
    <AuthCard title="Login">
      <form onSubmit={handleLogin} className="space-y-4">
        {error && <p className="text-red-500">{error}</p>}
        <input
          className="w-full px-4 py-2 rounded bg-gray-700 text-white"
          type="text"
          placeholder="Email or Username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <input
          className="w-full px-4 py-2 rounded bg-gray-700 text-white"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 rounded text-white font-semibold"
        >
          Sign In
        </button>
        <p className="text-sm text-gray-400 text-center">
          Don't have an account?{' '}
          <a href="/auth/register" className="text-orange-400 hover:underline">Register</a>
        </p>
      </form>
    </AuthCard>
  );
};

export default LoginPage;
