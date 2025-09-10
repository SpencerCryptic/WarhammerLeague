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

      // Step 2: Update user with extra fields using profile API
      try {
        await axios.put(
          `${API_URL}/api/profile/update`,
          {
            userId: userId,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phoneNumber: formData.phoneNumber,
            dateOfBirth: formData.dateOfBirth,
            storeLocation: formData.storeLocation,
          }
        );
        console.log('Profile data updated successfully');
      } catch (profileError) {
        console.warn('Profile update failed, but registration succeeded:', profileError);
        // Don't fail registration if profile update fails
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
  <form onSubmit={handleRegister} className="space-y-6">
    {error && (
      <div className="text-red-500 text-center bg-red-100 dark:bg-red-900/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
        {error}
      </div>
    )}
    {success && (
      <div className="text-green-500 text-center bg-green-100 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
        Registered! Redirecting…
      </div>
    )}

    {/* Account Information Section */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-700 pb-2">
        Account Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Username *
          </label>
          <input
            id="username"
            name="username"
            placeholder="Choose a username"
            type="text"
            required
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address *
          </label>
          <input
            id="email"
            name="email"
            placeholder="your.email@example.com"
            type="email"
            required
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password *
          </label>
          <input
            id="password"
            name="password"
            placeholder="Create a secure password"
            type="password"
            required
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
        </div>
      </div>
    </div>

    {/* Personal Information Section */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-700 pb-2">
        Personal Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            First Name *
          </label>
          <input
            id="firstName"
            name="firstName"
            placeholder="Your first name"
            type="text"
            required
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Last Name *
          </label>
          <input
            id="lastName"
            name="lastName"
            placeholder="Your last name"
            type="text"
            required
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
        </div>
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number *
          </label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            placeholder="e.g., 07123 456789"
            type="tel"
            required
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
        </div>
        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date of Birth *
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            required
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
        </div>
      </div>
    </div>

    {/* Store Location Section */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-700 pb-2">
        Store Location
      </h3>
      <div>
        <label htmlFor="storeLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Your Local Store *
        </label>
        <select
          id="storeLocation"
          name="storeLocation"
          value={formData.storeLocation}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
        >
          <option value="">Choose your local store</option>
          <option value="Cryptic Cabin Bristol">Cryptic Cabin Bristol</option>
          <option value="Cryptic Cabin Bracknell">Cryptic Cabin Bracknell</option>
        </select>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          This helps us show you relevant local events and leagues.
        </p>
      </div>
    </div>

    <button
      type="submit"
      className="w-full py-3 px-6 bg-orange-600 hover:bg-orange-700 rounded-lg text-white font-semibold text-lg transition-colors focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
    >
      Create Account
    </button>

    <p className="text-sm text-gray-400 text-center">
      Already registered?{' '}
      <a href="/auth/login" className="text-orange-400 hover:text-orange-300 underline font-medium">
        Login here
      </a>
    </p>
  </form>
</AuthCard>
  );
};

export default RegisterPage;
