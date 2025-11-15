import React, { useEffect, useState } from 'react';
import { CreditCard, Check, X, Loader } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

interface Subscription {
  id: string;
  userId: string;
  tier: 'free' | 'pro' | 'business';
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  payments: Payment[];
}

interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: string;
  invoiceUrl?: string;
  createdAt: string;
}

interface Plan {
  tier: string;
  name: string;
  price: number;
  maxPlatforms: number;
  features: string[];
}

export const Billing: React.FC = () => {
  const location = useLocation();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  // Get pricing plans
  const { data: pricing } = useQuery({
    queryKey: ['pricing'],
    queryFn: async () => {
      const response = await axios.get('/api/payments/pricing');
      return response.data;
    },
  });

  // Get user subscription
  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const response = await axios.get('/api/payments/subscription');
      return response.data;
    },
  });

  // Handle checkout
  const checkoutMutation = useMutation({
    mutationFn: async (tier: string) => {
      setLoadingCheckout(true);
      const response = await axios.post('/api/payments/checkout', { tier });
      return response.data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.sessionId) {
        window.location.href = `https://checkout.stripe.com/pay/${data.sessionId}`;
      }
    },
    onError: (error: any) => {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to create checkout session',
      });
      setLoadingCheckout(false);
    },
  });

  // Handle cancel subscription
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.delete('/api/payments/subscription');
      return response.data;
    },
    onSuccess: () => {
      setMessage({
        type: 'success',
        text: 'Subscription will be cancelled at the end of your billing period',
      });
      refetch();
    },
    onError: (error: any) => {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to cancel subscription',
      });
    },
  });

  // Check for success/cancelled messages
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('success')) {
      setMessage({
        type: 'success',
        text: 'Payment successful! Your subscription has been activated.',
      });
      refetch();
    } else if (params.get('cancelled')) {
      setMessage({
        type: 'error',
        text: 'Payment cancelled. Please try again.',
      });
    }
  }, [location, refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const currentTier = subscription?.tier || 'free';
  const isActive = subscription?.status === 'active';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Billing & Subscriptions</h1>
          <p className="text-xl text-slate-300">
            Choose the perfect plan for your earning journey
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-8 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-500/20 border border-green-500 text-green-200'
                : 'bg-red-500/20 border border-red-500 text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Current Subscription Info */}
        {subscription && (
          <div className="bg-slate-700/50 rounded-lg p-6 mb-8 border border-slate-600">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Current Plan</h2>
                <p className="text-slate-300">
                  You are currently on the <span className="font-bold text-blue-400 capitalize">{currentTier}</span> plan
                </p>
                {subscription.currentPeriodEnd && (
                  <p className="text-slate-400 text-sm mt-2">
                    Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
              {isActive && currentTier !== 'free' && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure? Your subscription will be cancelled at the end of the billing period.')) {
                      cancelMutation.mutate();
                    }
                  }}
                  disabled={cancelMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pricing Plans */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {pricing?.plans.map((plan: Plan) => (
            <div
              key={plan.tier}
              className={`rounded-xl border-2 transition-all ${
                currentTier === plan.tier
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-600 bg-slate-700/50 hover:border-blue-400'
              } p-8`}
            >
              {/* Plan Header */}
              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                {plan.price > 0 && <span className="text-slate-400 text-lg">/month</span>}
              </div>

              {/* Badge for current plan */}
              {currentTier === plan.tier && (
                <div className="mb-6 inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Current Plan
                </div>
              )}

              {/* Features */}
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-slate-400 mt-1">Max Platforms:</span>
                  <span className="text-white font-semibold">
                    {plan.maxPlatforms === -1 ? 'Unlimited' : plan.maxPlatforms}
                  </span>
                </li>
                {plan.features.map((feature: string) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              {plan.tier === 'free' ? (
                currentTier === 'free' && (
                  <button disabled className="w-full bg-slate-600 text-slate-300 py-3 rounded-lg font-semibold cursor-default">
                    Current Plan
                  </button>
                )
              ) : currentTier === plan.tier ? (
                <button disabled className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold cursor-default">
                  Active Plan
                </button>
              ) : (
                <button
                  onClick={() => checkoutMutation.mutate(plan.tier)}
                  disabled={loadingCheckout || checkoutMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {loadingCheckout || checkoutMutation.isPending ? 'Processing...' : 'Upgrade Now'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Payment History */}
        {subscription?.payments && subscription.payments.length > 0 && (
          <div className="bg-slate-700/50 rounded-lg p-8 border border-slate-600">
            <h2 className="text-2xl font-bold text-white mb-6">Payment History</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {subscription.payments.map((payment: Payment) => (
                    <tr key={payment.id} className="border-b border-slate-600 hover:bg-slate-600/30">
                      <td className="py-3 px-4 text-slate-300">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-white font-semibold">
                        {payment.currency} {payment.amount}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                            payment.status === 'succeeded'
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {payment.status === 'succeeded' ? 'Succeeded' : 'Failed'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {payment.invoiceUrl ? (
                          <a
                            href={payment.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 font-semibold"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-12 bg-slate-700/50 rounded-lg p-8 border border-slate-600">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Can I change my plan anytime?</h3>
              <p className="text-slate-300">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">What happens if I cancel?</h3>
              <p className="text-slate-300">
                Your subscription will be cancelled at the end of your billing period. You'll retain access to all features until then.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Do you offer refunds?</h3>
              <p className="text-slate-300">
                We offer a 7-day money-back guarantee. Contact support@earntrack.com if you need assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
