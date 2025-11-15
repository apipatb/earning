import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  Search,
  TrendingUp,
  Target,
  AlertCircle,
  BarChart3,
  PieChart,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  ChevronRight,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface FinancialPlan {
  id: string;
  name: string;
  description?: string;
  timeHorizon: string;
  riskProfile: string;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

interface Scenario {
  id: string;
  name: string;
  incomeGrowth: number;
  expenseGrowth: number;
  savingsRate: number;
}

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
  priority: string;
  status: string;
}

interface Forecast {
  date: string;
  incomeProjection: number;
  expenseProjection: number;
  savingsProjection: number;
}

const FinancialPlan: React.FC = () => {
  const [activeTab, setActiveTab] = useState('plans');
  const [plans, setPlans] = useState<FinancialPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<FinancialPlan | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const apiClient = axios.create({
    baseURL: 'http://localhost:5000/api/v1',
    headers: {
      Authorization: 'Bearer ' + (localStorage.getItem('token') || ''),
    },
  });

  useEffect(() => {
    fetchAllData();
  }, [activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'plans') {
        const res = await apiClient.get('/financialplan/plans');
        setPlans(res.data);
      } else if (activeTab === 'scenarios' && selectedPlan) {
        const res = await apiClient.get(`/financialplan/plans/${selectedPlan.id}/scenarios`);
        setScenarios(res.data);
      } else if (activeTab === 'goals' && selectedPlan) {
        const res = await apiClient.get(`/financialplan/plans/${selectedPlan.id}/goals`);
        setGoals(res.data);
      } else if (activeTab === 'forecasts' && selectedPlan) {
        const res = await apiClient.get(`/financialplan/plans/${selectedPlan.id}/forecasts`);
        setForecasts(res.data);
      } else if (activeTab === 'analytics') {
        const res = await apiClient.get('/financialplan/analytics');
        setAnalytics(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: FinancialPlan) => {
    setSelectedPlan(plan);
  };

  const handleCreatePlan = async (formData: any) => {
    try {
      await apiClient.post('/financialplan/plans', formData);
      setShowCreateForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Failed to create plan:', error);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await apiClient.delete(`/financialplan/plans/${planId}`);
      fetchAllData();
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'conservative':
        return 'bg-green-900 text-green-200';
      case 'moderate':
        return 'bg-blue-900 text-blue-200';
      case 'aggressive':
        return 'bg-red-900 text-red-200';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  const getTimeHorizonIcon = (horizon: string) => {
    switch (horizon) {
      case 'short_term':
        return '⏱️';
      case 'medium_term':
        return '📅';
      case 'long_term':
        return '🎯';
      default:
        return '📊';
    }
  };

  const calculateProgress = (goal: Goal) => {
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Financial Planning & Forecasting</h1>
          <p className="text-slate-400">Create comprehensive financial plans, scenarios, and forecasts</p>
        </div>

        <div className="flex gap-2 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 ${activeTab === 'plans' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          >
            Plans
          </button>
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`px-4 py-2 ${activeTab === 'scenarios' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
            disabled={!selectedPlan}
          >
            Scenarios
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-4 py-2 ${activeTab === 'goals' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
            disabled={!selectedPlan}
          >
            Goals
          </button>
          <button
            onClick={() => setActiveTab('forecasts')}
            className={`px-4 py-2 ${activeTab === 'forecasts' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
            disabled={!selectedPlan}
          >
            Forecasts
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 ${activeTab === 'analytics' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
          >
            Analytics
          </button>
        </div>

        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                <Plus className="w-5 h-5" />
                New Plan
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 pl-10 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans
                .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => {
                      handleSelectPlan(plan);
                      setActiveTab('scenarios');
                    }}
                    className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-blue-500 cursor-pointer transition"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{getTimeHorizonIcon(plan.timeHorizon)}</span>
                          <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                        </div>
                        <p className="text-sm text-slate-400">{plan.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getRiskColor(plan.riskProfile)}`}>
                        {plan.riskProfile}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Time Horizon:</span>
                        <span className="text-white font-medium">{plan.timeHorizon.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <span className="text-green-400 font-medium">{plan.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Duration:</span>
                        <span className="text-white text-xs">
                          {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm">
                        <ChevronRight className="w-4 h-4" />
                        View Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlan(plan.id);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'scenarios' && selectedPlan && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">{selectedPlan.name}</h2>
              <p className="text-slate-400 mb-4">{selectedPlan.description}</p>
            </div>

            {scenarios.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h3 className="text-lg font-bold text-white mb-4">{scenario.name}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Income Growth:</span>
                        <span className="text-green-400 font-semibold">{scenario.incomeGrowth}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Expense Growth:</span>
                        <span className="text-orange-400 font-semibold">{scenario.expenseGrowth}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Savings Rate:</span>
                        <span className="text-blue-400 font-semibold">{scenario.savingsRate}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'goals' && selectedPlan && (
          <div className="space-y-6">
            {goals.length > 0 && (
              <div className="space-y-3">
                {goals.map((goal) => {
                  const progress = calculateProgress(goal);
                  return (
                    <div key={goal.id} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-white">{goal.name}</h3>
                          <p className="text-sm text-slate-400">{goal.category}</p>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-medium ${
                          goal.status === 'completed' ? 'bg-green-900 text-green-200' : 'bg-blue-900 text-blue-200'
                        }`}>
                          {goal.status}
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-slate-400">Progress</span>
                          <span className="text-sm font-semibold text-white">${goal.currentAmount} / ${goal.targetAmount}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Target Date:</span>
                        <span className="text-white">{new Date(goal.targetDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'forecasts' && selectedPlan && (
          <div className="space-y-6">
            {forecasts.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-6">12-Month Forecast</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-white">Income vs Expense</h4>
                    {forecasts.slice(0, 6).map((f, i) => (
                      <div key={i} className="flex justify-between text-sm bg-slate-700 p-3 rounded">
                        <span className="text-slate-300">{new Date(f.date).toLocaleDateString()}</span>
                        <div className="text-right">
                          <div className="text-green-400">${f.incomeProjection}</div>
                          <div className="text-orange-400">${f.expenseProjection}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-white">Savings Projection</h4>
                    {forecasts.slice(0, 6).map((f, i) => (
                      <div key={i} className="flex justify-between text-sm bg-slate-700 p-3 rounded">
                        <span className="text-slate-300">{new Date(f.date).toLocaleDateString()}</span>
                        <span className="text-blue-400 font-semibold">${f.savingsProjection}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Total Plans</p>
                <p className="text-3xl font-bold">{analytics.planMetrics?.totalPlans}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Active Goals</p>
                <p className="text-3xl font-bold">{analytics.goalMetrics?.totalGoals}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Goal Progress</p>
                <p className="text-3xl font-bold">{analytics.goalMetrics?.progressPercentage}%</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                <p className="text-sm opacity-80">Risk Factors</p>
                <p className="text-3xl font-bold">{analytics.riskMetrics?.totalRisks}</p>
              </div>
            </div>

            {analytics.forecastTrends && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Financial Trends</h3>
                <div className="space-y-2 text-sm">
                  {analytics.forecastTrends.slice(0, 5).map((trend: any, i: number) => (
                    <div key={i} className="flex justify-between bg-slate-700 p-3 rounded">
                      <span className="text-slate-300">{new Date(trend.date).toLocaleDateString()}</span>
                      <span className="text-blue-400">Cash Flow: ${trend.cashFlow}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Create Financial Plan</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreatePlan({ name: 'New Plan', startDate: new Date(), endDate: new Date() });
                }}
                className="space-y-4"
              >
                <input
                  type="text"
                  placeholder="Plan Name"
                  required
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg"
                />
                <select className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg">
                  <option>Short Term (1-3 years)</option>
                  <option>Medium Term (3-10 years)</option>
                  <option>Long Term (10+ years)</option>
                </select>
                <select className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg">
                  <option>Conservative</option>
                  <option>Moderate</option>
                  <option>Aggressive</option>
                </select>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                  Create Plan
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialPlan;
