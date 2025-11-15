import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface AnomalyData {
  date: string;
  amount: number;
  expectedAmount: number;
  deviationPercent: number;
  type: 'spike' | 'dip';
}

interface ForecastData {
  day: number;
  predictedEarnings: number;
  upperBound: number;
  lowerBound: number;
  confidence: number;
}

interface Recommendation {
  type: string;
  priority: string;
  message: string;
  action: string;
}

interface PlatformInsight {
  platform: string;
  totalEarnings: number;
  avgEarnings: number;
  trend: string;
  trendStrength: number;
}

export default function AIInsights() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('insights');
  const [period, setPeriod] = useState('month');

  // Insights state
  const [insights, setInsights] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [savedInsights, setSavedInsights] = useState<any[]>([]);

  useEffect(() => {
    fetchAIInsights();
  }, [period]);

  const fetchAIInsights = async () => {
    try {
      setLoading(true);
      const [insightsRes, recsRes, anomaliesRes, forecastRes, savedRes] = await Promise.all([
        axios.get('/api/ai/insights', { params: { period } }),
        axios.get('/api/ai/recommendations'),
        axios.get('/api/ai/anomalies'),
        axios.get('/api/ai/forecast'),
        axios.get('/api/ai/insights/saved'),
      ]);

      setInsights(insightsRes.data);
      setRecommendations(recsRes.data.recommendations);
      setAnomalies(anomaliesRes.data.anomalies);
      setForecast(forecastRes.data.forecast);
      setSavedInsights(savedRes.data);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInsight = async (insight: any) => {
    try {
      await axios.post('/api/ai/insights/save', {
        title: `${insight.type} Insight - ${new Date().toLocaleDateString()}`,
        content: insight.message,
        category: insight.type,
        insights: insight,
      });
      fetchAIInsights();
    } catch (error) {
      console.error('Error saving insight:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading AI Insights...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">AI-Powered Insights</h1>
          <p className="text-gray-400">Machine learning analysis of your earnings patterns</p>
        </div>

        {/* Period Selector */}
        <div className="mb-6 flex gap-4">
          {['week', 'month', 'quarter'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-700 flex gap-8">
          {[
            { id: 'insights', label: '📊 Insights' },
            { id: 'forecast', label: '🔮 Forecast' },
            { id: 'recommendations', label: '💡 Recommendations' },
            { id: 'anomalies', label: '⚠️ Anomalies' },
            { id: 'saved', label: '💾 Saved' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 border-b-2 font-medium transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Insights Tab */}
          {activeTab === 'insights' && insights && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="text-gray-400 text-sm">Total Earnings</div>
                  <div className="text-3xl font-bold text-green-400 mt-2">
                    ${insights.summary.totalEarnings.toFixed(2)}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="text-gray-400 text-sm">Average Daily</div>
                  <div className="text-3xl font-bold text-blue-400 mt-2">
                    ${insights.summary.avgDaily.toFixed(2)}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="text-gray-400 text-sm">Trend</div>
                  <div className={`text-3xl font-bold mt-2 ${
                    insights.summary.trend === 'improving' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {insights.summary.trend}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="text-gray-400 text-sm">Days Tracked</div>
                  <div className="text-3xl font-bold text-purple-400 mt-2">
                    {insights.summary.daysTracked}
                  </div>
                </div>
              </div>

              {/* Platform Insights */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">Platform Performance</h2>
                <div className="space-y-3">
                  {insights.platformInsights.map((platform: PlatformInsight, idx: number) => (
                    <div key={idx} className="bg-gray-700 rounded p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-white">{platform.platform}</h3>
                          <p className="text-sm text-gray-400">
                            ${platform.totalEarnings.toFixed(2)} total • Avg ${platform.avgEarnings.toFixed(2)}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          platform.trend === 'increasing'
                            ? 'bg-green-900 text-green-300'
                            : platform.trend === 'decreasing'
                            ? 'bg-red-900 text-red-300'
                            : 'bg-gray-600 text-gray-300'
                        }`}>
                          {platform.trend}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patterns & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h2 className="text-xl font-bold text-white mb-4">Detected Patterns</h2>
                  {insights.patterns.length > 0 ? (
                    <div className="space-y-2">
                      {insights.patterns.map((pattern: string, idx: number) => (
                        <div key={idx} className="bg-gray-700 rounded px-4 py-2 text-gray-300">
                          • {pattern.replace(/_/g, ' ').toUpperCase()}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">No specific patterns detected yet</p>
                  )}
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h2 className="text-xl font-bold text-white mb-4">Key Insights</h2>
                  <div className="space-y-3">
                    {insights.recommendations.slice(0, 2).map((rec: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-blue-900 bg-opacity-30 rounded px-4 py-3 border border-blue-700"
                      >
                        <p className="text-blue-300 text-sm">{rec.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Forecast Tab */}
          {activeTab === 'forecast' && forecast.length > 0 && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">Next 30 Days Forecast</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400">Day</th>
                        <th className="text-left py-3 px-4 text-gray-400">Predicted</th>
                        <th className="text-left py-3 px-4 text-gray-400">Upper Bound</th>
                        <th className="text-left py-3 px-4 text-gray-400">Lower Bound</th>
                        <th className="text-left py-3 px-4 text-gray-400">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.slice(0, 10).map((f: ForecastData, idx: number) => (
                        <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700">
                          <td className="py-3 px-4 text-white">Day {f.day}</td>
                          <td className="py-3 px-4 text-green-400">${f.predictedEarnings.toFixed(2)}</td>
                          <td className="py-3 px-4 text-blue-400">${f.upperBound.toFixed(2)}</td>
                          <td className="py-3 px-4 text-orange-400">${f.lowerBound.toFixed(2)}</td>
                          <td className="py-3 px-4 text-gray-400">{f.confidence}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {recommendations.length > 0 ? (
                recommendations.map((rec: Recommendation, idx: number) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-6 border ${
                      rec.priority === 'high'
                        ? 'bg-red-900 bg-opacity-30 border-red-700'
                        : rec.priority === 'medium'
                        ? 'bg-yellow-900 bg-opacity-30 border-yellow-700'
                        : 'bg-blue-900 bg-opacity-30 border-blue-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-2">{rec.message}</h3>
                        <p className="text-gray-300">{rec.action}</p>
                      </div>
                      <button
                        onClick={() => handleSaveInsight(rec)}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-400">No recommendations at this time</div>
              )}
            </div>
          )}

          {/* Anomalies Tab */}
          {activeTab === 'anomalies' && (
            <div className="space-y-6">
              {anomalies.length > 0 ? (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h2 className="text-xl font-bold text-white mb-4">Detected Anomalies</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-gray-400">Date</th>
                          <th className="text-left py-3 px-4 text-gray-400">Amount</th>
                          <th className="text-left py-3 px-4 text-gray-400">Expected</th>
                          <th className="text-left py-3 px-4 text-gray-400">Deviation</th>
                          <th className="text-left py-3 px-4 text-gray-400">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anomalies.map((anom: AnomalyData, idx: number) => (
                          <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700">
                            <td className="py-3 px-4 text-white">{anom.date}</td>
                            <td className="py-3 px-4 text-green-400">${anom.amount.toFixed(2)}</td>
                            <td className="py-3 px-4 text-gray-400">${anom.expectedAmount.toFixed(2)}</td>
                            <td className="py-3 px-4 font-semibold">{anom.deviationPercent.toFixed(1)}%</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-sm font-medium ${
                                anom.type === 'spike'
                                  ? 'bg-red-900 text-red-300'
                                  : 'bg-orange-900 text-orange-300'
                              }`}>
                                {anom.type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">No anomalies detected</div>
              )}
            </div>
          )}

          {/* Saved Insights Tab */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              {savedInsights.length > 0 ? (
                savedInsights.map((insight: any, idx: number) => (
                  <div key={idx} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{insight.title}</h3>
                        <p className="text-gray-400 mt-2">{insight.content}</p>
                        <div className="mt-3 text-xs text-gray-500">
                          {new Date(insight.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-gray-700 rounded-full text-xs text-gray-300">
                        {insight.category}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-400">No saved insights yet</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
