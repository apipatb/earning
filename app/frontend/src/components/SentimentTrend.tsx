import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import SentimentBadge from './SentimentBadge';

interface SentimentMessage {
  id: string;
  content: string;
  score: number;
  emotion: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  createdAt: string;
}

interface SentimentTrendProps {
  ticketId: string;
  messages?: SentimentMessage[];
  averageScore?: number;
  trend?: 'improving' | 'declining' | 'stable';
  showChart?: boolean;
}

export default function SentimentTrend({
  ticketId,
  messages = [],
  averageScore = 0,
  trend = 'stable',
  showChart = true,
}: SentimentTrendProps) {
  const [loading, setLoading] = useState(false);
  const [sentimentData, setSentimentData] = useState<SentimentMessage[]>(messages);
  const [avgScore, setAvgScore] = useState(averageScore);
  const [trendDirection, setTrendDirection] = useState(trend);

  useEffect(() => {
    if (messages.length === 0 && ticketId) {
      fetchSentimentData();
    } else {
      setSentimentData(messages);
      setAvgScore(averageScore);
      setTrendDirection(trend);
    }
  }, [ticketId, messages, averageScore, trend]);

  const fetchSentimentData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/sentiment/ticket/${ticketId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSentimentData(data.data.messages || []);
        setAvgScore(data.data.averageScore || 0);
        setTrendDirection(data.data.trend || 'stable');
      }
    } catch (error) {
      console.error('Failed to fetch sentiment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = () => {
    switch (trendDirection) {
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTrendLabel = () => {
    switch (trendDirection) {
      case 'improving':
        return 'Improving';
      case 'declining':
        return 'Declining';
      default:
        return 'Stable';
    }
  };

  const getTrendColor = () => {
    switch (trendDirection) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.3) return 'text-green-600';
    if (score <= -0.3) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-24 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (sentimentData.length === 0) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">No sentiment data available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Section */}
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
        <div>
          <h3 className="text-sm font-medium text-gray-700">Average Sentiment</h3>
          <p className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>
            {avgScore >= 0 ? '+' : ''}
            {avgScore.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <span className={`text-sm font-medium ${getTrendColor()}`}>
            {getTrendLabel()}
          </span>
        </div>
      </div>

      {/* Chart Section */}
      {showChart && (
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-4">
            Sentiment Over Time ({sentimentData.length} messages)
          </h4>
          <div className="space-y-3">
            {sentimentData.map((message, index) => {
              const scorePercentage = ((message.score + 1) / 2) * 100; // Convert -1 to 1 range to 0-100%

              return (
                <div key={message.id} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      Message {index + 1} - {formatDate(message.createdAt)}
                    </span>
                    <SentimentBadge
                      emotion={message.emotion}
                      score={message.score}
                      showScore
                      size="sm"
                    />
                  </div>
                  <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`absolute left-0 h-full transition-all duration-300 ${
                        message.score >= 0.3
                          ? 'bg-green-500'
                          : message.score <= -0.3
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                      }`}
                      style={{ width: `${scorePercentage}%` }}
                    />
                    {/* Midpoint indicator */}
                    <div className="absolute left-1/2 top-0 h-full w-px bg-gray-300" />
                  </div>
                  {message.content && (
                    <p className="text-xs text-gray-600 truncate" title={message.content}>
                      {message.content}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
