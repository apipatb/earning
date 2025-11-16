import React, { useState, useEffect } from 'react';
import {
  Crown,
  Zap,
  Star,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: string;
  features: string[];
  isActive: boolean;
  trialDays: number;
}

interface Subscription {
  id: string;
  status: string;
  plan: PricingPlan;
  startDate: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
}

interface SubscriptionManagerProps {
  onUpdate: () => void;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ onUpdate }) => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState<'subscribe' | 'upgrade' | 'downgrade' | 'cancel' | 'reactivate' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [plansRes, subscriptionsRes] = await Promise.all([
        fetch('/api/v1/billing/plans', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/v1/billing/subscriptions', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const plansData = await plansRes.json();
      const subscriptionsData = await subscriptionsRes.json();

      setPlans(plansData);

      // Set the most recent active or trialing subscription
      const activeSubscription = subscriptionsData.find(
        (s: Subscription) => s.status === 'ACTIVE' || s.status === 'TRIALING'
      );
      setCurrentSubscription(activeSubscription || null);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanAction = (plan: PricingPlan) => {
    setSelectedPlan(plan);

    if (!currentSubscription) {
      setActionType('subscribe');
    } else if (currentSubscription.plan.id === plan.id) {
      return; // Same plan, no action
    } else if (plan.price > currentSubscription.plan.price) {
      setActionType('upgrade');
    } else {
      setActionType('downgrade');
    }

    setShowConfirmDialog(true);
  };

  const handleCancelSubscription = () => {
    setActionType('cancel');
    setShowConfirmDialog(true);
  };

  const handleReactivateSubscription = () => {
    setActionType('reactivate');
    setShowConfirmDialog(true);
  };

  const confirmAction = async () => {
    if (!actionType) return;

    try {
      const token = localStorage.getItem('token');

      if (actionType === 'subscribe' && selectedPlan) {
        setProcessingPlanId(selectedPlan.id);
        const response = await fetch('/api/v1/billing/subscriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            planId: selectedPlan.id,
          }),
        });

        if (!response.ok) throw new Error('Failed to create subscription');
      } else if ((actionType === 'upgrade' || actionType === 'downgrade') && selectedPlan && currentSubscription) {
        setProcessingPlanId(selectedPlan.id);
        const response = await fetch(`/api/v1/billing/subscriptions/${currentSubscription.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            planId: selectedPlan.id,
          }),
        });

        if (!response.ok) throw new Error(`Failed to ${actionType} subscription`);
      } else if (actionType === 'cancel' && currentSubscription) {
        const response = await fetch(`/api/v1/billing/subscriptions/${currentSubscription.id}/cancel`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to cancel subscription');
      } else if (actionType === 'reactivate' && currentSubscription) {
        const response = await fetch(`/api/v1/billing/subscriptions/${currentSubscription.id}/reactivate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to reactivate subscription');
      }

      await fetchData();
      onUpdate();
      setShowConfirmDialog(false);
      setActionType(null);
      setSelectedPlan(null);
    } catch (error) {
      console.error('Error processing subscription action:', error);
      alert(`Failed to ${actionType} subscription`);
    } finally {
      setProcessingPlanId(null);
    }
  };

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('pro') || name.includes('premium')) return Crown;
    if (name.includes('plus') || name.includes('standard')) return Zap;
    return Star;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Current Subscription Status */}
      {currentSubscription && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">{currentSubscription.plan.name}</h3>
              <p className="mt-2 text-blue-100">
                {formatCurrency(currentSubscription.plan.price)} / {currentSubscription.plan.billingCycle.toLowerCase()}
              </p>
              <div className="mt-4 space-y-1">
                {currentSubscription.status === 'TRIALING' && currentSubscription.trialEndsAt && (
                  <p className="text-sm flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Trial ends {formatDate(currentSubscription.trialEndsAt)}
                  </p>
                )}
                <p className="text-sm flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Next billing {formatDate(currentSubscription.currentPeriodEnd)}
                </p>
                {currentSubscription.cancelAtPeriodEnd && (
                  <p className="text-sm flex items-center text-yellow-200">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Subscription will cancel on {formatDate(currentSubscription.currentPeriodEnd)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              {currentSubscription.cancelAtPeriodEnd ? (
                <button
                  onClick={handleReactivateSubscription}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold"
                >
                  Reactivate
                </button>
              ) : (
                <button
                  onClick={handleCancelSubscription}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold mb-6">
          {currentSubscription ? 'Change Plan' : 'Choose a Plan'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = getPlanIcon(plan.name);
            const isCurrentPlan = currentSubscription?.plan.id === plan.id;
            const features = typeof plan.features === 'string'
              ? JSON.parse(plan.features)
              : plan.features;

            return (
              <div
                key={plan.id}
                className={`relative rounded-lg border-2 p-6 ${
                  isCurrentPlan
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                } transition-all`}
              >
                {isCurrentPlan && (
                  <div className="absolute top-0 right-0 -mt-3 -mr-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <Icon className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  {plan.description && (
                    <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
                  )}
                </div>

                <div className="text-center mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-gray-600">
                    /{plan.billingCycle.toLowerCase()}
                  </span>
                  {plan.trialDays > 0 && (
                    <p className="mt-2 text-sm text-green-600 font-semibold">
                      {plan.trialDays} day free trial
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanAction(plan)}
                  disabled={isCurrentPlan || processingPlanId === plan.id}
                  className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : processingPlanId === plan.id
                      ? 'bg-blue-400 text-white cursor-wait'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {processingPlanId === plan.id ? (
                    <span className="flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </span>
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : currentSubscription ? (
                    plan.price > currentSubscription.plan.price ? 'Upgrade' : 'Downgrade'
                  ) : (
                    'Get Started'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">
              {actionType === 'subscribe' && 'Confirm Subscription'}
              {actionType === 'upgrade' && 'Confirm Upgrade'}
              {actionType === 'downgrade' && 'Confirm Downgrade'}
              {actionType === 'cancel' && 'Cancel Subscription'}
              {actionType === 'reactivate' && 'Reactivate Subscription'}
            </h3>
            <p className="text-gray-600 mb-6">
              {actionType === 'subscribe' && selectedPlan && (
                <>
                  You are about to subscribe to the <strong>{selectedPlan.name}</strong> plan at{' '}
                  <strong>{formatCurrency(selectedPlan.price)}</strong> per {selectedPlan.billingCycle.toLowerCase()}.
                  {selectedPlan.trialDays > 0 && (
                    <> You will get a {selectedPlan.trialDays} day free trial.</>
                  )}
                </>
              )}
              {actionType === 'upgrade' && selectedPlan && (
                <>
                  You are about to upgrade to the <strong>{selectedPlan.name}</strong> plan.
                  The difference will be prorated and charged immediately.
                </>
              )}
              {actionType === 'downgrade' && selectedPlan && (
                <>
                  You are about to downgrade to the <strong>{selectedPlan.name}</strong> plan.
                  Changes will take effect at the end of your current billing period.
                </>
              )}
              {actionType === 'cancel' && (
                <>
                  Are you sure you want to cancel your subscription? You will continue to have access
                  until the end of your current billing period.
                </>
              )}
              {actionType === 'reactivate' && (
                <>
                  Your subscription will be reactivated and will renew automatically on your next billing date.
                </>
              )}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={`flex-1 px-4 py-2 rounded-lg text-white font-semibold ${
                  actionType === 'cancel'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;
