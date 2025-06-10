'use client'

import React from 'react';
import { Palette, Users, Layers, Shield, ArrowRight, Sparkles,} from 'lucide-react';
import { useRouter } from "next/navigation";
import Button from '@repo/ui/button';
import Card from "@repo/ui/card";

export default function Home() {
  const router = useRouter();
  return (
     <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Static Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-violet-900/20 via-black to-indigo-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(120,119,198,0.3),transparent)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,119,198,0.3),transparent)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_90%,rgba(120,219,255,0.3),transparent)]"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">CollabDraw</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-300 hover:text-violet-400 transition-all duration-300 font-medium">Features</a>
              <Button onClick={() => {
    router.push("/signin");
  }} variant="outline" size="sm">Sign In</Button>

          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="text-center max-w-6xl mx-auto">

          
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
            Create, Collaborate,
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Innovate
            </span> 
            <span className="text-white"> Together</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-16 max-w-4xl mx-auto leading-relaxed font-light">
            The ultimate collaborative drawing platform that transforms your team's creativity. 
            <br className="hidden md:block" />
            Experience real-time collaboration, powerful tools, and seamless sharing in one beautiful interface.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
            <Button size="lg" className="w-full sm:w-auto text-xl px-12 py-5">
              <Sparkles className="w-6 h-6 mr-3" />
              Start Drawing Free
              <ArrowRight className="w-6 h-6 ml-3" />
            </Button>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="relative">
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-3xl p-2 shadow-2xl shadow-violet-500/30">
            <div className="bg-gray-900 rounded-2xl p-12 min-h-[500px] flex items-center justify-center border border-gray-700">
              <div className="text-center">
                <div className="w-32 h-32 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-8 backdrop-blur-sm border border-violet-500/30">
                  <Palette className="w-16 h-16 text-violet-400" />
                </div>
                <p className="text-gray-400 text-lg">Interactive drawing canvas will appear here</p>
                <div className="flex justify-center space-x-4 mt-8">
                  <div className="w-4 h-4 bg-violet-500 rounded-full"></div>
                  <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                  <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Static Floating Elements */}
          <div className="absolute -top-8 -left-8 w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-lg"></div>
          <div className="absolute -bottom-8 -right-8 w-10 h-10 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full shadow-lg"></div>
          <div className="absolute top-1/2 -right-12 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-lg"></div>
          <div className="absolute top-20 -left-6 w-6 h-6 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full shadow-lg"></div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32 bg-gradient-to-b from-transparent to-gray-900/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Everything you need to
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">create together</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Powerful features designed for modern creative teams who value collaboration, efficiency, and beautiful design.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card hover variant="elevated">
              <div className="w-16 h-16 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Real-time Collaboration</h3>
              <p className="text-gray-300 leading-relaxed text-lg">
                Work together seamlessly with your team. See changes instantly as everyone contributes to the same canvas.
              </p>
            </Card>
            
            
            <Card hover variant="elevated">
              <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
                <Layers className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Advanced Layers</h3>
              <p className="text-gray-300 leading-relaxed text-lg">
                Organize your work with unlimited layers, blend modes, and professional-grade tools.
              </p>
            </Card>
            
  
            <Card hover variant="elevated">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-pink-500/30">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Secure & Private</h3>
              <p className="text-gray-300 leading-relaxed text-lg">
                Your work is protected with enterprise-grade security and privacy controls you can trust.
              </p>
            </Card>
            
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 bg-gradient-to-r from-violet-900/20 via-purple-900/20 to-indigo-900/20 backdrop-blur-sm">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Ready to transform your 
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">creative workflow?</span>
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join thousands of teams already using CollabDraw to create amazing things together. 
              Start your creative journey today.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-gray-900/80 backdrop-blur-sm border-t border-gray-800 py-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            <div className="flex items-center space-x-3 mb-8 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">CollabDraw</span>
            </div>
            <div className="flex space-x-8 text-gray-400">
              <a href="#" className="hover:text-violet-400 transition-colors duration-300 font-medium">Privacy</a>
              <a href="#" className="hover:text-violet-400 transition-colors duration-300 font-medium">Terms</a>
              <a href="#" className="hover:text-violet-400 transition-colors duration-300 font-medium">Support</a>
              <a href="#" className="hover:text-violet-400 transition-colors duration-300 font-medium">Contact</a>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-500">
            <p>&copy; 2025 CollabDraw. All rights reserved. Made with ❤️ for creative teams worldwide.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}