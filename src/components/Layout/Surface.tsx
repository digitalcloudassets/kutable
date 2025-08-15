import React from 'react';

type Props = {
  /** classes applied to the wrapper on md+ only */
  mdClassName?: string;
  children: React.ReactNode;
};

/**
 * Mobile: wrapper collapses (display: contents) → effectively NO outer wrapper.
 * Desktop (md+): wrapper renders with the provided mdClassName.
 */
export default function Surface({ mdClassName = 'rounded-2xl border bg-white shadow-sm p-8', children }: Props) {
  return (
    <section className={`contents md:block md:${mdClassName}`}>
      {children}
    </section>
  );
}