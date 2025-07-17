// src/stripe/stripe.interface.ts

// This mirrors the frontend MockStripeSubscription for consistency
// but might be expanded with more fields from actual Stripe API responses.
export interface StripeSubscriptionDetails {
  id: string; // Stripe Subscription ID (e.g., sub_xxxx)
  status:
    | 'active'
    | 'past_due'
    | 'unpaid'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired'
    | 'trialing'
    | 'paused';
  stripeCustomerId: string;
  items: {
    data: {
      price: {
        id: string; // Stripe Price ID (e.g., price_xxxx)
      };
      quantity?: number;
    }[];
  };
  current_period_start: number; // ADDED
  current_period_end: number; // Unix timestamp
  cancel_at_period_end: boolean; // ADDED
  clientSecret?: string | null;
}
