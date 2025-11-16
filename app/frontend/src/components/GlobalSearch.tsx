import { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, DollarSign, Target, Users, Clock, FileText, LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Data structure interfaces for localStorage items
interface Earning {
  id: string;
  platformName: string;
  amount: number;
  description?: string;
  date: string;
}

interface Client {
  id: string;
  name: string;
  company?: string;
  email?: string;
}

interface Budget {
  id: string;
  name: string;
  spentAmount: number;
  plannedAmount: number;
}

interface SavingsGoal {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
}

interface TimeEntry {
  id: string;
  projectName: string;
  description?: string;
}

// Search result types
type SearchResultType = 'earning' | 'platform' | 'goal' | 'client' | 'budget' | 'invoice';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  path: string;
  icon: LucideIcon;
  color: string;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search functionality
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchResults: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Search in earnings
    const earnings: Earning[] = JSON.parse(localStorage.getItem('earnings') || '[]');
    earnings.forEach((earning: Earning) => {
      if (
        earning.platformName?.toLowerCase().includes(lowerQuery) ||
        earning.description?.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: earning.id,
          type: 'earning',
          title: `${earning.platformName} - $${earning.amount}`,
          subtitle: earning.description || earning.date,
          path: '/earnings',
          icon: DollarSign,
          color: 'text-green-600',
        });
      }
    });

    // Search in clients
    const clients: Client[] = JSON.parse(localStorage.getItem('clients') || '[]');
    clients.forEach((client: Client) => {
      if (
        client.name?.toLowerCase().includes(lowerQuery) ||
        client.company?.toLowerCase().includes(lowerQuery) ||
        client.email?.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: client.id,
          type: 'client',
          title: client.name,
          subtitle: client.company || client.email,
          path: '/clients',
          icon: Users,
          color: 'text-blue-600',
        });
      }
    });

    // Search in budgets
    const budgets: Budget[] = JSON.parse(localStorage.getItem('budget_categories') || '[]');
    budgets.forEach((budget: Budget) => {
      if (budget.name?.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          id: budget.id,
          type: 'budget',
          title: budget.name,
          subtitle: `$${budget.spentAmount} / $${budget.plannedAmount}`,
          path: '/budget',
          icon: TrendingUp,
          color: 'text-purple-600',
        });
      }
    });

    // Search in goals
    const goals: SavingsGoal[] = JSON.parse(localStorage.getItem('savings_goals') || '[]');
    goals.forEach((goal: SavingsGoal) => {
      if (goal.name?.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          id: goal.id,
          type: 'goal',
          title: goal.name,
          subtitle: `$${goal.currentAmount} / $${goal.targetAmount}`,
          path: '/budget',
          icon: Target,
          color: 'text-orange-600',
        });
      }
    });

    // Search in time entries
    const timeEntries: TimeEntry[] = JSON.parse(localStorage.getItem('time_entries') || '[]');
    timeEntries.forEach((entry: TimeEntry) => {
      if (entry.projectName?.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          id: entry.id,
          type: 'earning',
          title: entry.projectName,
          subtitle: entry.description,
          path: '/time-tracking',
          icon: Clock,
          color: 'text-indigo-600',
        });
      }
    });

    setResults(searchResults.slice(0, 8)); // Limit to 8 results
    setSelectedIndex(0);
  }, [query]);

  const handleSelectResult = (result: SearchResult) => {
    navigate(result.path);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      handleSelectResult(results[selectedIndex]);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search...</span>
        <kbd className="hidden md:inline px-2 py-0.5 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 animate-fade-in"
      />

      {/* Search Modal */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4 animate-slide-in-up">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search earnings, clients, budgets, goals..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button
              onClick={() => {
                setIsOpen(false);
                setQuery('');
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {results.length === 0 && query ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No results found for "{query}"</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="mb-2">Start typing to search...</p>
                <p className="text-sm">Search across earnings, clients, budgets, and more</p>
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, index) => {
                  const Icon = result.icon;
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelectResult(result)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                        index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                      }`}
                    >
                      <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${result.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {result.title}
                        </div>
                        {result.subtitle && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {result.subtitle}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 uppercase">
                        {result.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">Enter</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">Esc</kbd>
                Close
              </span>
            </div>
            <span>{results.length} results</span>
          </div>
        </div>
      </div>
    </>
  );
}
