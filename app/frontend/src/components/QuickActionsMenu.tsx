import { useState } from 'react';
import { Plus, X, DollarSign, Target, Clock, Users, Receipt, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  path?: string;
  action?: () => void;
  color: string;
  bgColor: string;
}

export default function QuickActionsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      id: 'add-earning',
      label: 'Add Earning',
      icon: DollarSign,
      path: '/earnings',
      color: 'text-green-600',
      bgColor: 'bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800',
    },
    {
      id: 'new-goal',
      label: 'New Goal',
      icon: Target,
      path: '/goals',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800',
    },
    {
      id: 'track-time',
      label: 'Track Time',
      icon: Clock,
      path: '/time-tracking',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800',
    },
    {
      id: 'add-client',
      label: 'Add Client',
      icon: Users,
      path: '/clients',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 hover:bg-orange-200 dark:bg-orange-900 dark:hover:bg-orange-800',
    },
    {
      id: 'new-invoice',
      label: 'New Invoice',
      icon: Receipt,
      path: '/invoices',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:hover:bg-indigo-800',
    },
    {
      id: 'budget',
      label: 'Budget Plan',
      icon: Wallet,
      path: '/budget',
      color: 'text-pink-600',
      bgColor: 'bg-pink-100 hover:bg-pink-200 dark:bg-pink-900 dark:hover:bg-pink-800',
    },
  ];

  const handleActionClick = (action: QuickAction) => {
    if (action.path) {
      navigate(action.path);
    } else if (action.action) {
      action.action();
    }
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action Items */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 flex flex-col gap-3 mb-2 animate-fade-in-up">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={`flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all transform hover:scale-105 ${action.bgColor}`}
                style={{
                  animationDelay: `${index * 0.05}s`,
                }}
              >
                <Icon className={`h-5 w-5 ${action.color}`} />
                <span className={`font-medium ${action.color} whitespace-nowrap`}>
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all transform hover:scale-110 ${
          isOpen
            ? 'bg-red-500 hover:bg-red-600 rotate-45'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
        }`}
        aria-label="Quick Actions"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Plus className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/20 dark:bg-black/40 -z-10 animate-fade-in"
        />
      )}
    </div>
  );
}
