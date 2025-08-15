import React, { useEffect, useState } from 'react';
import { Smartphone, Monitor, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// NOTE: images live in /public. Spaces must be URL-encoded.
const laptopImg = '/MU%20Laptop.png'; // laptop booking page
const phoneImgs = ['/MU%20Phone%201.png']; // phone screens

export default function HomeLiveDemo() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const ids = setInterval(() => setIdx((i) => (i + 1) % phoneImgs.length), 3500);
    return () => clearInterval(ids);
  }, []);

  return (
    <section className="relative bg-gradient-to-b from-gray-50 to-white py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-gray-600 bg-white">
              <span className="inline-flex items-center gap-1">
                <Monitor className="h-4 w-4" /> Barber dashboard
              </span>
              <span className="mx-2 text-gray-300">/</span>
              <span className="inline-flex items-center gap-1">
                <Smartphone className="h-4 w-4" /> Client booking
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-display font-bold text-gray-900 md:text-3xl">
              See exactly what your clients see — and what you control
            </h2>
            <p className="mt-2 text-gray-600">
              Instant online presence. Booking on the left. Your tools on the right. No membership.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/signup?type=barber"
              className="inline-flex items-center rounded-xl bg-black px-4 py-2 text-white font-semibold hover:opacity-90"
            >
              Create my page <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              to="/barbers"
              className="inline-flex items-center rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              Explore barbers
            </Link>
          </div>
        </div>

        {/* Demo canvas */}
        <div className="relative grid items-center gap-8 lg:grid-cols-2">
          {/* Laptop frame (dashboard / booking site) */}
          <div className="relative order-2 rounded-3xl border bg-white p-3 shadow-xl lg:order-1">
            <div className="absolute -top-3 left-4 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs text-gray-600 shadow-sm">
              <Monitor className="h-4 w-4" />
              Barber dashboard
            </div>
            <img
              src={laptopImg}
              alt="Kutable desktop view"
              className="w-full rounded-2xl border"
              loading="lazy"
            />
          </div>

          {/* Phone stack (auto-rotating client booking) */}
          <div className="relative order-1 lg:order-2">
            <div className="relative mx-auto w-[270px] sm:w-[300px]">
              {/* Back phone (depth) - only show if we have multiple images */}
              {phoneImgs.length > 1 && (
                <img
                  src={phoneImgs[(idx + phoneImgs.length - 1) % phoneImgs.length]}
                  alt="Kutable booking (previous)"
                  className="absolute -left-6 top-6 w-full rotate-[-4deg] rounded-[22px] border bg-white opacity-60 blur-[0.3px]"
                  style={{ transformOrigin: 'bottom left' }}
                  loading="lazy"
                />
              )}
              {/* Front phone */}
              <img
                src={phoneImgs[idx]}
                alt="Kutable booking (current)"
                className="relative w-full rounded-[22px] border bg-white shadow-2xl"
                loading="lazy"
              />
            </div>

            <div className="mt-4 text-center text-sm text-gray-600">
              Client booking — tap services, pick a time, pay online.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}