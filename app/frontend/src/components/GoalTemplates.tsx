import { useState } from 'react';
import { Target, Plus, Check, TrendingUp, Calendar, DollarSign, Clock, Zap, Star, Award } from 'lucide-react';
import { notify } from '../store/notification.store';

interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  category: 'earnings' | 'savings' | 'skills' | 'clients' | 'productivity';
  targetAmount?: number;
  duration: number; // in days
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tips: string[];
}

const TEMPLATES: GoalTemplate[] = [
  // Earnings Goals
  {
    id: 'earn-1k-month',
    name: '$1,000 This Month',
    description: 'Reach $1,000 in earnings within 30 days',
    category: 'earnings',
    targetAmount: 1000,
    duration: 30,
    icon: 'dollar',
    difficulty: 'easy',
    tips: [
      'Break down into daily targets of $33.33',
      'Focus on high-paying clients first',
      'Consider taking on 2-3 small projects',
      'Track progress daily to stay motivated',
    ],
  },
  {
    id: 'earn-5k-month',
    name: '$5,000 Monthly Goal',
    description: 'Achieve $5,000 in monthly earnings',
    category: 'earnings',
    targetAmount: 5000,
    duration: 30,
    icon: 'trending',
    difficulty: 'medium',
    tips: [
      'Target $166.67 per day',
      'Raise your hourly rate by 20%',
      'Secure at least 2 anchor clients',
      'Minimize low-paying projects',
    ],
  },
  {
    id: 'earn-10k-month',
    name: '$10,000 Monthly Challenge',
    description: 'Hit the $10k milestone in one month',
    category: 'earnings',
    targetAmount: 10000,
    duration: 30,
    icon: 'star',
    difficulty: 'hard',
    tips: [
      'Need $333.33 per day average',
      'Focus exclusively on premium clients',
      'Consider retainer agreements',
      'Batch similar tasks for efficiency',
    ],
  },
  {
    id: 'double-earnings',
    name: 'Double Last Month',
    description: 'Earn 2x what you made last month',
    category: 'earnings',
    duration: 30,
    icon: 'zap',
    difficulty: 'medium',
    tips: [
      'Analyze what worked last month',
      'Increase your rates strategically',
      'Add one new high-value service',
      'Optimize your most profitable hours',
    ],
  },

  // Savings Goals
  {
    id: 'save-1k-emergency',
    name: 'Emergency Fund: $1,000',
    description: 'Build a $1,000 emergency fund',
    category: 'savings',
    targetAmount: 1000,
    duration: 90,
    icon: 'target',
    difficulty: 'easy',
    tips: [
      'Save $11.11 per day',
      'Set aside 10% of each payment',
      'Automate transfers to savings',
      'Cut one unnecessary subscription',
    ],
  },
  {
    id: 'save-5k-buffer',
    name: '3-Month Buffer: $5,000',
    description: 'Save $5,000 for income stability',
    category: 'savings',
    targetAmount: 5000,
    duration: 180,
    icon: 'award',
    difficulty: 'medium',
    tips: [
      'Save $27.78 per day',
      'Set aside 15-20% of earnings',
      'Use high-yield savings account',
      'Track expenses to find savings',
    ],
  },

  // Client Goals
  {
    id: 'acquire-5-clients',
    name: 'Acquire 5 New Clients',
    description: 'Onboard 5 new clients this quarter',
    category: 'clients',
    duration: 90,
    icon: 'star',
    difficulty: 'medium',
    tips: [
      'Network on LinkedIn daily',
      'Ask existing clients for referrals',
      'Update your portfolio website',
      'Engage in 2 online communities',
    ],
  },
  {
    id: 'retain-10-clients',
    name: 'Retain 10 Active Clients',
    description: 'Maintain 10 active client relationships',
    category: 'clients',
    duration: 60,
    icon: 'check',
    difficulty: 'medium',
    tips: [
      'Check in with clients weekly',
      'Deliver exceptional work consistently',
      'Offer value beyond your contract',
      'Be responsive and professional',
    ],
  },

  // Productivity Goals
  {
    id: 'log-100-hours',
    name: '100 Billable Hours',
    description: 'Track 100 billable hours this month',
    category: 'productivity',
    duration: 30,
    icon: 'clock',
    difficulty: 'medium',
    tips: [
      'Aim for 25 hours per week',
      'Use time blocking technique',
      'Eliminate distractions during work',
      'Track every minute of work',
    ],
  },
  {
    id: 'daily-streak-30',
    name: '30-Day Work Streak',
    description: 'Log earnings for 30 consecutive days',
    category: 'productivity',
    duration: 30,
    icon: 'zap',
    difficulty: 'hard',
    tips: [
      'Build a consistent routine',
      'Start with small daily wins',
      'Use habit tracking apps',
      'Reward yourself at milestones',
    ],
  },

  // Skills Goals
  {
    id: 'learn-new-skill',
    name: 'Master New Skill',
    description: 'Complete a professional development course',
    category: 'skills',
    duration: 60,
    icon: 'trending',
    difficulty: 'medium',
    tips: [
      'Choose skill that increases value',
      'Dedicate 1 hour daily to learning',
      'Apply skills to real projects',
      'Get certified if applicable',
    ],
  },
  {
    id: 'increase-rate',
    name: 'Raise Your Rate 25%',
    description: 'Successfully implement a rate increase',
    category: 'skills',
    targetAmount: 25,
    duration: 90,
    icon: 'trending',
    difficulty: 'medium',
    tips: [
      'Document your improved skills',
      'Communicate value to clients',
      'Start with new clients first',
      'Offer grandfathering to loyal clients',
    ],
  },
];

