import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface ForecastData {
  date: string;
  quantity: number;
  confidence: number;
  method: string;
}

interface ForecastChartProps {
  productId: string;
}

const ForecastChart: React.FC<ForecastChartProps> = ({ productId }) => {
  const [forecasts, setForecasts] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(false);
  const [productName, setProductName] = useState('');
  const [currentStock, setCurrentStock] = useState(0);
  const [method, setMethod] = useState<'MOVING_AVG' | 'EXPONENTIAL' | 'LINEAR' | 'DEMAND'>(
    'DEMAND'
  );
  const [days, setDays] = useState(30);
  const [period, setPeriod] = useState(7);
  const [alpha, setAlpha] = useState(0.3);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchForecast();
  }, [productId]);

  const fetchForecast = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/v1/inventory/forecasts/${productId}?days=${days}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setProductName(response.data.productName);
      setCurrentStock(response.data.currentStock);
      setForecasts(
        response.data.forecasts.map((f: any) => ({
          date: new Date(f.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          quantity: f.quantity,
          confidence: f.confidence,
          method: f.method,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch forecast:', error);
    }
  };

  const generateForecast = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/v1/inventory/forecasts`,
        {
          productId,
          method,
          days,
          period,
          alpha,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await fetchForecast();
    } catch (error) {
      console.error('Failed to generate forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    {
      date: 'Current',
      quantity: currentStock,
      forecasted: null,
      upperBound: null,
      lowerBound: null,
    },
    ...forecasts.map((f, index) => ({
      date: f.date,
      quantity: index === 0 ? currentStock : null,
      forecasted: f.quantity,
      upperBound: f.quantity * (1 + (100 - f.confidence) / 100),
      lowerBound: Math.max(0, f.quantity * (1 - (100 - f.confidence) / 100)),
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Method
            </label>
            <select
              value={method}
              onChange={(e) =>
                setMethod(e.target.value as 'MOVING_AVG' | 'EXPONENTIAL' | 'LINEAR' | 'DEMAND')
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="DEMAND">Demand (with Seasonality)</option>
              <option value="MOVING_AVG">Moving Average</option>
              <option value="EXPONENTIAL">Exponential Smoothing</option>
              <option value="LINEAR">Linear Regression</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Forecast Days
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              min="7"
              max="90"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {method === 'MOVING_AVG' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period (days)
              </label>
              <input
                type="number"
                value={period}
                onChange={(e) => setPeriod(parseInt(e.target.value))}
                min="3"
                max="30"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

          {method === 'EXPONENTIAL' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alpha (0.1-0.9)
              </label>
              <input
                type="number"
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                min="0.1"
                max="0.9"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={generateForecast}
              disabled={loading}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Forecast'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Product Info */}
      {productName && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{productName}</h3>
              <p className="text-sm text-gray-600">Demand Forecast Analysis</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Current Stock</p>
              <p className="text-2xl font-bold text-gray-900">{currentStock}</p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {forecasts.length > 0 ? (
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">
            Forecasted Demand - Next {days} Days
          </h4>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                label={{ value: 'Quantity', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                }}
              />
              <Legend />

              {/* Confidence Band */}
              <Area
                type="monotone"
                dataKey="upperBound"
                stroke="none"
                fill="#93c5fd"
                fillOpacity={0.3}
                name="Upper Bound"
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                stroke="none"
                fill="#93c5fd"
                fillOpacity={0.3}
                name="Lower Bound"
              />

              {/* Actual Quantity */}
              <Line
                type="monotone"
                dataKey="quantity"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 5 }}
                name="Current Stock"
              />

              {/* Forecasted Quantity */}
              <Line
                type="monotone"
                dataKey="forecasted"
                stroke="#dc2626"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                name="Forecasted Demand"
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Forecast Summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Average Daily Demand</p>
              <p className="text-2xl font-bold text-gray-900">
                {(forecasts.reduce((sum, f) => sum + f.quantity, 0) / forecasts.length).toFixed(
                  2
                )}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Forecasted Demand</p>
              <p className="text-2xl font-bold text-gray-900">
                {forecasts.reduce((sum, f) => sum + f.quantity, 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Average Confidence</p>
              <p className="text-2xl font-bold text-gray-900">
                {(
                  forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length
                ).toFixed(0)}
                %
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            No forecast data available. Click "Generate Forecast" to create one.
          </p>
        </div>
      )}
    </div>
  );
};

export default ForecastChart;
