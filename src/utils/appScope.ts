import type { Session } from '@supabase/supabase-js';

export function inAuthedApp(pathname: string): boolean {
  // Treat your app shell as these roots
  return pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
}

export function chooseDashboard(session: Session | null): string {
  const type = session?.user?.user_metadata?.user_type;
  if (type === 'barber') return '/dashboard/barber';
  return '/dashboard';
}