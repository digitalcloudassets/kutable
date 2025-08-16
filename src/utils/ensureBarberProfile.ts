import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export async function ensureBarberProfile(user: User) {
  // 1) Check if it already exists
  const { data: existing, error: selErr } = await supabase
    .from('barber_profiles')
    .select('id, slug')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!selErr && existing) return existing;

  // 2) If not, create a minimal row the onboarding can flesh out
  const slug = `barber-${user.id.slice(0, 8)}`;
  const owner_name =
    (user.user_metadata?.full_name as string) ??
    `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
    user.email?.split('@')[0] ??
    'Barber';
  const business_name = (user.user_metadata?.business_name as string) ?? 
    `${user.user_metadata?.first_name || 'New'} Barber Shop`;

  const { data: created, error: insErr } = await supabase
    .from('barber_profiles')
    .insert({
      user_id: user.id,
      slug,
      owner_name,
      business_name: business_name,
      email: user.email || '',
      is_claimed: true,
      is_active: false // Will be activated after onboarding
    })
    .select('id, slug')
    .single();

  if (insErr) throw insErr;
  return created;
}