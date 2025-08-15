import React from 'react';
import Hero from '../components/Home/Hero';
import ValueProps from '../components/Home/ValueProps';
import HowItWorks from '../components/Home/HowItWorks';
import FAQ from '../components/Home/FAQ';
import { Link } from 'react-router-dom';
import { ArrowRight, Scissors, CheckCircle } from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <ValueProps />
      <HowItWorks />
      
      {/* Simple pricing section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-xl text-gray-600 mb-12">No contracts. No hidden fees. No monthly charges.</p>
          
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="text-6xl font-bold text-gray-900 mb-2">1%</div>
              <div className="text-xl text-gray-600">per completed booking</div>
            </div>
            
            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700">Free to set up and use</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700">Only pay when you get booked</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700">Money goes directly to your bank</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700">Cancel anytime, keep your data</span>
              </div>
            </div>
            
            <div className="mt-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <strong>Example:</strong> $50 haircut → You keep $49.50 (after 1% platform fee)
                <br />
                <span className="text-blue-600">Stripe processing fees (2.9% + $0.30) are separate and industry standard</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FAQ />

      {/* Final CTA */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Be bookable today — with zero membership
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Launch free. Pay 1% only when you get booked. Start building your online presence now.
          </p>
          <Link
            to="/signup?type=barber"
            className="inline-flex items-center bg-white text-gray-900 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-premium-lg"
          >
            <Scissors className="h-6 w-6 mr-3" />
            <span>Create my page</span>
            <ArrowRight className="h-5 w-5 ml-3" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;