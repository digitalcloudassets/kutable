import React from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'Is there a monthly membership?',
    a: 'No. Kutable has no monthly membership and no setup fee. We charge a simple 1% platform fee per booking.',
  },
  {
    q: 'How fast can I go live?',
    a: 'Most barbers publish a basic page in minutes. Add your services, hours, and connect payouts to start taking bookings.',
  },
  {
    q: 'Do I keep my client list?',
    a: 'Yes. Your clients are yours. You can export your data any time.',
  },
  {
    q: 'How do payouts work?',
    a: 'Kutable uses Stripe Connect. Payments go to your connected account with standard or instant payout options.',
  },
  {
    q: 'What about payment processing fees?',
    a: 'Stripe charges their standard 2.9% + $0.30 per transaction for payment processing. This is separate from Kutable\'s 1% platform fee.',
  },
  {
    q: 'Can I customize my booking page?',
    a: 'Yes! Upload photos, set your bio, customize services and pricing, and set your availability. Your page reflects your brand.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Frequently asked questions</h2>
        <div className="space-y-4">
          {faqs.map(({ q, a }, index) => (
            <div key={q} className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-4">{q}</span>
                <ChevronDown 
                  className={`h-5 w-5 text-gray-500 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`} 
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6">
                  <p className="text-gray-700 leading-relaxed">{a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}