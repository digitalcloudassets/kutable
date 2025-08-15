import React from 'react';

type Props = {
  /** classes applied to the wrapper on md+ only */
  mdClassName?: string;
  /** NEW: removes card styling on mobile for full-bleed effect */
  flatOnMobile?: boolean;
  children: React.ReactNode;
};

/**
 * Mobile: wrapper collapses (display: contents) → effectively NO outer wrapper.
 * Desktop (md+): wrapper renders with the provided mdClassName.
 * With flatOnMobile: removes borders/shadows on mobile, keeps card look on desktop.
 */
export default function Surface({ mdClassName = 'rounded-2xl border bg-white shadow-sm p-8 overflow-hidden min-w-0', flatOnMobile = false, children }: Props) {
  if (flatOnMobile) {
    return (
      <section className="contents md:block md:rounded-2xl md:border md:bg-white md:shadow-sm md:overflow-hidden md:min-w-0 -mx-4 md:mx-0">
        <div className="bg-white md:p-8 p-4 min-w-0">{children}</div>
      </section>
    );
  }

  return (
    <section className={`contents md:block md:${mdClassName}`}>
      <div className="min-w-0">{children}</div>
    </section>
  );
}