import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Budget {
  id: string;
  name: string;
  amount: number;
  budgetType: string;
  period: string;
  isActive: boolean;
  createdAt: string;
}

interface FinancialPlan {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  timeframe: string;
  priority: string;
  status: string;
}

export default function Budgeting() {
  const [activeTab, setActiveTab] = useState('budgets');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [plans, setPlans] = useState<FinancialPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [newBudget, setNewBudget] = useState({
    name: '',
    amount: '',
    budgetType: 'spending',
    period: 'month',
    categories: [],
  });

  const [newPlan, setNewPlan] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    timeframe: '1year',
    priority: 'medium',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'budgets') {
        const res = await axios.get('/api/v1/budgets');
        setBudgets(res.data.budgets || []);
      } else if (activeTab === 'plans') {
        const res = await axios.get('/api/v1/budgets/plans');
        setPlans(res.data || []);
      }
    } catch (error) {
      console.error('Error fetching budgeting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBudget = async () => {
    try {
      if (!newBudget.name.trim() || !newBudget.amount) {
        alert('Please enter budget name and amount');
        return;
      }

      await axios.post('/api/v1/budgets', newBudget);
      setNewBudget({
        name: '',
        amount: '',
        budgetType: 'spending',
        period: 'month',
        categories: [],
      });
      fetchData();
    } catch (error) {
      console.error('Error creating budget:', error);
      alert('Failed to create budget');
    }
  };

  const deleteBudget = async (budgetId: string) => {
    if (!confirm('Delete this budget?')) return;

    try {
      await axios.delete(`/api/v1/budgets/${budgetId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting budget:', error);
      alert('Failed to delete budget');
    }
  };

  const createPlan = async () => {
    try {
      if (!newPlan.name.trim() || !newPlan.targetAmount) {
        alert('Please enter plan name and target amount');
        return;
      }

      await axios.post('/api/v1/budgets/plans', newPlan);
      setNewPlan({
        name: '',
        targetAmount: '',
        currentAmount: '',
        timeframe: '1year',
        priority: 'medium',
      });
      fetchData();
    } catch (error) {
      console.error('Error creating plan:', error);
      alert('Failed to create plan');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Budgeting & Financial Planning</h1>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-8">
          {[
            { id: 'budgets', label: 'Budgets' },
            { id: 'plans', label: 'Financial Plans' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'budgets' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Budget</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newBudget.name}
                onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Budget name"
              />

              <div className="grid grid-cols-3 gap-4">
                <input
                  type="number"
                  value={newBudget.amount}
                  onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Amount"
                />

                <select
                  value={newBudget.budgetType}
                  onChange={(e) => setNewBudget({ ...newBudget, budgetType: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="spending">Spending</option>
                  <option value="revenue">Revenue</option>
                  <option value="savings">Savings</option>
                </select>

                <select
                  value={newBudget.period}
                  onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="month">Monthly</option>
                  <option value="quarter">Quarterly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>

              <button
                onClick={createBudget}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Create Budget
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {budgets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No budgets yet</div>
            ) : (
              budgets.map((budget) => (
                <div
                  key={budget.id}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{budget.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ${budget.amount} " {budget.period}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteBudget(budget.id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }} />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">65% used</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Financial Plan</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newPlan.name}
                onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Plan name"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  value={newPlan.targetAmount}
                  onChange={(e) => setNewPlan({ ...newPlan, targetAmount: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Target amount"
                />

                <input
                  type="number"
                  value={newPlan.currentAmount}
                  onChange={(e) => setNewPlan({ ...newPlan, currentAmount: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Current amount"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select
                  value={newPlan.timeframe}
                  onChange={(e) => setNewPlan({ ...newPlan, timeframe: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="3months">3 Months</option>
                  <option value="6months">6 Months</option>
                  <option value="1year">1 Year</option>
                  <option value="2years">2 Years</option>
                  <option value="5years">5 Years</option>
                </select>

                <select
                  value={newPlan.priority}
                  onChange={(e) => setNewPlan({ ...newPlan, priority: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <button
                onClick={createPlan}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Create Plan
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {plans.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No plans yet</div>
            ) : (
              plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Target: ${plan.targetAmount} " {plan.timeframe}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        plan.progress >= 100
                          ? 'bg-green-100 text-green-800'
                          : plan.progress >= 50
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {Math.round(plan.progress)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        plan.progress >= 100 ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(plan.progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    ${plan.currentAmount.toFixed(2)} of ${plan.targetAmount.toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
