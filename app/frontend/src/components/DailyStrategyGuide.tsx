import { useState, useEffect } from 'react';
import { Target, TrendingUp, Clock, DollarSign, Award, CheckCircle, AlertCircle, Lightbulb, Calendar } from 'lucide-react';
import { generateRandomId } from '../lib/random';

interface DailyStrategy {
  date: string;
  greeting: string;
  motivationalQuote: string;
  todayGoals: {
    earnings: number;
    hours: number;
    tasks: string[];
  };
  recommendations: string[];
  insights: string[];
  streak: {
    current: number;
    best: number;
  };
  progress: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export default function DailyStrategyGuide() {
  const [strategy, setStrategy] = useState<DailyStrategy | null>(null);

  useEffect(() => {
    generateDailyStrategy();
  }, []);

  const generateDailyStrategy = () => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Load data
    const earnings = JSON.parse(localStorage.getItem('earnings') || '[]');
    const goals = JSON.parse(localStorage.getItem('savings_goals') || '[]');
    const timeEntries = JSON.parse(localStorage.getItem('time_entries') || '[]');

    // Calculate streak
    const sortedEarnings = [...earnings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    const uniqueDates = [...new Set(sortedEarnings.map(e => e.date.split('T')[0]))].sort().reverse();
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < uniqueDates.length; i++) {
      const date = uniqueDates[i];
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expected = expectedDate.toISOString().split('T')[0];

      if (date === expected) {
        tempStreak++;
        if (i === 0 || date === today) {
          currentStreak = tempStreak;
        }
      } else {
        if (tempStreak > bestStreak) bestStreak = tempStreak;
        tempStreak = 0;
      }
    }

    if (tempStreak > bestStreak) bestStreak = tempStreak;

    // Calculate progress
    const todayEarnings = earnings.filter((e: any) => e.date.startsWith(today));
    const todayTotal = todayEarnings.reduce((sum: number, e: any) => sum + e.amount, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEarnings = earnings.filter((e: any) => new Date(e.date) >= weekStart);
    const weekTotal = weekEarnings.reduce((sum: number, e: any) => sum + e.amount, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEarnings = earnings.filter((e: any) => new Date(e.date) >= monthStart);
    const monthTotal = monthEarnings.reduce((sum: number, e: any) => sum + e.amount, 0);

    // Generate greeting
    let greeting = '';
    if (hour < 12) greeting = 'Good Morning! ☀️';
    else if (hour < 18) greeting = 'Good Afternoon! 🌤️';
    else greeting = 'Good Evening! 🌙';

    // Generate motivational quote
    const quotes = [
      "Success is the sum of small efforts repeated day in and day out.",
      "The secret of getting ahead is getting started.",
      "Don't watch the clock; do what it does. Keep going.",
      "The future depends on what you do today.",
      "Small daily improvements are the key to staggering long-term results.",
      "Your only limit is you.",
      "Dream big, work hard, stay focused.",
      "Success doesn't just find you. You have to go out and get it.",
      "Great things never come from comfort zones.",
      "The harder you work for something, the greater you'll feel when you achieve it.",
    ];
    const motivationalQuote = quotes[parseInt(generateRandomId(1), 36) % quotes.length];

    // Generate goals for today
    const avgDailyEarnings = earnings.length > 0
      ? earnings.reduce((sum: number, e: any) => sum + e.amount, 0) / uniqueDates.length
      : 100;

    const tasks: string[] = [];
    if (todayEarnings.length === 0) {
      tasks.push('Log your first earning of the day');
    }
    if (currentStreak > 0) {
      tasks.push(`Keep your ${currentStreak}-day streak alive!`);
    } else {
      tasks.push('Start a new earning streak today');
    }

    const activeGoals = goals.filter((g: any) => {
      const progress = (g.currentAmount / g.targetAmount) * 100;
      return progress < 100;
    });

    if (activeGoals.length > 0) {
      tasks.push(`Work towards ${activeGoals[0].name}`);
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (dayOfWeek === 'Monday') {
      recommendations.push('Set your goals for the week ahead');
      recommendations.push('Review last week\'s performance');
    } else if (dayOfWeek === 'Friday') {
      recommendations.push('Wrap up pending tasks before the weekend');
      recommendations.push('Plan for next week');
    } else if (dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday') {
      recommendations.push('Focus on high-value projects');
      recommendations.push('Review and organize your workspace');
    }

    if (todayTotal < avgDailyEarnings * 0.5 && hour > 15) {
      recommendations.push('You\'re behind today\'s average - push for a strong finish');
    }

    if (timeEntries.length > 0) {
      const recentTime = timeEntries[timeEntries.length - 1];
      if (!recentTime.endTime && hour > 17) {
        recommendations.push('Don\'t forget to stop your active timer');
      }
    }

    // Generate insights
    const insights: string[] = [];

    if (currentStreak >= 7) {
      insights.push(`🔥 Amazing! You've logged earnings for ${currentStreak} consecutive days!`);
    }

    if (monthTotal > avgDailyEarnings * 20) {
      insights.push(`💰 You're having a great month! Already earned $${monthTotal.toFixed(2)}`);
    }

    if (weekTotal > weekEarnings.length * avgDailyEarnings) {
      insights.push(`📈 This week is ${((weekTotal / (weekEarnings.length * avgDailyEarnings) - 1) * 100).toFixed(0)}% above average!`);
    }

    const earningsByDay = earnings.reduce((acc: any, e: any) => {
      const day = new Date(e.date).getDay();
      acc[day] = (acc[day] || 0) + e.amount;
      return acc;
    }, {});

    const todayDay = now.getDay();
    if (earningsByDay[todayDay] && earningsByDay[todayDay] > avgDailyEarnings * 1.2) {
      insights.push(`⭐ ${dayOfWeek}s are typically good earning days for you!`);
    }

    setStrategy({
      date,
      greeting,
      motivationalQuote,
      todayGoals: {
        earnings: Math.ceil(avgDailyEarnings),
        hours: 6,
        tasks,
      },
      recommendations,
      insights,
      streak: {
        current: currentStreak,
        best: bestStreak,
      },
      progress: {
        daily: todayTotal,
        weekly: weekTotal,
        monthly: monthTotal,
      },
    });
  };

  if (!strategy) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 text-white shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">{strategy.greeting}</h2>
        <p className="text-purple-100 text-sm">{strategy.date}</p>
      </div>

      {/* Motivational Quote */}
      <div className="mb-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm italic leading-relaxed">
            "{strategy.motivationalQuote}"
          </p>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="text-xs font-medium mb-1 text-purple-100">Today</div>
          <div className="text-xl font-bold">${strategy.progress.daily.toFixed(0)}</div>
        </div>
        <div className="p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="text-xs font-medium mb-1 text-purple-100">This Week</div>
          <div className="text-xl font-bold">${strategy.progress.weekly.toFixed(0)}</div>
        </div>
        <div className="p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="text-xs font-medium mb-1 text-purple-100">This Month</div>
          <div className="text-xl font-bold">${strategy.progress.monthly.toFixed(0)}</div>
        </div>
      </div>

      {/* Streak */}
      {strategy.streak.current > 0 && (
        <div className="mb-6 p-4 bg-orange-500/20 backdrop-blur-sm rounded-lg border border-orange-300/30">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-orange-200" />
            <div>
              <div className="font-semibold text-orange-100">
                {strategy.streak.current}-Day Streak! 🔥
              </div>
              <div className="text-xs text-orange-200">
                Best: {strategy.streak.best} days
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Goals */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5" />
          <h3 className="font-semibold">Today's Goals</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <span className="text-sm">Earnings Target</span>
            <span className="font-bold">${strategy.todayGoals.earnings}</span>
          </div>
          {strategy.todayGoals.tasks.map((task, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20"
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{task}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {strategy.recommendations.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5" />
            <h3 className="font-semibold">Recommendations</h3>
          </div>
          <div className="space-y-2">
            {strategy.recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {strategy.insights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5" />
            <h3 className="font-semibold">Today's Insights</h3>
          </div>
          <div className="space-y-2">
            {strategy.insights.map((insight, index) => (
              <div
                key={index}
                className="p-3 bg-green-500/20 backdrop-blur-sm rounded-lg border border-green-300/30"
              >
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
