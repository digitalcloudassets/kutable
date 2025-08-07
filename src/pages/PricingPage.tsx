import React from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  CheckCircle, 
  CreditCard, 
  Users, 
  Scissors, 
  Star,
  ArrowRight,
  Calculator,
  TrendingUp,
  Shield,
  MessageSquare,
  BarChart3,
  Clock,
  Settings
} from 'lucide-react';

const PricingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 page-container">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20 -mt-24 pt-44">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Built for Barbers, Priced for Success
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            No setup fees, no monthly subscriptions. Share your profile and only pay when you earn.
          </p>
        </div>
      </section>

      {/* For Customers */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Scissors className="h-16 w-16 text-orange-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Professional Profile</h2>
            <p className="text-xl text-gray-600">Start with a free professional directory listing</p>
          </div>

          <div className="bg-white border-2 border-blue-200 rounded-2xl p-8 shadow-lg">
            <div className="text-center mb-8">
              <div className="text-6xl font-bold text-blue-600 mb-2">$0</div>
              <div className="text-xl text-gray-600">Free professional listing</div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <span className="text-gray-700 text-lg">Professional business profile in our directory</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <span className="text-gray-700 text-lg">Display your contact information and services</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <span className="text-gray-700 text-lg">Customer reviews and ratings showcase</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <span className="text-gray-700 text-lg">Share your profile link with customers</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <span className="text-gray-700 text-lg">No setup fees or monthly charges</span>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link
                to="/signup?type=barber"
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
              >
                <span>Create Your Profile</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* For Barbers */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <CreditCard className="h-16 w-16 text-orange-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Accept Online Bookings</h2>
            <p className="text-xl text-gray-600">Upgrade to accept payments and bookings through your profile</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Free Plan */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-lg">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Directory Listing</h3>
                <div className="text-5xl font-bold text-gray-900 mb-2">FREE</div>
                <div className="text-gray-600">Forever</div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">Professional business listing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">Contact information and business details</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">Shareable profile link for your customers</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">Customer reviews and ratings display</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">Mobile-optimized for easy sharing</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">Perfect for establishing your online presence</p>
                <Link
                  to="/signup?type=barber"
                  className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium block"
                >
                  Create Your Profile
                </Link>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="bg-white border-2 border-orange-500 rounded-2xl p-8 shadow-lg relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Recommended
                </span>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Online Booking</h3>
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-3xl font-bold text-orange-600">4%</span>
                  <span className="text-gray-600 ml-2">per transaction</span>
                </div>
                <div className="text-sm text-gray-500">Only charged when customers book and pay</div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">Everything in Directory Listing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">Accept online bookings through your profile</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">Get paid automatically with secure processing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">Automatic SMS confirmations to customers</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">Set your own services and pricing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">Showcase your work with photo gallery</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">Manage your availability and schedule</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">Track earnings and customer analytics</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">Start accepting bookings immediately</p>
                <Link
                  to="/signup?type=barber"
                  className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium block"
                >
                  Start Accepting Bookings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fee Breakdown */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Calculator className="h-16 w-16 text-green-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Simple, transparent pricing you can understand</p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Customer Books</h3>
                <div className="text-3xl font-bold text-blue-600 mb-2">1%</div>
                <p className="text-gray-600 text-sm">
                  Small platform fee when customers book through your profile
                </p>
              </div>

              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure Processing</h3>
                <div className="text-3xl font-bold text-purple-600 mb-2">2.9%</div>
                <p className="text-gray-600 text-sm">
                  + $0.30 industry-standard payment processing (handled by Stripe)
                </p>
              </div>

              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">You Keep</h3>
                <div className="text-3xl font-bold text-green-600 mb-2">~96%</div>
                <p className="text-gray-600 text-sm">
                  Money goes directly to your bank account
                </p>
              </div>
            </div>

            {/* Example Calculation */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">Example: $50 Haircut</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Service Price</span>
                  <span className="font-medium text-gray-900">$50.00</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Platform Fee (1%)</span>
                  <span className="text-red-600">-$0.50</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Stripe Fee (2.9% + $0.30)</span>
                  <span className="text-red-600">-$1.75</span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">You Receive</span>
                  <span className="text-2xl font-bold text-green-600">$47.75</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What You Get</h2>
            <p className="text-xl text-gray-600">Professional tools included with online booking</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Communication</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Automatic booking confirmations</li>
                <li>• SMS reminders sent to customers</li>
                <li>• Professional communication tools</li>
                <li>• Customer feedback collection</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Get Paid</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Customers pay when they book</li>
                <li>• Money deposited to your bank automatically</li>
                <li>• Option to require deposits</li>
                <li>• No waiting for payment</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Scissors className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Professional Presence</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Professional profile you can share anywhere</li>
                <li>• Showcase your work with photos</li>
                <li>• Build your reputation with reviews</li>
                <li>• Easy-to-remember profile URL</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Business Insights</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Track your earnings and trends</li>
                <li>• See your most popular services</li>
                <li>• Export data for your records</li>
                <li>• Monitor customer satisfaction</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Save Time</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• No more phone tag with customers</li>
                <li>• Automated appointment confirmations</li>
                <li>• Reduce no-shows with reminders</li>
                <li>• Focus on cutting, not scheduling</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Settings className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Full Control</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Set your own prices and services</li>
                <li>• Control your availability</li>
                <li>• Manage bookings on your schedule</li>
                <li>• Your business, your rules</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison with Competitors */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Barbers Choose Kutable</h2>
            <p className="text-xl text-gray-600">Simple, transparent, and built for your success</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-orange-600 bg-orange-50">
                    Kutable
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">
                    Other Platforms
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">Setup Cost</td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-green-600">$0</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">$99-500+</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">Monthly Subscription</td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-green-600">$0</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">$29-200/mo</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">Per Booking Fee</td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-orange-600">4%</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">3-5%</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">Contract Required</td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-green-600">No</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">Usually</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">Share Your Profile</td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-green-600">Free</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">Limited</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">SMS Notifications</td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-green-600">None</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">Extra</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Common Questions</h2>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                When do I get charged the 4%?
              </h3>
              <p className="text-gray-600">
                Only when a customer books and pays through your profile. No bookings = no fees. 
                The 4% is automatically deducted from each payment before it reaches your bank account.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                How do I get customers to my profile?
              </h3>
              <p className="text-gray-600">
                Share your unique profile link with customers via social media, business cards, or text message. 
                Customers can also discover you through our directory. Your profile works like a mini-website for your business.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                How quickly do I get paid?
              </h3>
              <p className="text-gray-600">
                Payments are processed through Stripe and typically arrive in your bank account within 2-3 business days. 
                Track all payments and earnings in your dashboard.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Can I still take walk-ins and cash customers?
              </h3>
              <p className="text-gray-600">
                Absolutely! Kutable works alongside your existing business. Take walk-ins, accept cash, 
                use your profile for online bookings - whatever works best for you. You're in complete control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-6">Ready to Modernize Your Business?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join barbers who are making booking easier for their customers and growing their business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup?type=barber"
              className="bg-orange-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Create Your Profile Free
            </Link>
            <Link
              to="/support"
              className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-gray-900 transition-colors"
            >
              Questions? Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;