import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { TrendingDown } from 'lucide-react';

interface StepAnalysis {
  step: string;
  stepNumber: number;
  totalUsers: number;
  conversionRate: number;
  dropOffRate: number;
  avgTimeToNext: number;
  avgTimeFromStart: number;
}

interface FunnelChartProps {
  steps: StepAnalysis[];
}

const FunnelChart: React.FC<FunnelChartProps> = ({ steps }) => {
  // Prepare chart data
  const chartData = useMemo(() => {
    return steps.map((step, index) => ({
      name: step.step,
      users: step.totalUsers,
      conversionRate: step.conversionRate,
      dropOffRate: step.dropOffRate,
      percentage: index === 0 ? 100 : (step.totalUsers / steps[0].totalUsers) * 100,
    }));
  }, [steps]);

  // Color gradient based on conversion rate
  const getBarColor = (conversionRate: number, index: number): string => {
    if (index === steps.length - 1) return '#10b981'; // Last step is always green
    if (conversionRate >= 80) return '#22c55e'; // High conversion
    if (conversionRate >= 60) return '#eab308'; // Medium conversion
    if (conversionRate >= 40) return '#f97316'; // Low conversion
    return '#ef4444'; // Very low conversion
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">{data.name}</p>
        <div className="space-y-1 text-sm">
          <p className="text-gray-700 dark:text-gray-300">
            Users: <span className="font-semibold">{data.users.toLocaleString()}</span>
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            Retention: <span className="font-semibold">{data.percentage.toFixed(1)}%</span>
          </p>
          {data.conversionRate > 0 && data.conversionRate < 100 && (
            <p className="text-gray-700 dark:text-gray-300">
              Conversion: <span className="font-semibold">{data.conversionRate.toFixed(1)}%</span>
            </p>
          )}
          {data.dropOffRate > 0 && (
            <p className="text-red-600 dark:text-red-400">
              Drop-off: <span className="font-semibold">{data.dropOffRate.toFixed(1)}%</span>
            </p>
          )}
        </div>
      </div>
    );
  };

  // Custom label renderer
  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-semibold"
      >
        {value.toLocaleString()}
      </text>
    );
  };

  return (
    <div className="w-full">
      {/* Funnel Visualization */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis type="number" stroke="#6b7280" />
          <YAxis dataKey="name" type="category" width={150} stroke="#6b7280" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }} />
          <Bar dataKey="users" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.conversionRate, index)} />
            ))}
            <LabelList dataKey="users" content={renderCustomLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Funnel Steps Summary */}
      <div className="mt-6 space-y-3">
        {steps.map((step, index) => {
          const previousStep = index > 0 ? steps[index - 1] : null;
          const usersLost = previousStep ? previousStep.totalUsers - step.totalUsers : 0;
          const lossPercentage = previousStep
            ? ((usersLost / previousStep.totalUsers) * 100).toFixed(1)
            : '0.0';

          return (
            <div key={index} className="relative">
              {/* Step Bar */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {index + 1}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{step.step}</h4>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {step.totalUsers.toLocaleString()} users
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {((step.totalUsers / steps[0].totalUsers) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(step.totalUsers / steps[0].totalUsers) * 100}%`,
                        backgroundColor: getBarColor(step.conversionRate, index),
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Drop-off Indicator */}
              {index < steps.length - 1 && usersLost > 0 && (
                <div className="ml-16 mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <TrendingDown className="w-4 h-4" />
                  <span>
                    {usersLost.toLocaleString()} users dropped off ({lossPercentage}%)
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Conversion Rate Legend
        </h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
            <span className="text-sm text-gray-600 dark:text-gray-400">High (≥80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }} />
            <span className="text-sm text-gray-600 dark:text-gray-400">Medium (60-79%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
            <span className="text-sm text-gray-600 dark:text-gray-400">Low (40-59%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-sm text-gray-600 dark:text-gray-400">Very Low (&lt;40%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
            <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FunnelChart;
