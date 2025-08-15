// Dev/Bolt bypass; in prod it's where you'd render the widget.
import React, { useEffect } from 'react';
import { env } from '../../utils/env';

export default function TurnstileGate({ onVerify }: { onVerify: (token: string) => void }) {
  useEffect(() => { if (!env.enableTurnstile) onVerify('dev-bypass'); }, [onVerify]);
  if (!env.enableTurnstile) return null;
  return <div className="text-xs text-gray-500"><em>Security check…</em></div>;
}