import { supabase } from './supabase';

export async function adminSignup(email: string, password: string, metadata: Record<string, any> = {}) {
  const resp = await fetch('/api/admin/create-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': import.meta.env.VITE_ADMIN_API_SECRET || 'kutable-admin-secret-2025',
    },
    body: JSON.stringify({ email, password, metadata }),
    credentials: 'include',
  });

  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(json?.error || 'Signup failed');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}