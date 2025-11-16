import { useEffect, useState } from 'react';
import { Award, Trophy, Star, Zap, Target, TrendingUp, DollarSign, Clock, Users, Medal, LucideIcon } from 'lucide-react';

// Data structure interfaces
interface Earning {
  id: string;
  amount: number;
  date: string;
  description?: string;
  clientId?: string;
}

interface TimeEntry {
  id: string;
  startTime: string;
  endTime?: string;
  duration: number;
  description?: string;
  clientId?: string;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
}

// Achievement type definitions
type AchievementCategory = 'earnings' | 'time' | 'clients' | 'goals' | 'consistency';

type FilterOption = 'all' | AchievementCategory;

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  progress: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: string;
  category: AchievementCategory;
}

// Progress tracking types
interface AchievementProgress {
  totalEarnings: number;
  totalHours: number;
  totalClients: number;
  completedGoals: number;
  maxStreak: number;
}

// Unlock condition structure
interface UnlockCondition {
  type: 'threshold' | 'streak' | 'count';
  value: number;
  currentValue: number;
}

// Event handler types
interface FilterButtonProps {
  filter: FilterOption;
  currentFilter: FilterOption;
  onClick: (filter: FilterOption) => void;
  label: string;
}

export default function AchievementSystem() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showUnlocked, setShowUnlocked] = useState<boolean>(true);
  const [filter, setFilter] = useState<FilterOption>('all');

  useEffect(() => {
    calculateAchievements();
  }, []);

  const calculateAchievements = (): void => {
    const earnings: Earning[] = JSON.parse(localStorage.getItem('earnings') || '[]');
    const timeEntries: TimeEntry[] = JSON.parse(localStorage.getItem('time_entries') || '[]');
    const clients: Client[] = JSON.parse(localStorage.getItem('clients') || '[]');
    const goals: Goal[] = JSON.parse(localStorage.getItem('savings_goals') || '[]');

    // Calculate stats
    const totalEarnings: number = earnings.reduce((sum: number, e: Earning) => sum + e.amount, 0);
    const totalHours: number = timeEntries
      .filter((e: TimeEntry) => e.endTime)
      .reduce((sum: number, e: TimeEntry) => sum + e.duration / 3600, 0);
    const totalClients: number = clients.length;
    const completedGoals: number = goals.filter((g: Goal) => (g.currentAmount / g.targetAmount) >= 1).length;

    // Earnings streak (consecutive days with earnings)
    const earningDates: string[] = earnings.map((e: Earning) => new Date(e.date).toDateString()).sort();
    let currentStreak: number = 0;
    let maxStreak: number = 0;
    let tempStreak: number = 1;

    for (let i: number = 1; i < earningDates.length; i++) {
      const prevDate: Date = new Date(earningDates[i - 1]);
      const currDate: Date = new Date(earningDates[i]);
      const diffDays: number = Math.floor((currDate.getTime() - prevDate.getTime()) / 86400000);

      if (diffDays === 1) {
        tempStreak++;
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak);

    const allAchievements: Achievement[] = [
      // Earnings Achievements
      {
        id: 'first-dollar',
        title: 'First Dollar',
        description: 'Earn your first dollar',
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900',
        progress: Math.min(totalEarnings, 1),
        target: 1,
        unlocked: totalEarnings >= 1,
        category: 'earnings',
      },
      {
        id: 'hundred-club',
        title: 'Hundred Club',
        description: 'Earn $100 in total',
        icon: Award,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900',
        progress: Math.min(totalEarnings, 100),
        target: 100,
        unlocked: totalEarnings >= 100,
        category: 'earnings',
      },
      {
        id: 'thousand-milestone',
        title: 'Thousand Milestone',
        description: 'Earn $1,000 in total',
        icon: Trophy,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900',
        progress: Math.min(totalEarnings, 1000),
        target: 1000,
        unlocked: totalEarnings >= 1000,
        category: 'earnings',
      },
      {
        id: 'five-figure',
        title: 'Five Figure',
        description: 'Earn $10,000 in total',
        icon: Medal,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100 dark:bg-purple-900',
        progress: Math.min(totalEarnings, 10000),
        target: 10000,
        unlocked: totalEarnings >= 10000,
        category: 'earnings',
      },

      // Time Tracking Achievements
      {
        id: 'time-tracker',
        title: 'Time Tracker',
        description: 'Log your first hour',
        icon: Clock,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100 dark:bg-indigo-900',
        progress: Math.min(totalHours, 1),
        target: 1,
        unlocked: totalHours >= 1,
        category: 'time',
      },
      {
        id: 'century-hours',
        title: 'Century Hours',
        description: 'Log 100 hours of work',
        icon: Zap,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100 dark:bg-orange-900',
        progress: Math.min(totalHours, 100),
        target: 100,
        unlocked: totalHours >= 100,
        category: 'time',
      },

      // Client Achievements
      {
        id: 'first-client',
        title: 'First Client',
        description: 'Add your first client',
        icon: Users,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100 dark:bg-cyan-900',
        progress: Math.min(totalClients, 1),
        target: 1,
        unlocked: totalClients >= 1,
        category: 'clients',
      },
      {
        id: 'network-builder',
        title: 'Network Builder',
        description: 'Manage 10 clients',
        icon: Star,
        color: 'text-pink-600',
        bgColor: 'bg-pink-100 dark:bg-pink-900',
        progress: Math.min(totalClients, 10),
        target: 10,
        unlocked: totalClients >= 10,
        category: 'clients',
      },

      // Goal Achievements
      {
        id: 'goal-setter',
        title: 'Goal Setter',
        description: 'Complete your first goal',
        icon: Target,
        color: 'text-red-600',
        bgColor: 'bg-red-100 dark:bg-red-900',
        progress: Math.min(completedGoals, 1),
        target: 1,
        unlocked: completedGoals >= 1,
        category: 'goals',
      },
      {
        id: 'goal-crusher',
        title: 'Goal Crusher',
        description: 'Complete 5 goals',
        icon: TrendingUp,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900',
        progress: Math.min(completedGoals, 5),
        target: 5,
        unlocked: completedGoals >= 5,
        category: 'goals',
      },

      // Consistency Achievements
      {
        id: 'week-warrior',
        title: 'Week Warrior',
        description: 'Earn for 7 days straight',
        icon: Trophy,
        color: 'text-violet-600',
        bgColor: 'bg-violet-100 dark:bg-violet-900',
        progress: Math.min(maxStreak, 7),
        target: 7,
        unlocked: maxStreak >= 7,
        category: 'consistency',
      },
      {
        id: 'month-master',
        title: 'Month Master',
        description: 'Earn for 30 days straight',
        icon: Medal,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100 dark:bg-amber-900',
        progress: Math.min(maxStreak, 30),
        target: 30,
        unlocked: maxStreak >= 30,
        category: 'consistency',
      },
    ];

    setAchievements(allAchievements);
  };

  const getFilteredAchievements = (): Achievement[] => {
    let filtered: Achievement[] = achievements;

    if (filter !== 'all') {
      filtered = filtered.filter((a: Achievement) => a.category === filter);
    }

    if (showUnlocked) {
      filtered = filtered.filter((a: Achievement) => a.unlocked);
    }

    return filtered;
  };

  const unlockedCount: number = achievements.filter((a: Achievement) => a.unlocked).length;
  const totalCount: number = achievements.length;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            Achievements
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {unlockedCount} / {totalCount} unlocked
          </p>
        </div>

        {/* Progress Circle */}
        <div className="relative w-16 h-16">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - unlockedCount / totalCount)}`}
              className="text-yellow-600 dark:text-yellow-400 transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-white">
            {Math.round((unlockedCount / totalCount) * 100)}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          All
        </button>
        {(['earnings', 'time', 'clients', 'goals', 'consistency'] as const).map((cat: AchievementCategory) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setShowUnlocked(!showUnlocked)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <div className={`w-10 h-6 rounded-full transition-colors ${showUnlocked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${showUnlocked ? 'ml-4' : 'ml-0.5'}`} />
          </div>
          <span>Show unlocked only</span>
        </button>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {getFilteredAchievements().map((achievement: Achievement) => {
          const Icon: LucideIcon = achievement.icon;
          const percentage: number = (achievement.progress / achievement.target) * 100;

          return (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                achievement.unlocked
                  ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 opacity-75'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 p-2 rounded-lg ${achievement.bgColor}`}>
                  <Icon className={`h-5 w-5 ${achievement.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {achievement.title}
                    </h4>
                    {achievement.unlocked && (
                      <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {achievement.description}
                  </p>

                  {/* Progress Bar */}
                  {!achievement.unlocked && (
                    <>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {achievement.progress.toFixed(0)} / {achievement.target}
                      </p>
                    </>
                  )}

                  {achievement.unlocked && achievement.unlockedAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {getFilteredAchievements().length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No achievements found</p>
          <p className="text-xs mt-1">Keep working to unlock more!</p>
        </div>
      )}
    </div>
  );
}
