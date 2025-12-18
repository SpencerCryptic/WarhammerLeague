'use client';
import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import axios from 'axios';
import AuthCard from '@/components/AuthCard';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type FormData = {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
  storeLocation: string;
};

const RegisterPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    storeLocation: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {
      // Step 1: Basic auth registration
      const registerRes = await axios.post(`${API_URL}/api/auth/local/register`, {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      const { jwt, user } = registerRes.data;
      const userId = user.id;

      // Step 2: Update user with extra fields
      try {
        await axios.put(
          `${API_URL}/api/users/${userId}`,
          {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phoneNumber: formData.phoneNumber,
            dateOfBirth: formData.dateOfBirth,
            storeLocation: formData.storeLocation,
          },
          {
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
          }
        );
      } catch (updateErr) {
        console.error('Failed to update extra fields:', updateErr);
        // Continue anyway - user is registered, just missing extra fields
      }

      localStorage.setItem('token', jwt);
      localStorage.setItem('user', JSON.stringify(user));
      setSuccess(true);
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error(err);
      const message = err?.response?.data?.error?.message || 'Registration failed.';
      setError(message);
    }
  };

  return (
    <AuthCard title="Register">
  <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {error && (
      <div className="md:col-span-2 text-red-500 text-center">
        {error}
      </div>
    )}
    {success && (
      <div className="md:col-span-2 text-green-500 text-center">
        Registered! Redirecting…
      </div>
    )}

    <input
      name="username"
      placeholder="Username"
      type="text"
      required
      onChange={handleChange}
      className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400"
    />
    <input
      name="email"
      placeholder="Email"
      type="email"
      required
      onChange={handleChange}
      className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400"
    />
    <input
      name="password"
      placeholder="Password"
      type="password"
      required
      onChange={handleChange}
      className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400"
    />
    <input
      name="firstName"
      placeholder="First Name"
      type="text"
      required
      onChange={handleChange}
      className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400"
    />
    <input
      name="lastName"
      placeholder="Last Name"
      type="text"
      required
      onChange={handleChange}
      className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400"
    />
    <input
      name="phoneNumber"
      placeholder="Phone Number"
      type="text"
      required
      onChange={handleChange}
      className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400"
    />
    <input
      name="dateOfBirth"
      type="date"
      required
      onChange={handleChange}
      className="w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-400"
    />

    <select
      name="storeLocation"
      value={formData.storeLocation}
      onChange={handleChange}
      required
      className="w-full px-4 py-2 rounded bg-gray-700 text-white col-span-1 md:col-span-2"
    >
      <option value="">Select Store</option>
      <option value="Cryptic Cabin Bristol">Cryptic Cabin Bristol</option>
      <option value="Cryptic Cabin Bracknell">Cryptic Cabin Bracknell</option>
    </select>

    <button
      type="submit"
      className="col-span-1 md:col-span-2 py-2 px-4 bg-orange-600 hover:bg-orange-700 rounded text-white font-semibold"
    >
      Create Account
    </button>

    <p className="col-span-1 md:col-span-2 text-sm text-gray-400 text-center">
      Already registered?{' '}
      <a href="/auth/login" className="text-orange-400 hover:underline">Login</a>
    </p>
  </form>
</AuthCard>
  );
};

export default RegisterPage;