export default function GoalTemplates() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const createGoalFromTemplate = (template: GoalTemplate) => {
    const goals = JSON.parse(localStorage.getItem('goals') || '[]');

    // Calculate target date
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + template.duration);

    const newGoal = {
      id: `goal-${Date.now()}`,
      title: template.name,
      description: template.description,
      targetAmount: template.targetAmount || 0,
      currentAmount: 0,
      targetDate: targetDate.toISOString().split('T')[0],
      category: template.category,
      status: 'active',
      createdAt: new Date().toISOString(),
      fromTemplate: template.id,
    };

    const updatedGoals = [...goals, newGoal];
    localStorage.setItem('goals', JSON.stringify(updatedGoals));

    notify.success('Goal Created', `${template.name} added to your goals!`);
  };

  const filteredTemplates = TEMPLATES.filter((template) => {
    const categoryMatch = selectedCategory === 'all' || template.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'all' || template.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'dollar':
        return DollarSign;
      case 'trending':
        return TrendingUp;
      case 'target':
        return Target;
      case 'clock':
        return Clock;
      case 'zap':
        return Zap;
      case 'star':
        return Star;
      case 'award':
        return Award;
      case 'check':
        return Check;
      default:
        return Target;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'earnings':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
      case 'savings':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900';
      case 'clients':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900';
      case 'productivity':
        return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900';
      case 'skills':
        return 'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30';
      case 'medium':
        return 'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30';
      case 'hard':
        return 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30';
      default:
        return 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
            <Target className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Goal Templates</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Pre-built goals to jumpstart your freelance success
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Categories</option>
            <option value="earnings">Earnings</option>
            <option value="savings">Savings</option>
            <option value="clients">Clients</option>
            <option value="productivity">Productivity</option>
            <option value="skills">Skills</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Difficulty
          </label>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
          const Icon = getIcon(template.icon);
          const categoryColor = getCategoryColor(template.category);
          const difficultyColor = getDifficultyColor(template.difficulty);

          return (
            <div
              key={template.id}
              className="p-5 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${categoryColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColor}`}>
                  {template.difficulty}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {template.name}
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {template.description}
              </p>

              <div className="flex items-center gap-3 mb-3 text-xs text-gray-600 dark:text-gray-400">
                {template.targetAmount && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ${template.targetAmount.toLocaleString()}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {template.duration} days
                </span>
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Success Tips:
                </h4>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {template.tips.slice(0, 2).map((tip, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <Check className="w-3 h-3 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => createGoalFromTemplate(template)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Use This Goal
              </button>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No templates found
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Try adjusting your filters
          </p>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          How to Use Goal Templates
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Choose a template that matches your current objectives</li>
          <li>Click "Use This Goal" to add it to your active goals</li>
          <li>Templates include realistic timeframes and actionable tips</li>
          <li>You can customize the goal after creation</li>
          <li>Start with easier goals to build momentum</li>
          <li>Stack multiple goals for comprehensive growth</li>
        </ul>
      </div>
    </div>
  );
}
