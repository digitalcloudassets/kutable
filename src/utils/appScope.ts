import type { Session } from '@supabase/supabase-js';

export function inAuthedApp(pathname: string): boolean {
  // Treat your app shell as these roots
  return pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
}

export function chooseDashboard(session: Session | null): string {
  // Since we have a single dashboard route that handles user type internally,
  // just return the dashboard route
  return '/dashboard';
}