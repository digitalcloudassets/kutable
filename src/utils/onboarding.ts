import { supabase } from '../lib/supabase';

export type UserRole = 'barber' | 'client' | 'unknown';
export type OnboardingState = 'complete' | 'needs_profile' | 'needs_payouts';

export type RoleDecision = {
  role: UserRole;                 // who the user should be treated as
  state: OnboardingState;         // where to route next
  ids: { clientId?: string; barberId?: string; }; // resolved profile ids
};

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

/**
 * Decide role+state without causing RLS recursion and without `.in.(null)`.
 * Rules:
 * - If barber profile exists -> role=barber (unless explicitly overridden by lastRole='client' and no barber use yet)
 * - Else if client profile exists -> role=client
 * - If neither exists -> needs_profile
 * - Barbers with payouts_enabled=false -> needs_payouts
 * - Any booking presence counts as returning (complete)
 */
export async function decideRoleAndState(userId: string, lastRolePref?: UserRole): Promise<RoleDecision> {
  // 1) Fetch profile ids (owner-only queries; RLS-safe)
  const [{ data: cp }, { data: bp }] = await Promise.all([
    supabase.from('client_profiles').select('id').eq('user_id', userId).maybeSingle(),
    supabase.from('barber_profiles').select('id,stripe_onboarding_completed').eq('user_id', userId).maybeSingle(),
  ]);

  const clientId = cp?.id ?? undefined;
  const barberId = bp?.id ?? undefined;
  const payoutsEnabled = !!bp?.stripe_onboarding_completed;

  // 2) Any activity? (only query bookings if we have at least one id)
  let hasAnyBooking = false;
  const orClauses: string[] = [];
  if (clientId) orClauses.push(`client_id.eq.${clientId}`);
  if (barberId) orClauses.push(`barber_id.eq.${barberId}`);
  if (orClauses.length > 0) {
    const { data: bks } = await supabase
      .from('bookings')
      .select('id')
      .or(orClauses.join(','))
      .limit(1);
    hasAnyBooking = !!(bks && bks.length > 0);
  }

  // 3) Choose role (favor barber if exists)
  let role: UserRole = 'unknown';
  if (barberId) role = 'barber';
  else if (clientId) role = 'client';

  // ✅ TEMP: disable lastRole preference to avoid auto-flipping to client
  // if (clientId && barberId && lastRolePref === 'client') {
  //   role = 'client';
  // }

  // 4) Compute state
  let state: OnboardingState = 'needs_profile';
  if (role === 'barber') {
    state = payoutsEnabled ? 'complete' : 'needs_payouts';
  } else if (role === 'client') {
    state = 'complete';
  } else {
    // unknown role (no profiles yet)
    state = hasAnyBooking || localStorage.getItem('kutable:returning') === '1' ? 'complete' : 'needs_profile';
  }

  // Deep logs for debugging
  console.log('[decideRoleAndState]', {
    userId, clientId, barberId, payoutsEnabled, hasAnyBooking, lastRolePref,
    chosenRole: role, state
  });

  return { role, state, ids: { clientId, barberId } };
}