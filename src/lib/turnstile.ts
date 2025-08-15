// Turnstile utility functions - safe to call whether enabled or not
import { env } from '../utils/env';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: any) => string;
      reset: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
      remove: (widgetId?: string) => void;
    };
  }
}

/**
 * Get CAPTCHA token for protected actions.
 * Returns null if Turnstile is disabled or unavailable.
 * Safe to call - won't block the flow if CAPTCHA fails.
 */
export async function getCaptchaToken(action?: string): Promise<string | null> {
  // Return immediately if Turnstile is disabled
  if (!env.enableTurnstile || !env.turnstileSiteKey) {
    return 'no-captcha-configured';
  }

  // Return null if Turnstile script isn't loaded
  if (!window.turnstile) {
    console.warn('Turnstile not loaded - proceeding without CAPTCHA');
    return null;
  }

  try {
    // Create a temporary invisible element for token generation
    const element = document.createElement('div');
    element.style.position = 'fixed';
    element.style.top = '-9999px';
    element.style.left = '-9999px';
    document.body.appendChild(element);

    return new Promise((resolve) => {
      const widgetId = window.turnstile!.render(element, {
        sitekey: env.turnstileSiteKey,
        action: action || 'generic',
        callback: (token: string) => {
          document.body.removeChild(element);
          resolve(token);
        },
        'error-callback': () => {
          document.body.removeChild(element);
          resolve(null);
        },
        'timeout-callback': () => {
          document.body.removeChild(element);
          resolve(null);
        },
        size: 'invisible'
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        try {
          if (window.turnstile && widgetId) {
            window.turnstile.remove(widgetId);
          }
          if (document.body.contains(element)) {
            document.body.removeChild(element);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
        resolve(null);
      }, 10000);
    });
  } catch (error) {
    console.warn('CAPTCHA token generation failed:', error);
    return null;
  }
}

/**
 * Check if Turnstile is properly configured and available
 */
export function isTurnstileAvailable(): boolean {
  return env.enableTurnstile && !!env.turnstileSiteKey && !!window.turnstile;
}

/**
 * Initialize Turnstile if enabled (called once during app startup)
 */
export function initializeTurnstile(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!env.enableTurnstile || !env.turnstileSiteKey) {
      resolve(false);
      return;
    }

    // Check if already loaded
    if (window.turnstile) {
      resolve(true);
      return;
    }

    // Load Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    
    document.head.appendChild(script);
  });
}