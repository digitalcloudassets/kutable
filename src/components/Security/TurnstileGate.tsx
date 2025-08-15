// Complete replacement: Bypass entirely unless enableTurnstile is true.
import React, { useEffect, useRef, useState } from 'react';
import { TURNSTILE_ENABLED, env } from '../../utils/env';

type Props = {
  children: React.ReactNode;
  onToken?: (token: string | null) => void; // optional, only called if enabled
};

declare global {
  interface Window {
    onTurnstileLoad?: () => void;
    turnstile?: { render: (el: HTMLElement, opts: any) => void };
  }
}

export default function TurnstileGate({ children, onToken }: Props) {
  // If not enabled, render children immediately — no script, no blocking.
  if (!TURNSTILE_ENABLED) {
    return <>{children}</>;
  }

  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Load Turnstile once
    if (document.getElementById('cf-turnstile')) return setReady(true);

    const s = document.createElement('script');
    s.id = 'cf-turnstile';
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    s.async = true;
    window.onTurnstileLoad = () => setReady(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!ready || !ref.current || !window.turnstile) return;
    window.turnstile.render(ref.current, {
      sitekey: env.turnstileSiteKey,
      callback: (token: string) => onToken?.(token ?? null),
      'error-callback': () => onToken?.(null),
      'timeout-callback': () => onToken?.(null),
      theme: 'auto',
    });
  }, [ready, onToken]);

  return (
    <div className="space-y-3">
      <div ref={ref} />
      <div>{children}</div>
    </div>
  );
}