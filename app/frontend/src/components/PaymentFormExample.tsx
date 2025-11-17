/**
 * PaymentFormWrapper Usage Examples
 *
 * This file demonstrates how to use the new Stripe-integrated PaymentFormWrapper
 * in different scenarios throughout your application.
 *
 * IMPORTANT: Use PaymentFormWrapper (not PaymentForm directly)
 */

import React, { useState } from 'react';
import PaymentFormWrapper from './PaymentFormWrapper';
import { CreditCard } from 'lucide-react';

/**
 * Example 1: Basic Usage
 * Simple button that opens payment form
 */
export const BasicPaymentFormExample: React.FC = () => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const handleSuccess = () => {
    console.log('Payment method added successfully!');
    setShowPaymentForm(false);
    // Optionally refresh payment methods list
    // fetchPaymentMethods();
  };

  return (
    <div>
      <button
        onClick={() => setShowPaymentForm(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Add Payment Method
      </button>

      {showPaymentForm && (
        <PaymentFormWrapper
          onClose={() => setShowPaymentForm(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

/**
 * Example 2: With State Management
 * Updates UI after payment method is added
 */
export const StateManagementExample: React.FC = () => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/billing/payment-methods', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setPaymentMethods(data);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setShowPaymentForm(false);
    // Refresh the payment methods list
    fetchPaymentMethods();
    // Optionally show a success toast
    // toast.success('Payment method added successfully!');
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowPaymentForm(true)}
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <CreditCard className="w-5 h-5 mr-2" />
        Add Payment Method
      </button>

      {/* Payment Methods List */}
      <div className="space-y-2">
        {loading ? (
          <p>Loading...</p>
        ) : (
          paymentMethods.map((method) => (
            <div key={method.id} className="p-4 border rounded-lg">
              {method.brand} ending in {method.last4}
            </div>
          ))
        )}
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <PaymentFormWrapper
          onClose={() => setShowPaymentForm(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

/**
 * Example 3: In Settings Page
 * Common use case in user settings/billing section
 */
export const SettingsPageExample: React.FC = () => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Payment Settings</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Payment Methods</h2>
            <p className="text-sm text-gray-600">Manage your payment methods</p>
          </div>
          <button
            onClick={() => setShowPaymentForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Card
          </button>
        </div>

        {/* Payment methods list would go here */}
      </div>

      {showPaymentForm && (
        <PaymentFormWrapper
          onClose={() => setShowPaymentForm(false)}
          onSuccess={() => {
            setShowPaymentForm(false);
            // Show success message
            alert('Payment method added successfully!');
          }}
        />
      )}
    </div>
  );
};

/**
 * Example 4: Conditional Rendering
 * Show payment form only if user doesn't have payment method
 */
export const ConditionalExample: React.FC = () => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);

  const handleSuccess = () => {
    setShowPaymentForm(false);
    setHasPaymentMethod(true);
  };

  if (!hasPaymentMethod) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          Payment Method Required
        </h3>
        <p className="text-sm text-yellow-800 mb-4">
          Please add a payment method to continue using premium features.
        </p>
        <button
          onClick={() => setShowPaymentForm(true)}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
        >
          Add Payment Method
        </button>

        {showPaymentForm && (
          <PaymentFormWrapper
            onClose={() => setShowPaymentForm(false)}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    );
  }

  return <div>Payment method configured!</div>;
};

/**
 * Example 5: With Custom Success Handler
 * Navigate to different page after adding payment method
 */
export const CustomSuccessExample: React.FC = () => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const handleSuccess = async () => {
    // Close the form
    setShowPaymentForm(false);

    // Optionally update user state
    // await updateUserProfile();

    // Redirect to subscription page
    // navigate('/subscription');

    // Or show custom notification
    console.log('Payment method added! Redirecting to subscription page...');
  };

  return (
    <div>
      <button onClick={() => setShowPaymentForm(true)}>
        Add Payment & Continue
      </button>

      {showPaymentForm && (
        <PaymentFormWrapper
          onClose={() => setShowPaymentForm(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

/**
 * Example 6: Integration with React Router
 * Use payment form in routed pages
 */
export const RouterExample: React.FC = () => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  // const navigate = useNavigate(); // from react-router-dom

  const handleSuccess = () => {
    setShowPaymentForm(false);
    // Navigate to success page
    // navigate('/billing/success');
  };

  const handleClose = () => {
    setShowPaymentForm(false);
    // Optionally navigate back
    // navigate(-1);
  };

  return (
    <div>
      <button onClick={() => setShowPaymentForm(true)}>
        Add Payment Method
      </button>

      {showPaymentForm && (
        <PaymentFormWrapper
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

/**
 * MIGRATION GUIDE
 * ================
 *
 * Old Code (DON'T USE):
 * ---------------------
 * import PaymentForm from './components/PaymentForm';
 *
 * <PaymentForm
 *   onClose={handleClose}
 *   onSuccess={handleSuccess}
 * />
 *
 *
 * New Code (USE THIS):
 * --------------------
 * import PaymentFormWrapper from './components/PaymentFormWrapper';
 *
 * <PaymentFormWrapper
 *   onClose={handleClose}
 *   onSuccess={handleSuccess}
 * />
 *
 *
 * PROPS:
 * ------
 * onClose: () => void     - Called when user clicks cancel or X button
 * onSuccess: () => void   - Called when payment method is added successfully
 *
 *
 * NOTES:
 * ------
 * 1. Make sure @stripe/stripe-js and @stripe/react-stripe-js are installed
 * 2. Set VITE_STRIPE_PUBLIC_KEY environment variable
 * 3. Backend must have /api/v1/billing/setup-intent endpoint
 * 4. Backend must have /api/v1/billing/payment-methods endpoint
 * 5. User must be authenticated (token in localStorage)
 */

// Export all examples for documentation/testing
export default {
  BasicPaymentFormExample,
  StateManagementExample,
  SettingsPageExample,
  ConditionalExample,
  CustomSuccessExample,
  RouterExample,
};
