import React from 'react';
import { Check } from 'lucide-react';

type Props = {
  current: number;      // 1-based index of the active step
  total?: number;       // default 5
  className?: string;   // optional extra classes from parent
};

export default function BookingStepper({ current, total = 5, className }: Props) {
  const steps = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <ol
      className={[
        // Centered container with a comfortable max width on phones
        'kutable-stepper mx-auto w-full max-w-[22rem]',
        // Lay out the dots/numbers
        'flex items-center justify-center gap-3 sm:gap-4',
        className ?? '',
      ].join(' ')}
      aria-label="Booking steps"
    >
      {steps.map((n) => {
        const done = n < current;
        const active = n === current;
        return (
          <li key={n} className="flex">
            <div
              className={[
                'kutable-step flex items-center justify-center rounded-full shadow-sm',
                'transition-all',
                active
                  ? 'bg-blue-600 text-white ring-2 ring-blue-600/20'
                  : done
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-600/20'
                    : 'bg-white text-gray-500 ring-1 ring-gray-200',
              ].join(' ')}
              aria-current={active ? 'step' : undefined}
              aria-label={active ? `Step ${n} of ${total}` : `Step ${n}`}
            >
              {done ? <Check className="h-[1.1em] w-[1.1em]" /> : <span className="font-semibold">{n}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}