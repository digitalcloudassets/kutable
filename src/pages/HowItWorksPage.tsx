import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Calendar, 
  CreditCard, 
  Scissors, 
  Star, 
  Clock,
  Shield,
  CheckCircle,
  ArrowRight,
  MessageSquare,
  MapPin,
  UserPlus
} from 'lucide-react';

const HowItWorksPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 page-container">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20 -mt-24 pt-44">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            How Kutable Works
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            The modern way to book barber appointments. Simple, fast, and secure.
          </p>
        </div>
      </section>

      {/* For Customers Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">For Customers</h2>
            <p className="text-xl text-gray-600">Book your perfect cut in just 3 easy steps</p>
          </div>

          <div className="space-y-16">
            {/* Step 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-16">
              <div className="lg:w-1/2">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <span className="text-2xl font-bold text-orange-600">1</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Find Your Perfect Barber</h3>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  Browse our verified directory of professional barbers in your area. View their portfolios, 
                  read authentic reviews, and check their specialties to find the perfect match for your style.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-700">Browse portfolios and work samples</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-700">Read verified customer reviews</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-700">Filter by location and specialty</span>
                  </li>
                </ul>
              </div>
              <div className="lg:w-1/2">
                <div className="bg-gray-100 rounded-2xl p-8">
                  <div className="flex items-center space-x-3 mb-4">
                    <Search className="h-6 w-6 text-orange-500" />
                    <div className="flex-1 bg-white rounded-xl p-4 border">
                      <span className="text-gray-500">Search barbers...</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {['Elite Cuts', 'Style Masters', 'Fresh Fades', 'Classic Cuts'].map((name) => (
                      <div key={name} className="bg-white rounded-xl p-4 border">
                        <div className="w-full h-20 bg-gray-200 rounded-lg mb-3"></div>
                        <h4 className="font-medium text-gray-900">{name}</h4>
                        <div className="flex items-center space-x-1 mt-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-xs text-gray-600">4.8 (24)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-16">
              <div className="lg:order-2">
                <div className="lg:w-1/2">
                  <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                    <span className="text-2xl font-bold text-orange-600">2</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Book Instantly</h3>
                  <p className="text-gray-600 text-lg leading-relaxed mb-6">
                    Select your preferred service, choose from available time slots, and secure your appointment 
                    with instant payment. No phone calls, no waiting on hold – just simple, fast booking.
                  </p>
                  <ul className="space-y-4">
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-gray-700">Real-time availability calendar</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-gray-700">Secure payment processing</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-gray-700">Instant confirmation via SMS</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="lg:order-1">
                <div className="bg-gray-100 rounded-2xl p-8">
                  <div className="bg-white rounded-xl p-6 mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Select Service</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <span className="text-gray-800">Haircut</span>
                        <span className="font-medium">$35</span>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded-lg">
                        <span className="text-gray-600">Beard Trim</span>
                        <span className="text-gray-600">$15</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-6">
                    <h4 className="font-medium text-gray-900 mb-3">Available Times</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {['10:00', '10:30', '11:00', '11:30', '12:00', '12:30'].map((time) => (
                        <button
                          key={time}
                          className="p-3 text-sm border rounded-lg hover:border-orange-500 transition-colors"
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-16">
              <div className="lg:w-1/2">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <span className="text-2xl font-bold text-orange-600">3</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Get Your Cut</h3>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  Show up at your scheduled time and enjoy professional service. You'll receive reminder 
                  notifications, and your barber will have all your details ready for a seamless experience.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-700">24-hour reminder notifications</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-700">Easy rescheduling and cancellation</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-700">Rate and review your experience</span>
                  </li>
                </ul>
              </div>
              <div className="lg:w-1/2">
                <div className="bg-gray-100 rounded-2xl p-8">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">SMS Confirmation</span>
                    </div>
                    <p className="text-sm text-green-700">
                      🎉 Booking Confirmed! Your Haircut at Elite Cuts is set for Tomorrow at 2:00 PM. 
                      Total: $35. We'll remind you 24hrs before!
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                        <Scissors className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Your appointment is ready!</p>
                        <p className="text-sm text-gray-600">Tomorrow at 2:00 PM</p>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button className="flex-1 bg-orange-500 text-white py-3 px-4 rounded-lg text-sm font-medium">
                        Get Directions
                      </button>
                      <button className="flex-1 border border-gray-300 py-3 px-4 rounded-lg text-sm font-medium">
                        Call Barber
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Barbers Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">For Barbers</h2>
            <p className="text-xl text-gray-600">Grow your business with professional booking management</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Claim Your Profile */}
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserPlus className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Claim Your Profile</h3>
              <p className="text-gray-600 leading-relaxed">
                Find your business in our directory and claim it for free. Verify your identity 
                and gain control of your online presence.
              </p>
            </div>

            {/* Set Up Services */}
            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Manage Your Business</h3>
              <p className="text-gray-600 leading-relaxed">
                Add your services, set pricing, upload photos of your work, and configure 
                your availability. Full control over your booking experience.
              </p>
            </div>

            {/* Start Earning */}
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Start Earning</h3>
              <p className="text-gray-600 leading-relaxed">
                Connect your bank account and start accepting online payments. Money goes 
                directly to you minus a small platform fee.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Kutable?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="text-center">
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Secure & Reliable</h3>
              <p className="text-gray-600">
                Bank-level security with encrypted payments and verified barber profiles for your peace of mind.
              </p>
            </div>

            <div className="text-center">
              <Clock className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Save Time</h3>
              <p className="text-gray-600">
                No more phone tag or waiting in line. Book instantly and get confirmation right away.
              </p>
            </div>

            <div className="text-center">
              <Star className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Quality Guaranteed</h3>
              <p className="text-gray-600">
                All barbers are verified professionals with authentic reviews from real customers.
              </p>
            </div>

            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Stay Connected</h3>
              <p className="text-gray-600">
                Get SMS confirmations, reminders, and updates so you never miss an appointment.
              </p>
            </div>

            <div className="text-center">
              <MapPin className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Find Nearby</h3>
              <p className="text-gray-600">
                Discover great barbers in your area with location-based search and directions.
              </p>
            </div>

            <div className="text-center">
              <CreditCard className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Flexible Payment</h3>
              <p className="text-gray-600">
                Pay with any major credit card. Some services offer deposit options for convenience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands who trust Kutable for their grooming needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              to="/barbers"
              className="bg-orange-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Search className="h-5 w-5" />
              <span>Find Barbers</span>
            </Link>
            <Link
              to="/signup"
              className="border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-gray-900 transition-colors flex items-center justify-center space-x-2"
            >
              <Scissors className="h-5 w-5" />
              <span>Join as Barber</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorksPage;