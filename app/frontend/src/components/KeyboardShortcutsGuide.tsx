import { useState, useEffect } from 'react';
import { Keyboard, X, Command, Search, Plus, Download, Menu as MenuIcon } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: 'navigation' | 'actions' | 'general';
}

export default function KeyboardShortcutsGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open shortcuts guide with ? key
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsOpen(true);
      }

      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const shortcuts: Shortcut[] = [
    // Navigation
    { keys: ['G', 'D'], description: 'Go to Dashboard', category: 'navigation' },
    { keys: ['G', 'E'], description: 'Go to Earnings', category: 'navigation' },
    { keys: ['G', 'A'], description: 'Go to Analytics', category: 'navigation' },
    { keys: ['G', 'B'], description: 'Go to Budget', category: 'navigation' },
    { keys: ['G', 'R'], description: 'Go to Reports', category: 'navigation' },
    { keys: ['G', 'C'], description: 'Go to Clients', category: 'navigation' },

    // Actions
    { keys: ['⌘/Ctrl', 'K'], description: 'Open Global Search', category: 'actions' },
    { keys: ['N'], description: 'New Earning', category: 'actions' },
    { keys: ['⌘/Ctrl', 'E'], description: 'Export Current View', category: 'actions' },
    { keys: ['⌘/Ctrl', 'P'], description: 'Print/PDF', category: 'actions' },
    { keys: ['⌘/Ctrl', 'S'], description: 'Save Changes', category: 'actions' },

    // General
    { keys: ['?'], description: 'Show Keyboard Shortcuts', category: 'general' },
    { keys: ['Esc'], description: 'Close Modal/Dialog', category: 'general' },
    { keys: ['⌘/Ctrl', ','], description: 'Open Settings', category: 'general' },
    { keys: ['⌘/Ctrl', 'D'], description: 'Toggle Dark Mode', category: 'general' },
    { keys: ['F'], description: 'Open Filter Menu', category: 'general' },
  ];

  const getFilteredShortcuts = () => {
    if (selectedCategory === 'all') return shortcuts;
    return shortcuts.filter(s => s.category === selectedCategory);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 p-3 bg-gray-800 dark:bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-all z-40"
        title="Keyboard Shortcuts (Press ?)"
      >
        <Keyboard className="h-5 w-5" />
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

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 px-4 animate-scale-in">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Keyboard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Keyboard Shortcuts
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Master EarnTrack with these shortcuts
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 px-6 pt-4 border-b border-gray-200 dark:border-gray-700 pb-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedCategory('navigation')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'navigation'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Navigation
            </button>
            <button
              onClick={() => setSelectedCategory('actions')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'actions'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Actions
            </button>
            <button
              onClick={() => setSelectedCategory('general')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'general'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              General
            </button>
          </div>

          {/* Shortcuts List */}
          <div className="p-6 max-h-96 overflow-y-auto">
            <div className="space-y-3">
              {getFilteredShortcuts().map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {shortcut.description}
                  </span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, keyIndex) => (
                      <kbd
                        key={keyIndex}
                        className="px-2 py-1 text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded shadow-sm"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Command className="h-4 w-4" />
                <span>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">?</kbd> anytime to open this guide</span>
              </div>
              <span>{getFilteredShortcuts().length} shortcuts</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
