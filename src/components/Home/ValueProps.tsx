import React from 'react';
import { Scissors, Users, Bell, Shield, DownloadCloud, Sparkles } from 'lucide-react';

const items = [
  {
    title: 'Instant online presence',
    desc: 'Claim your link, add services and hours, and start taking bookings in minutes.',
    Icon: Sparkles,
  },
  {
    title: 'No monthly membership',
    desc: 'There\'s no subscription and no setup fee. Kutable charges a simple 1% per booking.',
    Icon: DownloadCloud,
  },
  {
    title: 'Keep your client list',
    desc: 'Own your book. Export your data anytime — you\'re never locked in.',
    Icon: Users,
  },
  {
    title: 'Automatic reminders',
    desc: 'Reduce no-shows with confirmations and reminders baked right in.',
    Icon: Bell,
  },
  {
    title: 'Built for solo barbers',
    desc: 'Clean, mobile-first pages that showcase your work and make it easy to book.',
    Icon: Scissors,
  },
  {
    title: 'Secure by default',
    desc: 'Stripe Connect for payments and bank-level security for data.',
    Icon: Shield,
  },
];

export default function ValueProps() {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Why barbers choose Kutable</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ title, desc, Icon }) => (
            <div key={title} className="rounded-2xl border border-gray-200 p-6 hover:shadow-sm transition-all duration-200 bg-white group hover:border-primary-300">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-gray-100 p-3 group-hover:bg-primary-100 transition-colors">
                  <Icon className="h-6 w-6 text-gray-600 group-hover:text-primary-600 transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">{title}</h3>
                  <p className="text-gray-600 leading-relaxed">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}