import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, CreditCard, Lock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { parseStripeError, sanitizeCardDataForLogging } from '../utils/stripe';

interface PaymentFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentFormInner: React.FC<PaymentFormProps> = ({ onClose, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [formData, setFormData] = useState({
    cardholderName: '',
    isDefault: true,
  });

  useEffect(() => {
    fetchSetupIntent();
  }, []);

  const fetchSetupIntent = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch('/api/v1/billing/setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create setup intent');
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error('[PaymentForm] Error fetching setup intent:', sanitizeCardDataForLogging(error));
      setError('Failed to initialize payment form. Please try again.');
    }
  };

  const handleCardChange = (event: any) => {
    setCardComplete(event.complete);
    setCardError(event.error ? event.error.message : null);
    // Clear global error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset states
    setError(null);
    setCardError(null);

    // Validate Stripe is loaded
    if (!stripe || !elements) {
      setError('Payment system is still loading. Please wait a moment and try again.');
      return;
    }

    // Validate form
    if (!formData.cardholderName.trim()) {
      setError('Please enter the cardholder name.');
      return;
    }

    if (!cardComplete) {
      setError('Please complete your card information.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found. Please refresh the page.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create payment method with Stripe
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: formData.cardholderName,
        },
      });

      if (stripeError) {
        throw new Error(parseStripeError(stripeError));
      }

      if (!paymentMethod) {
        throw new Error('Failed to create payment method. Please try again.');
      }

      // Step 2: Send payment method to backend
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch('/api/v1/billing/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'CARD',
          stripePaymentMethodId: paymentMethod.id,
          isDefault: formData.isDefault,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add payment method');
      }

      // Step 3: Confirm setup intent if using 3D Secure
      if (clientSecret) {
        const { error: confirmError } = await stripe.confirmCardSetup(clientSecret, {
          payment_method: paymentMethod.id,
        });

        if (confirmError) {
          throw new Error(parseStripeError(confirmError));
        }
      }

      // Success!
      setSuccess(true);
      setRetryCount(0);

      // Show success message briefly before closing
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error) {
      console.error('[PaymentForm] Error processing payment:', sanitizeCardDataForLogging(error));
      const errorMessage = error instanceof Error ? error.message : 'Failed to add payment method. Please try again.';
      setError(errorMessage);
      setRetryCount((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setCardError(null);
    setSuccess(false);
    fetchSetupIntent();
  };

  // Stripe CardElement styling
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1f2937',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        '::placeholder': {
          color: '#9ca3af',
        },
        iconColor: '#6b7280',
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
    hidePostalCode: false,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add Payment Method</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading || success}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start">
          <Lock className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Secure Payment</p>
            <p>Your payment information is encrypted and processed securely by Stripe. We never store your card details.</p>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start animate-fade-in">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-semibold">Payment Method Added Successfully!</p>
              <p>Your card has been securely saved.</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 animate-shake">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
                {retryCount > 0 && (
                  <button
                    onClick={handleRetry}
                    className="mt-2 text-sm text-red-700 hover:text-red-900 font-medium flex items-center"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cardholder Name */}
          <div>
            <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700 mb-2">
              Cardholder Name
            </label>
            <input
              type="text"
              id="cardholderName"
              name="cardholderName"
              value={formData.cardholderName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, cardholderName: e.target.value }))
              }
              placeholder="John Doe"
              disabled={loading || success}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            />
          </div>

          {/* Stripe Card Element */}
          <div>
            <label htmlFor="card-element" className="block text-sm font-medium text-gray-700 mb-2">
              Card Information
            </label>
            <div
              className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                cardError
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent'
              } ${loading || success ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <CardElement
                id="card-element"
                options={cardElementOptions}
                onChange={handleCardChange}
              />
            </div>
            {cardError && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {cardError}
              </p>
            )}
          </div>

          {/* Set as Default */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))
              }
              disabled={loading || success}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
            />
            <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
              Set as default payment method
            </label>
          </div>

          {/* Test Card Info (only in development) */}
          {import.meta.env.DEV && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800 font-semibold mb-1">Test Mode - Use Test Card:</p>
              <p className="text-xs text-yellow-700 font-mono">4242 4242 4242 4242</p>
              <p className="text-xs text-yellow-700">Exp: Any future date, CVC: Any 3 digits</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || success}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success || !stripe || !elements || !cardComplete}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : success ? (
                'Added Successfully!'
              ) : (
                'Add Card'
              )}
            </button>
          </div>
        </form>

        {/* Accepted Cards */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center mb-2">We accept</p>
          <div className="flex justify-center space-x-3">
            <div className="px-3 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">
              Visa
            </div>
            <div className="px-3 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">
              Mastercard
            </div>
            <div className="px-3 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">
              Amex
            </div>
            <div className="px-3 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">
              Discover
            </div>
          </div>
        </div>

        {/* Powered by Stripe */}
        <div className="mt-4 flex items-center justify-center text-xs text-gray-400">
          <Lock className="w-3 h-3 mr-1" />
          <span>Powered by Stripe</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentFormInner;
