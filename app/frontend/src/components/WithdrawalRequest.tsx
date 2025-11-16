import { useState, useEffect } from 'react';
import { DollarSign, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface WithdrawalRequestProps {
  affiliateId: string;
  availableBalance: number;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  paymentMethod: string | null;
  transactionId: string | null;
  requestedAt: string;
  completedAt: string | null;
}

const statusConfig = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
  },
  REJECTED: {
    label: 'Rejected',
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
  },
};

export default function WithdrawalRequest({ affiliateId, availableBalance }: WithdrawalRequestProps) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'PayPal',
    bankDetails: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadWithdrawals();
  }, [affiliateId]);

  const loadWithdrawals = async () => {
    try {
      const response = await fetch('/api/v1/affiliates/withdrawals', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals);
      }
    } catch (error) {
      console.error('Failed to load withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const amount = parseFloat(formData.amount);

      if (isNaN(amount) || amount < 50) {
        setError('Minimum withdrawal amount is $50');
        setSubmitting(false);
        return;
      }

      if (amount > availableBalance) {
        setError(`Insufficient balance. Available: $${availableBalance.toFixed(2)}`);
        setSubmitting(false);
        return;
      }

      const response = await fetch('/api/v1/affiliates/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          amount,
          paymentMethod: formData.paymentMethod,
          bankDetails: formData.bankDetails || undefined,
        }),
      });

      if (response.ok) {
        setSuccess('Withdrawal request submitted successfully!');
        setShowForm(false);
        setFormData({
          amount: '',
          paymentMethod: 'PayPal',
          bankDetails: '',
        });
        await loadWithdrawals();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to submit withdrawal request');
      }
    } catch (error) {
      setError('Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading withdrawals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Available Balance Card */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm font-medium mb-1">Available for Withdrawal</p>
            <p className="text-4xl font-bold">${availableBalance.toFixed(2)}</p>
            <p className="text-xs text-green-100 mt-2">Minimum withdrawal: $50.00</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            disabled={availableBalance < 50}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Request Withdrawal
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <p className="text-green-600 dark:text-green-400">{success}</p>
          </div>
        </div>
      )}

      {/* Request Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Request Withdrawal
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="50"
                  max={availableBalance}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0.00"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Available: ${availableBalance.toFixed(2)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Method *
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="PayPal">PayPal</option>
                <option value="Stripe">Stripe</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            {formData.paymentMethod === 'Bank Transfer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bank Details
                </label>
                <textarea
                  value={formData.bankDetails}
                  onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                  rows={3}
                  placeholder="Enter your bank account details (encrypted)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                <strong>Processing Time:</strong> Withdrawals are typically processed within 3-5
                business days. You will receive an email notification once your withdrawal is
                approved.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Withdrawals History */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Withdrawal History
          </h3>
        </div>

        {withdrawals.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No withdrawal requests yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Requested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Transaction ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {withdrawals.map((withdrawal) => {
                  const config = statusConfig[withdrawal.status];
                  const StatusIcon = config.icon;

                  return (
                    <tr key={withdrawal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          ${withdrawal.amount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {withdrawal.paymentMethod || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} ${config.border} border`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(withdrawal.requestedAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {withdrawal.completedAt
                          ? format(new Date(withdrawal.completedAt), 'MMM d, yyyy')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {withdrawal.transactionId ? (
                          <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {withdrawal.transactionId}
                          </code>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
