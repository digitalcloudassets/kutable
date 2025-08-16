import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export async function ensureBarberProfile(user: User) {
  // 1) Already exists?
  const { data: existing, error: selErr } = await supabase
    .from('barber_profiles')
    .select('id, slug')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!selErr && existing) return existing;

  // 2) Build safe display name without mixing ?? and ||
  const full = (user.user_metadata?.full_name as string | undefined) ?? undefined;
  const first = (user.user_metadata?.first_name as string | undefined) ?? undefined;
  const last = (user.user_metadata?.last_name as string | undefined) ?? undefined;
  const firstLast = `${first ?? ''} ${last ?? ''}`.trim();

  const owner_name =
    full ??
    (firstLast !== '' ? firstLast : (user.email?.split('@')[0] ?? 'Barber'));

  const business_name =
    (user.user_metadata?.business_name as string | undefined) ?? '';

  // Unique & deterministic
  const slug = `barber-${user.id.slice(0, 8)}`;

  // 3) Create minimal profile for onboarding to complete
  const { data: created, error: insErr } = await supabase
    .from('barber_profiles')
    .insert({
      user_id: user.id,
      slug,
      owner_name,
      business_name
    })
    .select('id, slug')
    .single();

  if (insErr) throw insErr;
  return created;
}