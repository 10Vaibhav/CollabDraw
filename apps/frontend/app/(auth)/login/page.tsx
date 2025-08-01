'use client'

import Button from '@/components/Button';
import { HTTP_BACKEND } from '@/config';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

export default function Login () {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

async function loginUser(){
  setError(''); // Reset error before new login attempt
  if (!email || !password) {
    setError('Please enter both email and password.');
    return;
  }

  try {
    const res = await axios.post(`${HTTP_BACKEND}/login`,{
      email,
      password
    },{ withCredentials: true}) 
    
    if(!res){
      setError("Something went wrong. Please try again.");
      return;
    }

    router.push("/dashboard");
  } catch (error) {
    if (axios.isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 401)) {
      setError("Invalid credentials. Please check your email and password.");
    } else {
      console.error("Login failed:", error);
      setError("An unexpected error occurred. Please try again later.");
    }
  }
}

  return (
    <div className="min-h-screen flex flex-col bg-[#FEF8E6]">
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-serif font-bold text-[#3090A1]">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-[#7BCECC]">
              Login in to your CollabDraw account
            </p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-lg border border-white/50 shadow-lg p-8 rounded-xl">
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#3090A1]">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#7BCECC]/50 rounded-md shadow-sm focus:outline-none focus:ring-[#3090A1] focus:border-[#3090A1]"
                  placeholder="you@example.com"
                />
              </div>

              <div className="mt-6">
                <label htmlFor="password" className="block text-sm font-medium text-[#3090A1]">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#7BCECC]/50 rounded-md shadow-sm focus:outline-none focus:ring-[#3090A1] focus:border-[#3090A1]"
                  placeholder="••••••••"
                />
              </div>

              <div className="mt-6">
                <Button onClick={loginUser} className="w-full justify-center">
                  {"Log in"}
                </Button>
              </div>
          </div>

          <div className="text-center mt-4">
            <p className="text-sm text-[#7BCECC]">
              Do have an account?{' '}
              <Link href="/signup" className="font-medium text-[#3090A1] hover:text-[#7BCECC]">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
