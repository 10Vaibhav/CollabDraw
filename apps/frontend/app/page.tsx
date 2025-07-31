"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// SVG Icon Components for the footer
const GithubIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.492.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.398.1 2.65.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.942.359.308.678.92.678 1.852 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
  </svg>
);

const TwitterIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
  </svg>
);

const LinkedinIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
    </svg>
);

export default function App() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Simple check for any cookie. A more robust solution would be 
    // to check for a specific session cookie name or verify with a backend endpoint.
    if (document.cookie) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleStartDrawing = () => {
    if (isLoggedIn) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="bg-[#FEF8E6] min-h-screen flex flex-col text-[#3090A1] font-sans">

      {/* Navbar */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#3090A1]">CollabDraw</h1>
        <div className="flex items-center space-x-4">
          <button onClick={()=> router.push("/login")} className="text-[#3090A1] font-medium hover:text-[#7BCECC] transition-colors">
            Login
          </button>
          <button onClick={()=> router.push("/signup")} className="bg-[#BC5148] hover:bg-opacity-90 text-white font-semibold py-2 px-5 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105">
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow flex items-center relative">
        <div className="container mx-auto px-6 text-center">
          <div 
            className="absolute inset-0 z-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at 25% 30%, #7BCECC 0%, transparent 50%), radial-gradient(circle at 75% 70%, #3090A1 0%, transparent 50%)'
            }}
          ></div>
          <div className="relative z-10">
            <h2 className="text-5xl md:text-7xl font-extrabold leading-tight mb-4 text-[#3090A1]">
              Where Ideas Come to Life.
              <br />
              <span className="text-[#BC5148]">Together.</span>
            </h2>
            <p className="text-lg md:text-xl text-[#3090A1] max-w-2xl mx-auto mb-8">
              Jump into a shared canvas and bring your imagination to reality in real-time. CollabDraw is the simplest way to draw and brainstorm with your team or friends.
            </p>
            <button onClick={handleStartDrawing} className="bg-[#BC5148] hover:bg-opacity-90 text-white font-bold py-4 px-10 rounded-lg text-lg transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg shadow-[#BC5148]/30">
              Start Drawing for Free
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#3090A1] mt-16 py-8">
        <div className="container mx-auto px-6 text-center text-[#FEF8E6]">
          <div className="flex justify-center space-x-6 mb-4">
            <a href="https://github.com/10Vaibhav" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><GithubIcon /></a>
            <a href="https://x.com/Vaibhav04102004" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><TwitterIcon /></a>
            <a href="https://www.linkedin.com/in/vaibhav-mahajan-709673258/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><LinkedinIcon /></a>
          </div>
          <p className="opacity-80">&copy; {new Date().getFullYear()} CollabDraw. All Rights Reserved.</p>
          <p className="mt-2">
            <a href="mailto:contact@collabdraw.com" className="hover:text-[#7BCECC] transition-colors">contact@collabdraw.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
