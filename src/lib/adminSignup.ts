import { supabase } from './supabase';

export async function adminSignup(email: string, password: string, metadata: Record<string, any> = {}) {
  const resp = await fetch('/api/admin/create-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, metadata }),
  });

  // Read text first to avoid "Unexpected end of JSON input"
  const raw = await resp.text();
  let payload: any = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    // non-JSON; leave payload as null
  }

  if (!resp.ok) {
    const msg = payload?.error || raw || `HTTP ${resp.status}`;
    throw new Error(msg);
  }

  const user = payload?.user;
  if (!user) {
    throw new Error('Signup failed: no user returned');
  }

  // Immediately sign in
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}