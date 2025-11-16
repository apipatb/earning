import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

interface StepAnalysis {
  step: string;
  stepNumber: number;
  totalUsers: number;
  conversionRate: number;
  dropOffRate: number;
  avgTimeToNext: number;
  avgTimeFromStart: number;
}

interface FunnelMetricsProps {
  steps: StepAnalysis[];
}

const FunnelMetrics: React.FC<FunnelMetricsProps> = ({ steps }) => {
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getConversionColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-600 dark:text-green-400';
    if (rate >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (rate >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConversionBgColor = (rate: number): string => {
    if (rate >= 80) return 'bg-green-50 dark:bg-green-900/20';
    if (rate >= 60) return 'bg-yellow-50 dark:bg-yellow-900/20';
    if (rate >= 40) return 'bg-orange-50 dark:bg-orange-900/20';
    return 'bg-red-50 dark:bg-red-900/20';
  };

  const getConversionIcon = (rate: number) => {
    if (rate >= 70) return <TrendingUp className="w-5 h-5" />;
    if (rate >= 40) return <ArrowRight className="w-5 h-5" />;
    return <TrendingDown className="w-5 h-5" />;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900/50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Step
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Users
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Retention
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Conversion
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Drop-off
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Time to Next
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Time from Start
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {steps.map((step, index) => {
            const retentionRate = (step.totalUsers / steps[0].totalUsers) * 100;
            const isLastStep = index === steps.length - 1;

            return (
              <tr
                key={index}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {/* Step Name */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {step.step}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Step {step.stepNumber + 1}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Total Users */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {step.totalUsers.toLocaleString()}
                    </span>
                  </div>
                </td>

                {/* Retention Rate */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {retentionRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${retentionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </td>

                {/* Conversion Rate */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {!isLastStep ? (
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getConversionBgColor(
                        step.conversionRate
                      )}`}
                    >
                      <span className={`${getConversionColor(step.conversionRate)}`}>
                        {getConversionIcon(step.conversionRate)}
                      </span>
                      <span
                        className={`text-sm font-semibold ${getConversionColor(
                          step.conversionRate
                        )}`}
                      >
                        {step.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>

                {/* Drop-off Rate */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {!isLastStep && step.dropOffRate > 0 ? (
                    <div className="flex items-center gap-2">
                      {step.dropOffRate > 30 && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          step.dropOffRate > 30
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {step.dropOffRate.toFixed(1)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>

                {/* Avg Time to Next Step */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {!isLastStep && step.avgTimeToNext > 0 ? (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatDuration(step.avgTimeToNext)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>

                {/* Avg Time from Start */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {step.avgTimeFromStart > 0 ? (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatDuration(step.avgTimeFromStart)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary Statistics */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Conversion */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg p-4">
            <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-1">
              Overall Conversion
            </p>
            <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-200">
              {steps.length > 0
                ? ((steps[steps.length - 1].totalUsers / steps[0].totalUsers) * 100).toFixed(1)
                : 0}
              %
            </p>
          </div>

          {/* Average Conversion */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
            <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
              Avg Step Conversion
            </p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-200">
              {steps.length > 0
                ? (
                    steps
                      .slice(0, -1)
                      .reduce((sum, step) => sum + step.conversionRate, 0) /
                    (steps.length - 1)
                  ).toFixed(1)
                : 0}
              %
            </p>
          </div>

          {/* Total Users Lost */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
              Total Users Lost
            </p>
            <p className="text-2xl font-bold text-red-900 dark:text-red-200">
              {steps.length > 0
                ? (steps[0].totalUsers - steps[steps.length - 1].totalUsers).toLocaleString()
                : 0}
            </p>
          </div>

          {/* Total Journey Time */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
              Avg Total Time
            </p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
              {steps.length > 0
                ? formatDuration(steps[steps.length - 1].avgTimeFromStart)
                : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Key Insights
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Biggest Drop-off */}
          {(() => {
            const biggestDropOff = steps
              .slice(0, -1)
              .reduce((max, step) => (step.dropOffRate > max.dropOffRate ? step : max));

            return biggestDropOff.dropOffRate > 0 ? (
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Biggest Drop-off
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {biggestDropOff.dropOffRate.toFixed(1)}% of users leave at "
                    {biggestDropOff.step}"
                  </p>
                </div>
              </div>
            ) : null;
          })()}

          {/* Best Conversion */}
          {(() => {
            const bestConversion = steps
              .slice(0, -1)
              .reduce((max, step) => (step.conversionRate > max.conversionRate ? step : max));

            return bestConversion.conversionRate > 0 ? (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Best Conversion
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {bestConversion.conversionRate.toFixed(1)}% convert from "{bestConversion.step}
                    "
                  </p>
                </div>
              </div>
            ) : null;
          })()}

          {/* Slowest Step */}
          {(() => {
            const slowestStep = steps
              .slice(0, -1)
              .reduce((max, step) => (step.avgTimeToNext > max.avgTimeToNext ? step : max));

            return slowestStep.avgTimeToNext > 0 ? (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Slowest Step
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Users spend {formatDuration(slowestStep.avgTimeToNext)} at "
                    {slowestStep.step}"
                  </p>
                </div>
              </div>
            ) : null;
          })()}

          {/* Fastest Step */}
          {(() => {
            const fastestStep = steps
              .slice(0, -1)
              .filter((step) => step.avgTimeToNext > 0)
              .reduce((min, step) => (step.avgTimeToNext < min.avgTimeToNext ? step : min), steps[0]);

            return fastestStep.avgTimeToNext > 0 ? (
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Fastest Step
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Users spend only {formatDuration(fastestStep.avgTimeToNext)} at "
                    {fastestStep.step}"
                  </p>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
};

export default FunnelMetrics;
