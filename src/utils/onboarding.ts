import { supabase } from '../lib/supabaseClient';

export type OnboardingState = 'complete' | 'needs_profile' | 'needs_payouts';

type MinimalChecks = {
  hasClientProfile: boolean;
  hasBarberProfile: boolean;
  payoutsEnabled: boolean;
  hasAnyBooking: boolean;
};

async function getMinimalChecks(userId: string): Promise<MinimalChecks> {
  // 1) Get profile ids first
  const [{ data: cp }, { data: bp }] = await Promise.all([
    supabase.from('client_profiles').select('id').eq('user_id', userId).maybeSingle(),
    supabase.from('barber_profiles').select('id,stripe_onboarding_completed').eq('user_id', userId).maybeSingle(),
  ]);

  let hasAnyBooking = false;
  if (cp?.id || bp?.id) {
    // 2) Only query bookings if we have a real id; avoid in.(null)
    const orParts: string[] = [];
    if (cp?.id) orParts.push(`client_id.eq.${cp.id}`);
    if (bp?.id) orParts.push(`barber_id.eq.${bp.id}`);

    if (orParts.length > 0) {
      const { data: bks } = await supabase
        .from('bookings')
        .select('id')
        .or(orParts.join(','))
        .limit(1);
      hasAnyBooking = !!(bks && bks.length > 0);
    }
  }

  return {
    hasClientProfile: !!cp?.id,
    hasBarberProfile: !!bp?.id,
    payoutsEnabled: !!bp?.stripe_onboarding_completed,
    hasAnyBooking,
  };
}

export async function computeOnboardingState(userId: string): Promise<OnboardingState> {
  const checks = await Promise.race([
    getMinimalChecks(userId),
    new Promise<MinimalChecks>((resolve) =>
      setTimeout(() => resolve({
        hasClientProfile: false,
        hasBarberProfile: false,
        payoutsEnabled: false,
        hasAnyBooking: false,
      }), 3500)
    ),
  ]);

  // Clients with a profile are DONE — never send them to Stripe.
  if (checks.hasClientProfile) return 'complete';

  // Barbers without payouts go to payouts.
  if (checks.hasBarberProfile && !checks.payoutsEnabled) return 'needs_payouts';

  // Any sign of prior use counts as complete.
  if (checks.hasBarberProfile || checks.hasAnyBooking || localStorage.getItem('kutable:returning') === '1') {
    return 'complete';
  }

  // Otherwise, treat as new and send to profile onboarding.
  return 'needs_profile';
}