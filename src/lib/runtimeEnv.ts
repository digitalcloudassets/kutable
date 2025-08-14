// Runtime environment detection utilities

export function isWebContainer(): boolean {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return hostname.includes('webcontainer-api.io') || 
           hostname.includes('stackblitz.io') ||
           hostname.includes('local-credentialless');
  }
  return false;
}

export function isRealRuntime(): boolean {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Real runtime = localhost or actual deployed domains
    return hostname === 'localhost' || 
           hostname.includes('127.0.0.1') ||
           hostname.includes('.netlify.app') ||
           hostname.includes('kutable.com') ||
           (!hostname.includes('webcontainer-api.io') && 
            !hostname.includes('stackblitz.io') &&
            !hostname.includes('local-credentialless'));
  }
  return false;
}

export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

export function isProduction(): boolean {
  return !import.meta.env.DEV;
}