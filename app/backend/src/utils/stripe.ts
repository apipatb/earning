import Stripe from 'stripe';
import { logger } from './logger';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

/**
 * Simple in-memory cache for subscription status
 * In production, consider using Redis or similar
 */
interface SubscriptionCache {
  [userId: string]: {
    isActive: boolean;
    expiresAt: number;
  };
}

const subscriptionCache: SubscriptionCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Check if a user has an active Stripe subscription
 *
 * @param stripeCustomerId - The Stripe customer ID
 * @param userId - The user ID (for caching)
 * @returns true if user has active or trialing subscription, false otherwise
 */
export async function checkActiveSubscription(
  stripeCustomerId: string | null,
  userId: string
): Promise<boolean> {
  // Check cache first
  const cached = subscriptionCache[userId];
  if (cached && cached.expiresAt > Date.now()) {
    logger.debug(`[Stripe] Using cached subscription status for user ${userId}`);
    return cached.isActive;
  }

  // If user has no Stripe ID, treat as unsubscribed
  if (!stripeCustomerId) {
    logger.debug(`[Stripe] User ${userId} has no Stripe customer ID`);
    cacheSubscriptionStatus(userId, false);
    return false;
  }

  try {
    // Fetch active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      limit: 10, // Get multiple to check all statuses
    });

    // Valid subscription statuses that grant access
    const validStatuses: Stripe.Subscription.Status[] = ['active', 'trialing'];

    // Check if user has any active or trialing subscription
    const hasActiveSubscription = subscriptions.data.some(sub =>
      validStatuses.includes(sub.status)
    );

    logger.info(
      `[Stripe] Subscription check for user ${userId}: ${hasActiveSubscription ? 'ACTIVE' : 'INACTIVE'}`
    );

    // Cache the result
    cacheSubscriptionStatus(userId, hasActiveSubscription);

    return hasActiveSubscription;
  } catch (error) {
    // If Stripe API fails, log error but allow access (fail-open for availability)
    logger.error(
      '[Stripe] Error checking subscription status:',
      error instanceof Error ? error : new Error(String(error))
    );
    logger.warn('[Stripe] Failing open - allowing access due to API error');

    // Don't cache failures, return true to fail-open
    return true;
  }
}

/**
 * Get subscription details from Stripe
 *
 * @param stripeCustomerId - The Stripe customer ID
 * @returns Subscription details or null
 */
export async function getSubscriptionDetails(
  stripeCustomerId: string | null
): Promise<Stripe.Subscription | null> {
  if (!stripeCustomerId) {
    return null;
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    return subscriptions.data.length > 0 ? subscriptions.data[0] : null;
  } catch (error) {
    logger.error(
      '[Stripe] Error fetching subscription details:',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

/**
 * Cache subscription status
 *
 * @param userId - User ID
 * @param isActive - Whether subscription is active
 */
function cacheSubscriptionStatus(userId: string, isActive: boolean): void {
  subscriptionCache[userId] = {
    isActive,
    expiresAt: Date.now() + CACHE_TTL,
  };
}

/**
 * Clear subscription cache for a user
 * Useful after subscription changes
 *
 * @param userId - User ID
 */
export function clearSubscriptionCache(userId: string): void {
  delete subscriptionCache[userId];
  logger.debug(`[Stripe] Cleared subscription cache for user ${userId}`);
}

/**
 * Clear all subscription caches
 * Useful for testing or manual cache invalidation
 */
export function clearAllSubscriptionCaches(): void {
  Object.keys(subscriptionCache).forEach(key => delete subscriptionCache[key]);
  logger.info('[Stripe] Cleared all subscription caches');
}

/**
 * Create a Stripe customer
 *
 * @param email - Customer email
 * @param name - Customer name (optional)
 * @param metadata - Additional metadata (optional)
 * @returns Stripe customer
 */
export async function createStripeCustomer(
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });

    logger.info(`[Stripe] Created customer ${customer.id} for ${email}`);
    return customer;
  } catch (error) {
    logger.error(
      '[Stripe] Error creating customer:',
      error instanceof Error ? error : new Error(String(error))
    );
    throw new Error('Failed to create Stripe customer');
  }
}

/**
 * Get or create a Stripe customer
 *
 * @param email - Customer email
 * @param name - Customer name (optional)
 * @param userId - User ID for metadata
 * @returns Stripe customer
 */
export async function getOrCreateStripeCustomer(
  email: string,
  name?: string,
  userId?: string
): Promise<Stripe.Customer> {
  try {
    // Search for existing customer
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      logger.debug(`[Stripe] Found existing customer for ${email}`);
      return existingCustomers.data[0];
    }

    // Create new customer
    return await createStripeCustomer(
      email,
      name,
      userId ? { userId } : undefined
    );
  } catch (error) {
    logger.error(
      '[Stripe] Error in getOrCreateStripeCustomer:',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

// Export Stripe instance for direct use if needed
export { stripe };
