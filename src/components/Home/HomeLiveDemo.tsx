import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// NOTE: images live in /public. Spaces must be URL-encoded.
const laptopImg = '/Kut%205.png'; // laptop booking page
const phoneImgs = ['/Kut%202.png', '/Kut%203.png', '/Kut%204.png']; // phone screens

export default function HomeLiveDemo() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const ids = setInterval(() => setIdx((i) => (i + 1) % phoneImgs.length), 3500);
    return () => clearInterval(ids);
  }, []);

  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Simple, clean header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
            Your business page. Live in minutes.
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Clean, mobile-first booking that works everywhere. Your brand, your way.
          </p>
        </div>

        {/* Minimal demo layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Desktop view - clean, minimal */}
          <div className="text-center lg:text-left">
            <div className="inline-block">
              <img
                src={laptopImg}
                alt="Barber dashboard view"
                className="w-full max-w-lg rounded-2xl shadow-premium"
                loading="lazy"
              />
              <p className="text-sm text-gray-500 mt-4 font-medium">
                Your dashboard — manage everything from your phone
              </p>
            </div>
          </div>

          {/* Mobile view - prominent but clean */}
          <div className="text-center lg:text-right">
            <div className="inline-block relative">
              <img
                src={phoneImgs[idx]}
                alt="Client booking experience"
                className="w-full max-w-sm rounded-3xl shadow-premium-lg"
                loading="lazy"
              />
              <p className="text-sm text-gray-500 mt-4 font-medium">
                Customer experience — tap, book, pay, done
              </p>
            </div>
          </div>
        </div>

        {/* Simple CTA */}
        <div className="text-center mt-16">
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Link
              to="/signup?type=barber"
              className="btn-primary inline-flex items-center justify-center"
            >
              <span>Start your page</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              to="/barbers"
              className="btn-secondary inline-flex items-center justify-center"
            >
              <span>See examples</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}