import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, Scissors, Star, ArrowRight, Play, CheckCircle, Sparkles } from 'lucide-react';

const Hero: React.FC = () => {
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationStep(1);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-hero">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-128 h-128 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="max-w-5xl mx-auto">
          {/* Badge */}
          <div className={`inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 mb-8 transition-all duration-700 ${
            animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <Sparkles className="h-5 w-5 text-accent-400" />
            <span className="text-white/90 font-medium">No membership. No setup fee.</span>
          </div>

          {/* Main Headline */}
          <h1 className={`font-display font-bold text-white mb-8 transition-all duration-700 delay-200 ${
            animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          } text-4xl md:text-6xl lg:text-7xl leading-tight`}>
            Your booking page —
            <br />
            <span className="bg-gradient-to-r from-accent-400 via-primary-400 to-accent-400 bg-clip-text text-transparent animate-gradient text-5xl md:text-7xl lg:text-8xl">
              live today
            </span>
          </h1>

          {/* Subtitle */}
          <p className={`text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed transition-all duration-700 delay-400 ${
            animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            Kutable gives solo barbers a clean, mobile-first booking site with payments, 
            reminders, and your own shareable link. Just 1% per booking.
          </p>
          
          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-6 justify-center items-center mb-16 transition-all duration-700 delay-700 ${
            animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <Link
              to="/signup?type=barber"
              className="group bg-white text-gray-900 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-premium-lg hover:shadow-2xl flex items-center space-x-3"
            >
              <Scissors className="h-6 w-6 text-primary-600 group-hover:rotate-12 transition-transform" />
              <span>Create my page</span>
              <ArrowRight className="h-5 w-5 text-primary-600 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              to="/barbers"
              className="group bg-gradient-to-r from-accent-500 to-accent-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:from-accent-600 hover:to-accent-700 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-premium-lg hover:shadow-2xl flex items-center space-x-3"
            >
              <Search className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span>See examples</span>
            </Link>
          </div>

          {/* Social Proof */}
          <div className={`flex justify-center items-center space-x-8 transition-all duration-700 delay-900 ${
            animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <div className="flex items-center space-x-2 text-white/70">
              <CheckCircle className="h-5 w-5 text-accent-400" />
              <span className="text-sm font-medium">No setup fees</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-white/40 rounded-full"></div>
            <div className="hidden sm:flex items-center space-x-2 text-white/70">
              <CheckCircle className="h-5 w-5 text-accent-400" />
              <span className="text-sm font-medium">1% per booking</span>
            </div>
            <div className="hidden lg:block w-1 h-1 bg-white/40 rounded-full"></div>
            <div className="hidden lg:flex items-center space-x-2 text-white/70">
              <CheckCircle className="h-5 w-5 text-accent-400" />
              <span className="text-sm font-medium">Own your data</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;