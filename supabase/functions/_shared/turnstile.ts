import { serverEnv, TURNSTILE_ENABLED } from './env.ts';

export async function verifyTurnstile(token: string, remoteIp?: string) {
  if (!TURNSTILE_ENABLED) {
    // Soft-bypass when not configured
    return { ok: true, bypassed: true };
  }

  if (!token || token === 'no-captcha-configured') {
    return { ok: false, error: 'No captcha token provided' };
  }

  try {
    const form = new FormData();
    form.append('secret', serverEnv.turnstileSecretKey);
    form.append('response', token);
    if (remoteIp) form.append('remoteip', remoteIp);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });

    const result = await response.json();
    return { 
      ok: !!result.success, 
      result,
      action: result.action,
      errors: result['error-codes'] || []
    };
  } catch (error) {
    return { 
      ok: false, 
      error: error instanceof Error ? error.message : 'Verification failed' 
    };
  }
}