import React from 'react';
import { User, Wrench, Link as LinkIcon, CalendarCheck } from 'lucide-react';

const steps = [
  {
    step: '1',
    title: 'Grab your link',
    body: 'Choose your page name and claim your shareable booking link.',
    Icon: LinkIcon,
  },
  {
    step: '2',
    title: 'Add services & hours',
    body: 'Set your prices, durations, and availability from your phone.',
    Icon: Wrench,
  },
  {
    step: '3',
    title: 'Connect payouts',
    body: 'Secure Stripe Connect setup so money goes straight to you.',
    Icon: User,
  },
  {
    step: '4',
    title: 'Start getting booked',
    body: 'Share your link on Instagram, TikTok, or your bio — clients can book 24/7.',
    Icon: CalendarCheck,
  },
];

export default function HowItWorks() {
  return (
    <section className="py-12 md:py-16 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">How it works</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-4">
          {steps.map(({ step, title, body, Icon }) => (
            <div key={step} className="rounded-2xl border border-gray-200 bg-white p-6 text-center group hover:border-primary-300 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-white text-lg font-bold group-hover:scale-110 transition-transform">
                  {step}
                </div>
                <Icon className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg mb-3">{title}</h3>
              <p className="text-gray-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}