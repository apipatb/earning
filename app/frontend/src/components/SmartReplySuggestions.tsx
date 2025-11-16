import { useState, useEffect } from 'react';
import { Sparkles, ThumbsUp, Copy, RefreshCw, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Suggestion {
  id: string;
  suggestion: string;
  confidence: number;
  source: 'AI' | 'TEMPLATE';
  templateId?: string | null;
}

interface SmartReplySuggestionsProps {
  messageId: string;
  ticketId: string;
  onSelect: (suggestion: string) => void;
  className?: string;
}

export default function SmartReplySuggestions({
  messageId,
  ticketId,
  onSelect,
  className = '',
}: SmartReplySuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (messageId && ticketId) {
      fetchSuggestions();
    }
  }, [messageId, ticketId]);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/v1/smart-reply/suggestions/${messageId}`,
        {
          params: { ticketId },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuggestions(response.data.suggestions || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (suggestion: Suggestion) => {
    setSelectedId(suggestion.id);
    onSelect(suggestion.suggestion);

    // Track acceptance
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/v1/smart-reply/${suggestion.id}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (err) {
      console.error('Error accepting suggestion:', err);
    }
  };

  const handleCopy = async (suggestion: Suggestion) => {
    try {
      await navigator.clipboard.writeText(suggestion.suggestion);
      setCopiedId(suggestion.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  };

  const getSourceIcon = (source: 'AI' | 'TEMPLATE') => {
    return source === 'AI' ? (
      <Sparkles className="w-3 h-3 text-purple-500" />
    ) : (
      <span className="text-xs text-blue-500">📝</span>
    );
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
          <span className="text-sm text-gray-600">Generating smart reply suggestions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchSuggestions}
            className="text-red-600 hover:text-red-700"
            title="Retry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-800">Smart Reply Suggestions</h3>
        </div>
        <button
          onClick={fetchSuggestions}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          title="Refresh suggestions"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`bg-white rounded-lg p-3 border-2 transition-all ${
              selectedId === suggestion.id
                ? 'border-purple-500 shadow-md'
                : 'border-transparent hover:border-gray-200 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getSourceIcon(suggestion.source)}
                <span className="text-xs text-gray-500">
                  {suggestion.source === 'AI' ? 'AI-Generated' : 'Template'}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${getConfidenceColor(
                    suggestion.confidence
                  )}`}
                >
                  {suggestion.confidence}% confident
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-3 leading-relaxed">{suggestion.suggestion}</p>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleSelect(suggestion)}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Use This Reply</span>
              </button>
              <button
                onClick={() => handleCopy(suggestion)}
                className="p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                title="Copy to clipboard"
              >
                {copiedId === suggestion.id ? (
                  <span className="text-xs text-green-600 font-medium">Copied!</span>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-purple-100">
        <p className="text-xs text-gray-500 text-center">
          Suggestions are powered by AI and based on message sentiment, ticket context, and customer history
        </p>
      </div>
    </div>
  );
}
