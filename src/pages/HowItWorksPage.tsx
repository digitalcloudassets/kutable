import React from 'react';
import {
  Search, Star, MapPin, Scissors, Calendar, Clock, CreditCard,
  MessageSquare, Shield, CheckCircle2, Users, TrendingUp, Map, Phone
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Section = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <section className={`py-16 md:py-24 ${className}`}>{children}</section>
);

const Container = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
);

const Pill = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center gap-2 rounded-full border bg-white/80 px-4 py-1.5 text-sm text-gray-700 shadow-sm">
    {children}
  </div>
);

const StepCard = ({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) => (
  <div
    className={`rounded-2xl border bg-white p-5 sm:p-6 shadow-sm ${align === 'right' ? 'sm:ml-auto' : 'sm:mr-auto'}`}
  >
    {children}
  </div>
);

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2 text-gray-700">
    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
    <span>{children}</span>
  </li>
);

const HowItWorksPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white page-container">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800 -mt-24 pt-44">
        <Container className="py-20 md:py-28">
          <div className="text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm text-white/90">
              How Kutable Works
            </div>
            <h1 className="mt-4 text-4xl font-display font-extrabold text-white md:text-5xl">
              The modern way to book barber appointments
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
              Simple, fast, and secure — for customers and barbers.
            </p>
          </div>
        </Container>
      </header>

      {/* For Customers */}
      <Section className="bg-white">
        <Container>
          <h2 className="text-center text-2xl font-display font-bold text-gray-900 md:text-3xl">
            For Customers
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-gray-600">
            Book your perfect cut in just 3 easy steps.
          </p>

          <div className="mt-12 space-y-16 md:space-y-20">
            {/* Step 1 */}
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-semibold">
                  1
                </div>
                <h3 className="mt-4 text-xl font-bold text-gray-900">Find Your Perfect Barber</h3>
                <p className="mt-2 text-gray-600">
                  Browse our verified directory of professional barbers in your area. View portfolios,
                  read authentic reviews, and check specialties to find the best match for your style.
                </p>
                <ul className="mt-4 space-y-2">
                  <Bullet>Browse portfolios and work samples</Bullet>
                  <Bullet>Read verified customer reviews</Bullet>
                  <Bullet>Filter by location and specialty</Bullet>
                </ul>
              </div>
              <StepCard align="right">
                <div className="rounded-xl border bg-gray-50 p-4">
                  <div className="mb-3 flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-gray-600">
                    <Search className="h-4 w-4" /> Search barbers…
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {['Elite Cuts', 'Style Masters', 'Fresh Fades', 'Classic Cuts'].map((name, i) => (
                      <div key={name} className="rounded-xl border bg-white p-3">
                        <div className="h-16 rounded-lg bg-gray-100" />
                        <div className="mt-2 font-medium">{name}</div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Star className="h-3.5 w-3.5 text-yellow-500" />
                          4.{i + 2} • (24)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </StepCard>
            </div>

            {/* Step 2 */}
            <div className="grid items-center gap-8 md:grid-cols-2">
              <StepCard align="left">
                <div className="rounded-xl border bg-gray-50 p-4">
                  <div className="rounded-lg border bg-white p-3">
                    <div className="mb-2 text-sm text-gray-600">Select Service</div>
                    {[
                      { name: 'Haircut', price: '$35' },
                      { name: 'Beard Trim', price: '$20' },
                    ].map((s) => (
                      <div
                        key={s.name}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                      >
                        <span>{s.name}</span>
                        <span className="font-semibold">{s.price}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3">
                    <div className="mb-2 text-sm text-gray-600">Available Times</div>
                    <div className="grid grid-cols-3 gap-2">
                      {['10:00', '10:30', '11:00', '11:30', '12:00', '12:30'].map((t) => (
                        <button
                          key={t}
                          className="rounded-lg border bg-white px-2 py-1 text-sm hover:bg-gray-50"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </StepCard>

              <div>
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-semibold">
                  2
                </div>
                <h3 className="mt-4 text-xl font-bold text-gray-900">Book Instantly</h3>
                <p className="mt-2 text-gray-600">
                  Choose your service and time, then secure your appointment with instant payment.
                  No phone calls. Just quick, simple booking.
                </p>
                <ul className="mt-4 space-y-2">
                  <Bullet>Real-time availability calendar</Bullet>
                  <Bullet>Secure payment processing</Bullet>
                  <Bullet>Instant confirmation via SMS</Bullet>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-semibold">
                  3
                </div>
                <h3 className="mt-4 text-xl font-bold text-gray-900">Get Your Cut</h3>
                <p className="mt-2 text-gray-600">
                  Show up at your scheduled time and enjoy professional service. You'll get reminders,
                  and your barber has everything ready for a smooth experience.
                </p>
                <ul className="mt-4 space-y-2">
                  <Bullet>24-hour reminder notifications</Bullet>
                  <Bullet>Easy rescheduling/cancellation</Bullet>
                  <Bullet>Rate and review your experience</Bullet>
                </ul>
              </div>

              <StepCard align="right">
                <div className="space-y-3">
                  <div className="rounded-xl border bg-emerald-50 p-3 text-sm text-emerald-800">
                    <div className="flex items-center gap-2 font-semibold">
                      <MessageSquare className="h-4 w-4" /> SMS Confirmation
                    </div>
                    <div className="mt-1">
                      Booking confirmed for <span className="font-medium">2:30 PM</span>. We'll remind
                      you 24 hrs before.
                    </div>
                  </div>
                  <div className="rounded-xl border bg-white p-3">
                    <div className="text-sm text-gray-600">Your appointment is ready tomorrow at 2:30 PM</div>
                    <div className="mt-2 flex gap-2">
                      <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
                        <Map className="mr-1 inline h-4 w-4" />
                        Get Directions
                      </button>
                      <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
                        <Phone className="mr-1 inline h-4 w-4" />
                        Call Barber
                      </button>
                    </div>
                  </div>
                </div>
              </StepCard>
            </div>
          </div>
        </Container>
      </Section>

      {/* For Barbers */}
      <Section className="bg-gray-50">
        <Container>
          <h2 className="text-center text-2xl font-display font-bold text-gray-900 md:text-3xl">
            For Barbers
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-gray-600">
            Grow your business with professional booking management.
          </p>

          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="group rounded-2xl border bg-white p-6 hover:shadow-md">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900">Join by Invitation</h3>
              <p className="mt-2 text-gray-600 text-sm">
                Apply to join our network of professional barbers.
              </p>
            </div>
            <div className="group rounded-2xl border bg-white p-6 hover:shadow-md">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white">
                <Scissors className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900">Manage Your Business</h3>
              <p className="mt-2 text-gray-600 text-sm">
                Add services, set pricing, upload photos, and control your schedule.
              </p>
            </div>
            <div className="group rounded-2xl border bg-white p-6 hover:shadow-md">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900">Start Earning</h3>
              <p className="mt-2 text-gray-600 text-sm">
                Connect your bank via Stripe Connect and get paid automatically.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Why Choose Kutable */}
      <Section className="bg-white">
        <Container>
          <h2 className="text-center text-2xl font-display font-bold text-gray-900 md:text-3xl">
            Why Choose Kutable?
          </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-gray-600">
            Everything you need to run a modern barbering business.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Shield, title: 'Secure & Reliable', desc: 'Bank-level security with encrypted payments and verified barber profiles.' },
              { icon: Clock, title: 'Save Time', desc: 'No more phone tag. Book instantly and get confirmation right away.' },
              { icon: Star, title: 'Quality Guaranteed', desc: 'Barbers are verified pros with authentic reviews from real customers.' },
              { icon: MessageSquare, title: 'Stay Connected', desc: 'SMS confirmations, reminders, and updates keep you on schedule.' },
              { icon: MapPin, title: 'Find Nearby', desc: 'Discover great barbers with location-based search and directions.' },
              { icon: TrendingUp, title: 'Flexible Payment', desc: 'Pay with any major card; some services support deposits.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group rounded-2xl border bg-white p-6 hover:shadow-md">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white group-hover:scale-105 transition">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* CTA */}
      <Section className="relative overflow-hidden bg-gray-900 text-white">
        <Container className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm text-white/90">
            Ready to Get Started?
          </div>
          <h2 className="mt-4 text-3xl font-display font-extrabold md:text-4xl">
            Join Kutable and be bookable today
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/80">
            Create your page in minutes. Zero membership — pay 1% only when you get booked.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/barbers"
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 font-semibold text-gray-900 hover:opacity-90"
            >
              <Search className="mr-2 h-4 w-4" />
              Find Barbers
            </Link>
            <Link
              to="/signup?type=barber"
              className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/20"
            >
              <Scissors className="mr-2 h-4 w-4" />
              Join as Barber
            </Link>
          </div>
        </Container>
      </Section>
    </div>
  );
};

export default HowItWorksPage;