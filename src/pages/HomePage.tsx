import React from 'react';
import Hero from '../components/Home/Hero';
import FeaturedBarbers from '../components/Home/FeaturedBarbers';
import { 
  Zap, 
  Shield, 
  Clock, 
  Star, 
  ArrowRight,
  Smartphone,
  CreditCard,
  Users,
  CheckCircle,
  Target,
  Scissors,
  Calendar,
  Search,
  Play,
  DollarSign,
  User
} from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      
      {/* How It Works Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-white"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-primary-50 text-primary-700 rounded-full px-6 py-3 mb-6">
              <Target className="h-5 w-5" />
              <span className="font-medium">Built for Barbers</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Grow Your Business in 3 Steps
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get online, accept bookings, and grow your customer base with professional tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-premium-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
                <div className="absolute -inset-4 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Claim Your Profile</h3>
              <p className="text-gray-600 leading-relaxed">
                Find your business in our directory and claim it for free. Set up your 
                professional profile with services, pricing, and photos.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-premium-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl font-bold text-white">2</span>
                </div>
                <div className="absolute -inset-4 bg-gradient-to-r from-accent-500 to-primary-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Accept Bookings</h3>
              <p className="text-gray-600 leading-relaxed">
                Connect your Stripe account and start accepting online bookings. Customers can 
                book 24/7 with instant payment and automatic confirmations.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-premium-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl font-bold text-white">3</span>
                </div>
                <div className="absolute -inset-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Get Paid & Grow</h3>
              <p className="text-gray-600 leading-relaxed">
                Money goes directly to your bank account. Track earnings, manage bookings, 
                and build customer relationships through our professional dashboard.
              </p>
            </div>
          </div>

          {/* Demo Preview */}
          <div className="relative">
            <div className="bg-gray-50 rounded-2xl p-8 shadow-premium">
              <div className="flex items-center space-x-3 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <span className="text-gray-600 font-medium">Barber Dashboard Preview</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-primary-50 rounded-2xl p-6 text-center border border-primary-100">
                  <div className="bg-primary-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Your Profile</h4>
                  <p className="text-gray-600 text-sm">Professional online presence</p>
                </div>
                
                <div className="bg-accent-50 rounded-2xl p-6 text-center border border-accent-100">
                  <div className="bg-accent-500 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Online Bookings</h4>
                  <p className="text-gray-600 text-sm">24/7 booking with instant payment</p>
                </div>
                
                <div className="bg-yellow-50 rounded-2xl p-6 text-center border border-yellow-200">
                  <div className="bg-yellow-500 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Get Paid</h4>
                  <p className="text-gray-600 text-sm">Direct bank deposits</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FeaturedBarbers />
    </div>
  );
};

export default HomePage;