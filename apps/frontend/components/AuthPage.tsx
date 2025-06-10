"use client";

import { useState} from "react";

interface AuthPageProps {
  isSignin: boolean;
}

export function AuthPage({ isSignin }: AuthPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    // Handle authentication logic here
    console.log(`${isSignin ? "Signin" : "Signup"} with:`, { email, password });
  };

  const title = isSignin ? "Sign In" : "Sign Up";
  const submitText = isSignin ? "Sign In" : "Create Account";


  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-lg shadow-2xl p-8 border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
            <p className="text-gray-400">
              Welcome back! Please enter your details.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              {submitText}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
