// Helper to verify a connected account and issue an AccountLink when onboarding is incomplete.
import Stripe from "https://esm.sh/stripe@15.12.0?target=deno";

export type AccountGateResult =
  | { ok: true; account: Stripe.Account }
  | { ok: false; code: "BARBER_NOT_ONBOARDED"; message: string; onboarding_url: string; accountId: string; currently_due?: string[] };

export async function ensureChargesEnabledOrLink(
  stripe: Stripe,
  accountId: string,
  hostReturnUrl: string, // e.g., https://app.kutable.com/dashboard/barber?onboard=done
): Promise<AccountGateResult> {
  const acct = await stripe.accounts.retrieve(accountId);

  if (acct.charges_enabled) {
    return { ok: true, account: acct };
  }

  // Create a fresh AccountLink for onboarding/refresh
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${hostReturnUrl}?onboard=refresh`,
    return_url: `${hostReturnUrl}?onboard=return`,
    type: "account_onboarding",
  });

  return {
    ok: false,
    code: "BARBER_NOT_ONBOARDED",
    message:
      "This barber hasn't completed Stripe onboarding yet. Please finish onboarding to accept payments.",
    onboarding_url: link.url,
    accountId,
    currently_due: (acct.requirements?.currently_due ?? []).slice(0, 20),
  };
}