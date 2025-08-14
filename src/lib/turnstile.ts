// Lightweight, invisible Turnstile helper. No UI changes to your checkout.
import { env } from './env';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string;
      execute: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

let scriptLoaded = false;
function loadScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; 
    s.defer = true;
    s.onload = () => { 
      scriptLoaded = true; 
      resolve(); 
    };
    s.onerror = () => reject(new Error('Failed to load Turnstile'));
    document.head.appendChild(s);
  });
}

/** Get a one-time captcha token for the given action */
export async function getCaptchaToken(action: string): Promise<string> {
  if (!env.turnstileSiteKey || env.turnstileSiteKey === '1x00000000000000000000AA') {
    console.warn('Turnstile not configured - skipping CAPTCHA');
    return 'no-captcha-configured';
  }
  
  await loadScript();
  if (!window.turnstile) throw new Error('Turnstile not available');

  return new Promise((resolve, reject) => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);

    const widgetId = window.turnstile!.render(mount, {
      sitekey: env.turnstileSiteKey,
      size: 'invisible',
      action,
      callback: (token: string) => {
        try {
          resolve(token);
        } finally {
          window.turnstile!.remove(widgetId);
          mount.remove();
        }
      },
      'error-callback': () => {
        try {
          reject(new Error('Turnstile error'));
        } finally {
          window.turnstile!.remove(widgetId);
          mount.remove();
        }
      },
      'timeout-callback': () => {
        try {
          reject(new Error('Turnstile timeout'));
        } finally {
          window.turnstile!.remove(widgetId);
          mount.remove();
        }
      },
    });

    // Execute the challenge
    window.turnstile!.execute(widgetId);
  });
}