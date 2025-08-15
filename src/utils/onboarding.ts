import { supabase } from '../lib/supabaseClient';

export type OnboardingState = 'complete' | 'needs_profile' | 'needs_payouts';

type MinimalChecks = {
  hasClientProfile: boolean;
  hasBarberProfile: boolean;
  payoutsEnabled: boolean;
  hasAnyBooking: boolean;
  hasActiveSub: boolean; // optional, defaults to false
};

async function getMinimalChecks(userId: string): Promise<MinimalChecks> {
  const [{ data: cp }, { data: bp }] = await Promise.all([
    supabase.from('client_profiles').select('id').eq('user_id', userId).maybeSingle(),
    supabase.from('barber_profiles').select('id,stripe_onboarding_completed').eq('user_id', userId).maybeSingle(),
  ]);

  // any booking tied to client or to the user's barber profile
  const { data: bks } = await supabase
    .from('bookings')
    .select('id')
    .or(`client_id.in.(${cp?.id || 'null'}),barber_id.in.(${bp?.id || 'null'})`)
    .limit(1);

  // optional subscription status table. If you do not have one, leave false.
  let hasActiveSub = false;

  return {
    hasClientProfile: !!cp?.id,
    hasBarberProfile: !!bp?.id,
    payoutsEnabled: !!bp?.stripe_onboarding_completed,
    hasAnyBooking: !!(bks && bks.length > 0),
    hasActiveSub,
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
        hasActiveSub: false,
      }), 3500)
    ),
  ]);

  // Clients with a profile are done. Do not send to Stripe.
  if (checks.hasClientProfile) return 'complete';

  // Barbers without payouts go to payouts
  if (checks.hasBarberProfile && !checks.payoutsEnabled) return 'needs_payouts';

  // Any signal of history counts as complete
  if (checks.hasBarberProfile || checks.hasAnyBooking || checks.hasActiveSub || localStorage.getItem('kutable:returning') === '1') {
    return 'complete';
  }

  return 'needs_profile';
}