import { loadStripe, Stripe } from '@stripe/stripe-js';

// Stripe publishable key from environment variables
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// Singleton instance of Stripe
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get or initialize Stripe instance
 * Uses singleton pattern to ensure only one instance is created
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    if (!STRIPE_PUBLISHABLE_KEY) {
      console.error('[Stripe] VITE_STRIPE_PUBLIC_KEY is not defined in environment variables');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

/**
 * Stripe error types for better error handling
 */
export enum StripeErrorType {
  CARD_ERROR = 'card_error',
  VALIDATION_ERROR = 'validation_error',
  API_CONNECTION_ERROR = 'api_connection_error',
  API_ERROR = 'api_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  INVALID_REQUEST_ERROR = 'invalid_request_error',
}

/**
 * Parse Stripe error and return user-friendly message
 */
export const parseStripeError = (error: any): string => {
  if (!error) return 'An unknown error occurred';

  // Stripe API errors
  if (error.type) {
    switch (error.type) {
      case StripeErrorType.CARD_ERROR:
        return error.message || 'Your card was declined. Please try a different payment method.';

      case StripeErrorType.VALIDATION_ERROR:
        return error.message || 'Invalid card information. Please check your details.';

      case StripeErrorType.API_CONNECTION_ERROR:
        return 'Unable to connect to payment processor. Please check your internet connection and try again.';

      case StripeErrorType.AUTHENTICATION_ERROR:
        return 'Authentication failed. Please refresh the page and try again.';

      case StripeErrorType.RATE_LIMIT_ERROR:
        return 'Too many requests. Please wait a moment and try again.';

      case StripeErrorType.API_ERROR:
      case StripeErrorType.INVALID_REQUEST_ERROR:
      default:
        return error.message || 'Payment processing failed. Please try again.';
    }
  }

  // Generic error
  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

/**
 * Test card numbers for development
 * WARNING: These should ONLY be used in development/test environments
 */
export const TEST_CARDS = {
  SUCCESS: '4242424242424242',
  REQUIRES_AUTH: '4000002500003155',
  DECLINED: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  EXPIRED: '4000000000000069',
  PROCESSING_ERROR: '4000000000000119',
};

/**
 * Validate card number using Luhn algorithm
 * This is a client-side validation only - Stripe will do the real validation
 */
export const validateCardNumber = (cardNumber: string): boolean => {
  const digits = cardNumber.replace(/\s/g, '');

  if (!/^\d{13,19}$/.test(digits)) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

/**
 * Sanitize card data for logging (NEVER log full card numbers)
 */
export const sanitizeCardDataForLogging = (data: any): any => {
  if (!data) return data;

  const sanitized = { ...data };

  // Remove sensitive fields
  const sensitiveFields = [
    'card',
    'cardNumber',
    'number',
    'cvc',
    'cvv',
    'exp_month',
    'exp_year',
    'expiry',
  ];

  sensitiveFields.forEach((field) => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });

  // Mask card number if present in nested objects
  if (sanitized.payment_method?.card?.last4) {
    sanitized.payment_method.card = {
      last4: sanitized.payment_method.card.last4,
      brand: sanitized.payment_method.card.brand,
    };
  }

  return sanitized;
};
