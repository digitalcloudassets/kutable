import React from 'react';
import Hero from '../components/Home/Hero';
import ValueProps from '../components/Home/ValueProps';
import HowItWorks from '../components/Home/HowItWorks';
import FAQ from '../components/Home/FAQ';
import FeaturedBarbers from '../components/Home/FeaturedBarbers';
import HomeLiveDemo from '../components/Home/HomeLiveDemo';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Scissors, 
  CheckCircle, 
  DollarSign, 
  Star, 
  Users, 
  TrendingUp,
  Smartphone,
  Calendar,
  Shield,
  Zap,
  Crown,
  Clock,
  MessageSquare
} from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      
      {/* Live Demo Strip */}
      <HomeLiveDemo />
      
      {/* Stats Section - More Visual Interest */}
      <section className="relative py-20 bg-gradient-to-br from-white via-gray-50 to-primary-50/30 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-accent-500/5 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-primary-50 text-primary-700 rounded-full px-6 py-3 mb-6">
              <Star className="h-5 w-5" />
              <span className="font-medium">Trusted Platform</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-6">
              Built for Barber Success
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join the growing community of professional barbers who trust Kutable for their business
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-premium group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-10 w-10 text-white" />
              </div>
              <div className="text-4xl font-display font-bold text-gray-900 mb-2">1%</div>
              <div className="text-lg font-semibold text-gray-700 mb-3">Platform Fee</div>
              <p className="text-gray-600 leading-relaxed">Only pay when you earn. No setup fees, no monthly subscriptions.</p>
            </div>
            
            <div className="text-center group">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-premium group-hover:scale-110 transition-transform duration-300">
                <Smartphone className="h-10 w-10 text-white" />
              </div>
              <div className="text-4xl font-display font-bold text-gray-900 mb-2">24/7</div>
              <div className="text-lg font-semibold text-gray-700 mb-3">Online Booking</div>
              <p className="text-gray-600 leading-relaxed">Customers can book anytime. You get paid automatically.</p>
            </div>
            
            <div className="text-center group">
              <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-premium group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-10 w-10 text-white" />
              </div>
              <div className="text-4xl font-display font-bold text-gray-900 mb-2">95%</div>
              <div className="text-lg font-semibold text-gray-700 mb-3">You Keep</div>
              <p className="text-gray-600 leading-relaxed">After platform and processing fees, most goes to you.</p>
            </div>
          </div>
        </div>
      </section>

      <ValueProps />
      <HowItWorks />
      <FeaturedBarbers />

      {/* Enhanced Pricing Section */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 mb-8">
            <Crown className="h-5 w-5 text-accent-400" />
            <span className="text-white/90 font-medium">Simple, transparent pricing</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
            No Contracts. No Hidden Fees.
          </h2>
          <p className="text-xl text-white/80 mb-16 max-w-3xl mx-auto">
            Pay only when you succeed. Our transparent pricing helps you grow without the risk.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Free Listing */}
            <div className="card-premium p-10 bg-white/95 backdrop-blur-sm border border-white/20 hover:scale-[1.02] transition-all duration-300">
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-gray-700" />
                </div>
                <h3 className="text-2xl font-display font-bold text-gray-900 mb-4">Directory Listing</h3>
                <div className="text-6xl font-display font-bold text-gray-900 mb-2">FREE</div>
                <div className="text-gray-600 text-lg">Forever</div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="text-gray-700">Professional business profile</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="text-gray-700">Customer reviews and ratings</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="text-gray-700">Shareable profile link</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="text-gray-700">Mobile-optimized design</span>
                </div>
              </div>
              
              <Link
                to="/signup?type=barber"
                className="btn-secondary w-full justify-center text-lg hover:scale-105 transition-all duration-200"
              >
                Create Free Profile
              </Link>
            </div>

            {/* Pro Features */}
            <div className="card-premium p-10 bg-gradient-to-br from-accent-500 to-accent-600 text-white border-2 border-accent-400 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                  <span className="text-white text-sm font-semibold">Recommended</span>
                </div>
              </div>
              
              <div className="text-center mb-8">
                <div className="bg-white/20 backdrop-blur-sm w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-display font-bold text-white mb-4">Online Booking</h3>
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-6xl font-display font-bold text-white">4%</span>
                  <span className="text-white/80 ml-2 text-lg">per booking</span>
                </div>
                <div className="text-white/80">Only when you earn</div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span className="text-white">Everything in Free</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span className="text-white">Accept online payments</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span className="text-white">Automatic SMS confirmations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span className="text-white">Business analytics dashboard</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span className="text-white">Photo gallery showcase</span>
                </div>
              </div>
              
              <Link
                to="/signup?type=barber"
                className="bg-white text-accent-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-100 transition-all duration-200 w-full flex items-center justify-center space-x-2 hover:scale-105"
              >
                <Calendar className="h-5 w-5" />
                <span>Start Accepting Bookings</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Kutable - Enhanced */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-white"></div>
        <div className="absolute top-20 right-10 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-accent-50 text-accent-700 rounded-full px-6 py-3 mb-6">
              <Shield className="h-5 w-5" />
              <span className="font-medium">Platform Advantages</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-6">
              Why Barbers Choose Kutable
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to run a modern barbering business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-8 hover:shadow-premium transition-all duration-300 hover:scale-[1.02]">
              <div className="bg-blue-500 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-4">Instant Setup</h3>
              <p className="text-gray-700 leading-relaxed">
                Get your booking page live in minutes. No technical knowledge required - just add your services and start earning.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-8 hover:shadow-premium transition-all duration-300 hover:scale-[1.02]">
              <div className="bg-emerald-500 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-4">Get Paid Instantly</h3>
              <p className="text-gray-700 leading-relaxed">
                Money goes straight to your bank account when customers book. No waiting, no chasing payments.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-8 hover:shadow-premium transition-all duration-300 hover:scale-[1.02]">
              <div className="bg-purple-500 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-4">Stay Connected</h3>
              <p className="text-gray-700 leading-relaxed">
                Automatic SMS confirmations and reminders keep your schedule full and reduce no-shows.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-8 hover:shadow-premium transition-all duration-300 hover:scale-[1.02]">
              <div className="bg-orange-500 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-4">Own Your Brand</h3>
              <p className="text-gray-700 leading-relaxed">
                Your profile, your rules. Showcase your work, set your prices, control your schedule.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-2xl p-8 hover:shadow-premium transition-all duration-300 hover:scale-[1.02]">
              <div className="bg-red-500 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-4">Save Time</h3>
              <p className="text-gray-700 leading-relaxed">
                No more phone tag or double bookings. Automated scheduling frees you to focus on cutting.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-2xl p-8 hover:shadow-premium transition-all duration-300 hover:scale-[1.02]">
              <div className="bg-indigo-500 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-4">Grow Your Business</h3>
              <p className="text-gray-700 leading-relaxed">
                Track earnings, analyze trends, and build lasting relationships with detailed analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FAQ />

      {/* Enhanced Final CTA */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-primary-900 text-white relative overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-128 h-128 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-6xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 mb-8">
            <Scissors className="h-5 w-5 text-accent-400" />
            <span className="text-white/90 font-medium">Join the Movement</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-display font-bold mb-8">
            Be Bookable Today
            <br />
            <span className="bg-gradient-to-r from-accent-400 via-primary-400 to-accent-400 bg-clip-text text-transparent animate-gradient">
              Zero Membership
            </span>
          </h2>
          
          <p className="text-xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
            Launch free. Pay 1% only when you get booked. Start building your online presence and growing your business today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Link
              to="/signup?type=barber"
              className="group bg-gradient-to-r from-accent-500 to-accent-600 text-white px-10 py-5 rounded-2xl text-xl font-semibold hover:from-accent-600 hover:to-accent-700 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-premium-lg hover:shadow-2xl flex items-center justify-center space-x-3"
            >
              <Scissors className="h-6 w-6 group-hover:rotate-12 transition-transform" />
              <span>Create Your Page</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              to="/barbers"
              className="group bg-white/10 backdrop-blur-sm border border-white/20 text-white px-10 py-5 rounded-2xl text-xl font-semibold hover:bg-white/20 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-premium-lg hover:shadow-2xl flex items-center justify-center space-x-3"
            >
              <Star className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span>See Success Stories</span>
            </Link>
          </div>
          
          {/* Social Proof */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
                <div className="text-white font-semibold">No Setup Fees</div>
                <div className="text-white/70 text-sm">Start immediately</div>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
                <div className="text-white font-semibold">1% Per Booking</div>
                <div className="text-white/70 text-sm">Only when you earn</div>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
                <div className="text-white font-semibold">Own Your Data</div>
                <div className="text-white/70 text-sm">Export anytime</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;