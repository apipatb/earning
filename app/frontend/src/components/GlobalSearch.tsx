import { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  TrendingUp,
  DollarSign,
  Target,
  Users,
  Clock,
  FileText,
  LucideIcon,
  Ticket,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch } from '../hooks/useElasticsearch';

// Search result types
type SearchResultType = 'ticket' | 'message' | 'customer' | 'document';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  path: string;
  icon: LucideIcon;
  color: string;
  highlight?: Record<string, string[]>;
  score?: number;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const {
    query,
    results: searchResults,
    loading,
    error,
    hasResults,
    handleSearch,
    clearSearch,
  } = useGlobalSearch({
    debounceDelay: 300,
    minChars: 2,
    autoSearch: true,
  });

  // Transform Elasticsearch results to UI format
  const results: SearchResult[] = [];

  if (searchResults) {
    // Add tickets
    searchResults.tickets?.hits?.forEach((hit) => {
      results.push({
        id: hit.id,
        type: 'ticket',
        title: hit.subject || 'Untitled Ticket',
        subtitle: hit.description || `Status: ${hit.status}`,
        path: `/tickets/${hit.id}`,
        icon: Ticket,
        color: 'text-red-600',
        highlight: hit.highlight,
        score: hit.score,
      });
    });

    // Add messages
    searchResults.chat_messages?.hits?.forEach((hit) => {
      results.push({
        id: hit.id,
        type: 'message',
        title: hit.content?.substring(0, 50) || 'Message',
        subtitle: `Room: ${hit.roomId}`,
        path: `/chat/${hit.roomId}`,
        icon: MessageSquare,
        color: 'text-blue-600',
        highlight: hit.highlight,
        score: hit.score,
      });
    });

    // Add customers
    searchResults.customers?.hits?.forEach((hit) => {
      results.push({
        id: hit.id,
        type: 'customer',
        title: hit.name || 'Unnamed Customer',
        subtitle: hit.email || hit.company || 'No details',
        path: `/customers/${hit.id}`,
        icon: Users,
        color: 'text-green-600',
        highlight: hit.highlight,
        score: hit.score,
      });
    });

    // Add documents
    searchResults.documents?.hits?.forEach((hit) => {
      results.push({
        id: hit.id,
        type: 'document',
        title: hit.filename || 'Unnamed Document',
        subtitle: hit.contentType || 'Document',
        path: `/documents/${hit.id}`,
        icon: FileText,
        color: 'text-purple-600',
        highlight: hit.highlight,
        score: hit.score,
      });
    });
  }

  // Sort by score
  results.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        clearSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clearSearch]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  const handleSelectResult = (result: SearchResult) => {
    navigate(result.path);
    setIsOpen(false);
    clearSearch();
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
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tickets, messages, customers, documents..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              disabled={loading}
            />
            {loading && <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />}
            <button
              onClick={() => {
                setIsOpen(false);
                clearSearch();
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {error ? (
              <div className="p-8 text-center text-red-500">
                <X className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Search error: {error}</p>
              </div>
            ) : loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Loader2 className="h-12 w-12 mx-auto mb-3 opacity-50 animate-spin" />
                <p>Searching...</p>
              </div>
            ) : results.length === 0 && query ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No results found for "{query}"</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="mb-2">Start typing to search...</p>
                <p className="text-sm">Search across tickets, messages, customers, and documents</p>
              </div>
            ) : (
              <div className="py-2">
                {results.slice(0, 10).map((result, index) => {
                  const Icon = result.icon;
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
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
                          {result.highlight?.subject?.[0] ? (
                            <span dangerouslySetInnerHTML={{ __html: result.highlight.subject[0] }} />
                          ) : (
                            result.title
                          )}
                        </div>
                        {result.subtitle && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {result.highlight?.description?.[0] ? (
                              <span dangerouslySetInnerHTML={{ __html: result.highlight.description[0] }} />
                            ) : result.highlight?.content?.[0] ? (
                              <span dangerouslySetInnerHTML={{ __html: result.highlight.content[0] }} />
                            ) : (
                              result.subtitle
                            )}
                          </div>
                        )}
                        {result.score && (
                          <div className="text-xs text-gray-400 mt-1">Score: {result.score.toFixed(2)}</div>
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
