/**
 * SearchResults Component
 * Displays search results with filtering, facets, and pagination
 */

import { useState } from 'react';
import {
  Search,
  Filter,
  Ticket,
  MessageSquare,
  Users,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Tag,
} from 'lucide-react';
import { useEntitySearch, SearchIndex } from '../hooks/useElasticsearch';

interface SearchResultsProps {
  index: Exclude<SearchIndex, 'global'>;
  initialQuery?: string;
  onResultClick?: (result: any) => void;
}

export default function SearchResults({ index, initialQuery = '', onResultClick }: SearchResultsProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const {
    query,
    filters,
    results,
    loading,
    error,
    hasResults,
    handleSearch,
    updateFilters,
    clearFilters,
    clearSearch,
    performSearch,
  } = useEntitySearch(index, {
    debounceDelay: 300,
    minChars: 1,
    autoSearch: false,
  });

  // Initialize query if provided
  useState(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
      performSearch({ q: initialQuery });
    }
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    performSearch({
      from: (page - 1) * pageSize,
      size: pageSize,
    });
  };

  const handleFilterChange = (key: string, value: any) => {
    updateFilters({ [key]: value });
    setCurrentPage(1);
    performSearch({
      [key]: value,
      from: 0,
      size: pageSize,
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    performSearch({
      q: query,
      from: 0,
      size: pageSize,
    });
  };

  const getIndexConfig = () => {
    switch (index) {
      case 'tickets':
        return {
          title: 'Tickets',
          icon: Ticket,
          color: 'text-red-600',
          filterFields: ['status', 'priority', 'category', 'assignedTo', 'slaBreach'],
        };
      case 'messages':
        return {
          title: 'Messages',
          icon: MessageSquare,
          color: 'text-blue-600',
          filterFields: ['roomId', 'senderId'],
        };
      case 'customers':
        return {
          title: 'Customers',
          icon: Users,
          color: 'text-green-600',
          filterFields: ['city', 'country', 'isActive'],
        };
      case 'documents':
        return {
          title: 'Documents',
          icon: FileText,
          color: 'text-purple-600',
          filterFields: ['contentType', 'tags'],
        };
      default:
        return {
          title: 'Search',
          icon: Search,
          color: 'text-gray-600',
          filterFields: [],
        };
    }
  };

  const config = getIndexConfig();
  const Icon = config.icon;

  const totalPages = results?.pagination?.total
    ? Math.ceil(results.pagination.total / pageSize)
    : 0;

  // Get the results array based on index
  const getResults = () => {
    if (!results) return [];

    switch (index) {
      case 'tickets':
        return results.tickets || [];
      case 'messages':
        return results.messages || [];
      case 'customers':
        return results.customers || [];
      case 'documents':
        return results.documents || [];
      default:
        return [];
    }
  };

  const resultItems = getResults();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${config.color}`} />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{config.title} Search</h2>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
            {Object.keys(filters).length > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                {Object.keys(filters).length}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={`Search ${config.title.toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search'}
          </button>
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
            {Object.keys(filters).length > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {index === 'tickets' && (
              <>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
                >
                  <option value="">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>

                <select
                  value={filters.priority || ''}
                  onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
                >
                  <option value="">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>

                <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.slaBreach || false}
                    onChange={(e) => handleFilterChange('slaBreach', e.target.checked || undefined)}
                    className="rounded"
                  />
                  <span className="text-gray-900 dark:text-white">SLA Breach Only</span>
                </label>
              </>
            )}

            {index === 'customers' && (
              <>
                <input
                  type="text"
                  value={filters.city || ''}
                  onChange={(e) => handleFilterChange('city', e.target.value || undefined)}
                  placeholder="City"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
                />
                <input
                  type="text"
                  value={filters.country || ''}
                  onChange={(e) => handleFilterChange('country', e.target.value || undefined)}
                  placeholder="Country"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
                />
                <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isActive !== undefined ? filters.isActive : true}
                    onChange={(e) => handleFilterChange('isActive', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-900 dark:text-white">Active Only</span>
                </label>
              </>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="p-6">
        {error ? (
          <div className="text-center py-12 text-red-500">
            <X className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium mb-2">Search Error</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 mx-auto mb-3 opacity-50 animate-spin text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400">Searching...</p>
          </div>
        ) : !hasResults ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Icon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium mb-2">No Results Found</p>
            <p className="text-sm">Try adjusting your search query or filters</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Found {results?.pagination?.total || 0} results
            </div>

            <div className="space-y-4">
              {resultItems.map((result: any, index: number) => (
                <div
                  key={result.id || index}
                  onClick={() => onResultClick?.(result)}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {result.highlight?.subject?.[0] ? (
                          <span dangerouslySetInnerHTML={{ __html: result.highlight.subject[0] }} />
                        ) : result.highlight?.name?.[0] ? (
                          <span dangerouslySetInnerHTML={{ __html: result.highlight.name[0] }} />
                        ) : result.highlight?.filename?.[0] ? (
                          <span dangerouslySetInnerHTML={{ __html: result.highlight.filename[0] }} />
                        ) : (
                          result.subject || result.name || result.filename || result.content?.substring(0, 50)
                        )}
                      </h3>
                      {(result.description || result.email || result.content) && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {result.highlight?.description?.[0] ? (
                            <span dangerouslySetInnerHTML={{ __html: result.highlight.description[0] }} />
                          ) : result.highlight?.content?.[0] ? (
                            <span dangerouslySetInnerHTML={{ __html: result.highlight.content[0] }} />
                          ) : (
                            result.description || result.email || result.content?.substring(0, 150)
                          )}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        {result.score && <span>Score: {result.score.toFixed(2)}</span>}
                        {result.status && (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                            {result.status}
                          </span>
                        )}
                        {result.priority && (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                            {result.priority}
                          </span>
                        )}
                        {result.createdAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(result.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Facets Panel (if available) */}
      {results?.facets && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Facets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(results.facets).map(([key, value]: [string, any]) => (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
                <div className="space-y-1">
                  {value.buckets?.slice(0, 5).map((bucket: any) => (
                    <div key={bucket.key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{bucket.key}</span>
                      <span className="text-gray-500 dark:text-gray-400">{bucket.doc_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
