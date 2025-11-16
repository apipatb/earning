import { useEffect, useState } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Calendar, DollarSign, Clock, Zap, ArrowRight } from 'lucide-react';

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'tip';
  category: 'earnings' | 'productivity' | 'goals' | 'trends' | 'recommendations';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  icon: any;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function SmartInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    generateInsights();
  }, []);

  const generateInsights = () => {
    const earnings = JSON.parse(localStorage.getItem('earnings') || '[]');
    const timeEntries = JSON.parse(localStorage.getItem('time_entries') || '[]');
    const goals = JSON.parse(localStorage.getItem('savings_goals') || '[]');
    const platforms = JSON.parse(localStorage.getItem('platforms') || '[]');

    const generatedInsights: Insight[] = [];

    // Analyze earnings trends
    if (earnings.length > 0) {
      const sortedEarnings = [...earnings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const last7Days = sortedEarnings.filter(e => {
        const date = new Date(e.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo;
      });
      const prev7Days = sortedEarnings.filter(e => {
        const date = new Date(e.date);
        const twoWeeksAgo = new Date();
        const weekAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= twoWeeksAgo && date < weekAgo;
      });

      const last7Total = last7Days.reduce((sum, e) => sum + e.amount, 0);
      const prev7Total = prev7Days.reduce((sum, e) => sum + e.amount, 0);

      if (prev7Total > 0) {
        const change = ((last7Total - prev7Total) / prev7Total) * 100;

        if (change > 20) {
          generatedInsights.push({
            id: 'earnings-up',
            type: 'success',
            category: 'trends',
            title: 'Earnings Surge!',
            description: `Your earnings are up ${change.toFixed(0)}% this week compared to last week. Great momentum!`,
            impact: 'high',
            icon: TrendingUp,
          });
        } else if (change < -20) {
          generatedInsights.push({
            id: 'earnings-down',
            type: 'warning',
            category: 'trends',
            title: 'Earnings Decline',
            description: `Your earnings are down ${Math.abs(change).toFixed(0)}% this week. Consider reviewing your strategies.`,
            impact: 'high',
            icon: TrendingDown,
          });
        }
      }

      // Best earning day
      const earningsByDay = earnings.reduce((acc: any, e: any) => {
        const day = new Date(e.date).toLocaleDateString('en-US', { weekday: 'long' });
        acc[day] = (acc[day] || 0) + e.amount;
        return acc;
      }, {});

      const bestDay = Object.entries(earningsByDay).sort(([, a]: any, [, b]: any) => b - a)[0];
      if (bestDay) {
        generatedInsights.push({
          id: 'best-day',
          type: 'info',
          category: 'trends',
          title: `${bestDay[0]} is Your Best Day`,
          description: `You earn the most on ${bestDay[0]}s. Schedule important work on this day for maximum returns.`,
          impact: 'medium',
          icon: Calendar,
        });
      }

      // Platform concentration
      const earningsByPlatform = earnings.reduce((acc: any, e: any) => {
        const platformName = platforms.find((p: any) => p.id === e.platformId)?.name || 'Unknown';
        acc[platformName] = (acc[platformName] || 0) + e.amount;
        return acc;
      }, {});

      const platformEntries = Object.entries(earningsByPlatform);
      if (platformEntries.length > 1) {
        const topPlatformPct = (platformEntries.sort(([, a]: any, [, b]: any) => b - a)[0][1] as number / earnings.reduce((sum: number, e: any) => sum + e.amount, 0)) * 100;

        if (topPlatformPct > 70) {
          generatedInsights.push({
            id: 'platform-concentration',
            type: 'warning',
            category: 'recommendations',
            title: 'High Platform Concentration',
            description: `${topPlatformPct.toFixed(0)}% of your earnings come from one platform. Consider diversifying your income sources.`,
            impact: 'high',
            icon: AlertTriangle,
          });
        }
      }
    }

    // Analyze productivity
    if (timeEntries.length > 0) {
      const completedEntries = timeEntries.filter((e: any) => e.endTime);
      const totalHours = completedEntries.reduce((sum: number, e: any) => sum + (e.duration / 3600), 0);
      const totalEarnings = earnings.reduce((sum: number, e: any) => sum + e.amount, 0);

      if (totalHours > 0 && totalEarnings > 0) {
        const hourlyRate = totalEarnings / totalHours;

        if (hourlyRate > 50) {
          generatedInsights.push({
            id: 'high-hourly-rate',
            type: 'success',
            category: 'productivity',
            title: 'Excellent Hourly Rate',
            description: `Your average hourly rate of $${hourlyRate.toFixed(2)}/hr is excellent. Keep up the great work!`,
            impact: 'high',
            icon: DollarSign,
          });
        }

        // Daily work hours
        const avgDailyHours = totalHours / 30; // Assuming 30-day period
        if (avgDailyHours > 10) {
          generatedInsights.push({
            id: 'work-life-balance',
            type: 'warning',
            category: 'productivity',
            title: 'Watch Your Work-Life Balance',
            description: `You're averaging ${avgDailyHours.toFixed(1)} hours per day. Consider taking breaks to avoid burnout.`,
            impact: 'medium',
            icon: Clock,
          });
        }
      }
    }

    // Analyze goals
    if (goals.length > 0) {
      const nearCompletionGoals = goals.filter((g: any) => {
        const progress = (g.currentAmount / g.targetAmount) * 100;
        return progress >= 80 && progress < 100;
      });

      if (nearCompletionGoals.length > 0) {
        const goal = nearCompletionGoals[0];
        const remaining = goal.targetAmount - goal.currentAmount;
        generatedInsights.push({
          id: 'goal-near-completion',
          type: 'success',
          category: 'goals',
          title: 'Goal Almost Reached!',
          description: `You're just $${remaining.toFixed(2)} away from completing "${goal.name}". Keep pushing!`,
          impact: 'high',
          icon: Target,
        });
      }

      const stalledGoals = goals.filter((g: any) => {
        const progress = (g.currentAmount / g.targetAmount) * 100;
        const lastUpdate = new Date(g.updatedAt || g.createdAt);
        const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        return progress < 50 && daysSinceUpdate > 30;
      });

      if (stalledGoals.length > 0) {
        generatedInsights.push({
          id: 'stalled-goals',
          type: 'warning',
          category: 'goals',
          title: 'Stalled Goals Detected',
          description: `You have ${stalledGoals.length} goal(s) with little progress in the past month. Review and update them.`,
          impact: 'medium',
          icon: AlertTriangle,
        });
      }
    }

    // General recommendations
    if (earnings.length < 5) {
      generatedInsights.push({
        id: 'track-more-earnings',
        type: 'tip',
        category: 'recommendations',
        title: 'Track More Earnings',
        description: 'Add more earnings entries to unlock deeper insights and better analytics.',
        impact: 'low',
        icon: Lightbulb,
      });
    }

    // Consistency check
    if (earnings.length > 10) {
      const dates = earnings.map((e: any) => new Date(e.date).toDateString());
      const uniqueDates = new Set(dates);
      const avgPerDay = earnings.length / uniqueDates.size;

      if (avgPerDay > 3) {
        generatedInsights.push({
          id: 'good-consistency',
          type: 'success',
          category: 'productivity',
          title: 'Consistent Tracking',
          description: "You're doing a great job tracking your earnings regularly. This helps with better insights!",
          impact: 'low',
          icon: CheckCircle,
        });
      }
    }

    // Peak performance times
    if (timeEntries.length > 20) {
      const entriesByHour = timeEntries.reduce((acc: any, e: any) => {
        const hour = new Date(e.startTime).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});

      const peakHour = Object.entries(entriesByHour).sort(([, a]: any, [, b]: any) => b - a)[0];
      if (peakHour) {
        const hour = parseInt(peakHour[0]);
        const timeStr = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
        generatedInsights.push({
          id: 'peak-hour',
          type: 'info',
          category: 'productivity',
          title: 'Peak Productivity Hour',
          description: `You're most productive around ${timeStr}. Schedule your most important tasks during this time.`,
          impact: 'medium',
          icon: Zap,
        });
      }
    }

    setInsights(generatedInsights);
  };

  const getFilteredInsights = () => {
    if (selectedCategory === 'all') return insights;
    return insights.filter(i => i.category === selectedCategory);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900' };
      case 'warning':
        return { icon: AlertTriangle, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900' };
      case 'info':
        return { icon: Lightbulb, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900' };
      case 'tip':
        return { icon: Zap, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900' };
      default:
        return { icon: Lightbulb, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-900' };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg">
            <Lightbulb className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Smart Insights</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              AI-powered suggestions to optimize your earnings
            </p>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          All ({insights.length})
        </button>
        {(['earnings', 'productivity', 'goals', 'trends', 'recommendations'] as const).map(cat => {
          const count = insights.filter(i => i.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Insights List */}
      {getFilteredInsights().length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Insights Yet</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Keep tracking your earnings and time to unlock personalized insights!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {getFilteredInsights().map(insight => {
            const iconConfig = getIcon(insight.type);
            const Icon = insight.icon;

            return (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border-l-4 ${
                  insight.impact === 'high'
                    ? 'border-red-500 dark:border-red-600'
                    : insight.impact === 'medium'
                    ? 'border-yellow-500 dark:border-yellow-600'
                    : 'border-blue-500 dark:border-blue-600'
                } bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${iconConfig.bg} flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${iconConfig.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {insight.title}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                        insight.impact === 'high'
                          ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                          : insight.impact === 'medium'
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      }`}>
                        {insight.impact.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {insight.description}
                    </p>
                    {insight.action && (
                      <button
                        onClick={insight.action.onClick}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        {insight.action.label}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Refresh Button */}
      {insights.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={generateInsights}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Refresh Insights
          </button>
        </div>
      )}
    </div>
  );
}
