'use client'

import Button from "@/components/Button";
import { HTTP_BACKEND } from "@/config";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function Signup (){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUserName] = useState("");
  const [error, setError] = useState("");

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !username || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      const response = await axios.post(`${HTTP_BACKEND}/signup`, {
        name,
        username,
        email,
        password,
      });

      if (response.status === 201) {
        router.replace("/login");
      }
    } catch (error) {
      console.error("Signup failed:", error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          setError(error.response?.data.message)
        }
        else if (error.response?.status === 409) {
          setError("A user with this email or username already exists.");
        } else {
          setError("An unexpected error occurred. Please try again later.");
        }
      } else {
        setError("An unexpected error occurred. Please try again later.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FEF8E6]">
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-serif font-bold text-[#3090A1]">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-[#7BCECC]">
              Join thousands of teams using CollabDraw
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-lg border border-white/50 shadow-lg p-8 rounded-xl">
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {error}
              </div>
            )}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#3090A1]">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#7BCECC]/50 rounded-md shadow-sm focus:outline-none focus:ring-[#3090A1] focus:border-[#3090A1]"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-[#3090A1]">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUserName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#7BCECC]/50 rounded-md shadow-sm focus:outline-none focus:ring-[#3090A1] focus:border-[#3090A1]"
                  placeholder="john_doe"
                />
              </div>

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

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#3090A1]">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#7BCECC]/50 rounded-md shadow-sm focus:outline-none focus:ring-[#3090A1] focus:border-[#3090A1]"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-[#7BCECC]">
                  Password must be at least 8 characters long
                </p>
              </div>

              <div>
                <Button type="submit" className="w-full justify-center">
                  {"Create account"}
                </Button>
              </div>
            </form>
          </div>

          <div className="text-center mt-4">
            <p className="text-sm text-[#7BCECC]">
              Already have an account?{" "}
              <Link href="login" className="font-medium text-[#3090A1] hover:text-[#7BCECC]">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
