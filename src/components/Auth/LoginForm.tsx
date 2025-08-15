import React from 'react';
import {
  Search, Star, MapPin, Scissors, Calendar, Clock, CreditCard,
  MessageSquare, Shield, CheckCircle, Users, TrendingUp, Map, Phone,
  ArrowRight, Building, Sparkles, Eye, DollarSign, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

const HowItWorksPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 page-container">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20 -mt-24 pt-44">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 mb-8">
            <Sparkles className="h-5 w-5 text-accent-400" />
            <span className="text-white/90 font-medium">How Kutable Works</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
            The Modern Way to Book 
            <br />
            <span className="bg-gradient-to-r from-accent-400 via-primary-400 to-accent-400 bg-clip-text text-transparent">
              Barber Appointments
            </span>
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto">
            Simple, fast, and secure booking for both customers and barbers. 
            No contracts, no setup fees.
          </p>
        </div>
      </section>

      {/* For Customers - 3 Step Process */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-primary-50 text-primary-700 rounded-full px-6 py-3 mb-8">
              <Users className="h-5 w-5" />
              <span className="font-medium">For Customers</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-6">
              Book Your Perfect Cut in 3 Easy Steps
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover, book, and pay for professional barber services in minutes
            </p>
          </div>

          <div className="space-y-24">
            {/* Step 1: Find */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-premium">
                    1
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-bold text-gray-900">Find Your Perfect Barber</h3>
                    <p className="text-gray-600 font-medium">Browse verified professionals in your area</p>
                  </div>
                </div>
                
                <p className="text-lg text-gray-700 leading-relaxed">
                  Browse our verified directory of professional barbers. View portfolios, read authentic reviews, 
                  and check specialties to find the best match for your style.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                    <span className="text-gray-700 font-medium">Browse portfolios and work samples</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                    <span className="text-gray-700 font-medium">Read verified customer reviews</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                    <span className="text-gray-700 font-medium">Filter by location and specialty</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Search Mockup */}
              <div className="card-premium p-8 max-w-lg mx-auto lg:mx-0">
                <div className="space-y-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <div className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 font-medium">
                      Search barbers...
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: 'Elite Cuts', rating: '4.2', reviews: '24' },
                      { name: 'Style Masters', rating: '4.3', reviews: '18' },
                      { name: 'Fresh Fades', rating: '4.4', reviews: '31' },
                      { name: 'Classic Cuts', rating: '4.5', reviews: '42' }
                    ].map((barber, i) => (
                      <div key={barber.name} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="h-20 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 mb-3"></div>
                        <h4 className="font-semibold text-gray-900 text-sm mb-2">{barber.name}</h4>
                        <div className="flex items-center space-x-1 text-sm">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="font-medium text-gray-900">{barber.rating}</span>
                          <span className="text-gray-500">({barber.reviews})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Book */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Enhanced Booking Mockup */}
              <div className="card-premium p-8 max-w-lg mx-auto lg:mx-0 order-2 lg:order-1">
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Select Service</h4>
                    <div className="space-y-3">
                      {[
                        { name: 'Haircut', price: '$35', duration: '30 min' },
                        { name: 'Beard Trim', price: '$20', duration: '15 min' }
                      ].map((service) => (
                        <div key={service.name} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-300 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{service.name}</p>
                              <p className="text-sm text-gray-500">{service.duration}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-gray-900">{service.price}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Available Times</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {['10:00', '10:30', '11:00', '11:30', '12:00', '12:30'].map((time, index) => (
                        <button
                          key={time}
                          className={`p-3 rounded-xl border font-medium transition-all ${
                            index === 2 
                              ? 'bg-primary-500 text-white border-primary-500 shadow-md' 
                              : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8 order-1 lg:order-2">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-premium">
                    2
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-bold text-gray-900">Book Instantly</h3>
                    <p className="text-gray-600 font-medium">Choose service and time, then pay securely</p>
                  </div>
                </div>
                
                <p className="text-lg text-gray-700 leading-relaxed">
                  Choose your service and preferred time slot, then secure your appointment with instant payment. 
                  No phone calls required - just quick, simple booking.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                    <span className="text-gray-700 font-medium">Real-time availability calendar</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                    <span className="text-gray-700 font-medium">Secure payment processing</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                    <span className="text-gray-700 font-medium">Instant confirmation via SMS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Enjoy */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-premium">
                    3
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-bold text-gray-900">Get Your Cut</h3>
                    <p className="text-gray-600 font-medium">Show up and enjoy professional service</p>
                  </div>
                </div>
                
                <p className="text-lg text-gray-700 leading-relaxed">
                  Show up at your scheduled time and enjoy professional service. You'll get reminders, 
                  and your barber has everything ready for a smooth experience.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                    <span className="text-gray-700 font-medium">24-hour reminder notifications</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                    <span className="text-gray-700 font-medium">Easy rescheduling and cancellation</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                    <span className="text-gray-700 font-medium">Rate and review your experience</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Confirmation Mockup */}
              <div className="card-premium p-8 max-w-lg mx-auto lg:mx-0">
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="bg-emerald-500 p-2 rounded-xl">
                        <MessageSquare className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-800">SMS Confirmation</h4>
                        <p className="text-emerald-600 text-sm">Just received</p>
                      </div>
                    </div>
                    <p className="text-emerald-800 leading-relaxed">
                      Booking confirmed for <span className="font-bold">tomorrow at 2:30 PM</span>. 
                      We'll remind you 24 hours before your appointment.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Your Appointment</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Service:</span>
                        <span className="font-medium text-gray-900">Classic Haircut</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium text-gray-900">Tomorrow, 2:30 PM</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-medium text-gray-900">Elite Cuts</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-3 mt-6">
                      <button className="flex-1 bg-primary-500 text-white py-3 px-4 rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center space-x-2">
                        <Map className="h-4 w-4" />
                        <span>Directions</span>
                      </button>
                      <button className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span>Call</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Barbers - Simple 3 Cards */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-accent-50 text-accent-700 rounded-full px-6 py-3 mb-8">
              <Scissors className="h-5 w-5" />
              <span className="font-medium">For Barbers</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-6">
              Grow Your Business with Professional Tools
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage bookings, accept payments, and build your reputation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-premium p-8 text-center group hover:scale-[1.02] transition-all duration-300">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium group-hover:scale-110 transition-transform duration-300">
                <Building className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-4">Create Your Profile</h3>
              <p className="text-gray-600 leading-relaxed">
                Set up your professional profile with services, pricing, and availability. 
                Show off your work with a photo gallery.
              </p>
            </div>

            <div className="card-premium p-8 text-center group hover:scale-[1.02] transition-all duration-300">
              <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-4">Connect Payments</h3>
              <p className="text-gray-600 leading-relaxed">
                Connect your bank account via Stripe Connect. Get paid automatically 
                when customers book appointments.
              </p>
            </div>

            <div className="card-premium p-8 text-center group hover:scale-[1.02] transition-all duration-300">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-4">Start Earning</h3>
              <p className="text-gray-600 leading-relaxed">
                Share your booking link and start accepting appointments. 
                Track your earnings and grow your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Kutable */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-orange-50 text-orange-700 rounded-full px-6 py-3 mb-8">
              <Shield className="h-5 w-5" />
              <span className="font-medium">Platform Benefits</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-6">
              Why Choose Kutable?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to run a modern barbering business, backed by enterprise-grade security
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                icon: Shield, 
                title: 'Secure & Reliable', 
                desc: 'Bank-level security with encrypted payments and verified barber profiles.',
                color: 'from-red-500 to-red-600'
              },
              { 
                icon: Clock, 
                title: 'Save Time', 
                desc: 'No more phone tag. Book instantly and get confirmation right away.',
                color: 'from-yellow-500 to-yellow-600'
              },
              { 
                icon: Star, 
                title: 'Quality Guaranteed', 
                desc: 'Barbers are verified pros with authentic reviews from real customers.',
                color: 'from-purple-500 to-purple-600'
              },
              { 
                icon: MessageSquare, 
                title: 'Stay Connected', 
                desc: 'SMS confirmations, reminders, and updates keep you on schedule.',
                color: 'from-blue-500 to-blue-600'
              },
              { 
                icon: MapPin, 
                title: 'Find Nearby', 
                desc: 'Discover great barbers with location-based search and directions.',
                color: 'from-green-500 to-green-600'
              },
              { 
                icon: Zap, 
                title: 'Instant Payments', 
                desc: 'Pay with any major card. Secure processing with instant confirmation.',
                color: 'from-indigo-500 to-indigo-600'
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card-premium p-8 group hover:scale-[1.02] transition-all duration-300">
                <div className={`bg-gradient-to-br ${color} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-display font-bold text-gray-900 mb-4 text-center">{title}</h3>
                <p className="text-gray-600 leading-relaxed text-center">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 mb-8">
            <Sparkles className="h-5 w-5 text-accent-400" />
            <span className="text-white/90 font-medium">Ready to Get Started?</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-8">
            Join Kutable and Be 
            <br />
            <span className="bg-gradient-to-r from-accent-400 via-primary-400 to-accent-400 bg-clip-text text-transparent animate-gradient">
              Bookable Today
            </span>
          </h2>
          
          <p className="text-xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
            Create your professional booking page in minutes. Zero membership fees - pay only 1% when you get booked.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              to="/signup?type=barber"
              className="group bg-gradient-to-r from-accent-500 to-accent-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:from-accent-600 hover:to-accent-700 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-premium-lg hover:shadow-2xl flex items-center justify-center space-x-3"
            >
              <Scissors className="h-6 w-6 group-hover:rotate-12 transition-transform" />
              <span>Create Your Page</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              to="/barbers"
              className="group bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-white/20 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-premium-lg hover:shadow-2xl flex items-center justify-center space-x-3"
            >
              <Eye className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span>See Examples</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorksPage;