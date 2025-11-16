import { Smile, Meh, Frown } from 'lucide-react';

interface SentimentBadgeProps {
  emotion: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  score: number;
  confidence?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function SentimentBadge({
  emotion,
  score,
  confidence,
  showScore = false,
  size = 'md',
}: SentimentBadgeProps) {
  const getEmotionConfig = () => {
    switch (emotion) {
      case 'POSITIVE':
        return {
          icon: Smile,
          label: 'Positive',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-300',
          iconColor: 'text-green-600',
        };
      case 'NEUTRAL':
        return {
          icon: Meh,
          label: 'Neutral',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-300',
          iconColor: 'text-gray-600',
        };
      case 'NEGATIVE':
        return {
          icon: Frown,
          label: 'Negative',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-300',
          iconColor: 'text-red-600',
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          badge: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3',
        };
      case 'md':
        return {
          badge: 'px-2.5 py-1.5 text-sm',
          icon: 'w-4 h-4',
        };
      case 'lg':
        return {
          badge: 'px-3 py-2 text-base',
          icon: 'w-5 h-5',
        };
    }
  };

  const config = getEmotionConfig();
  const sizeClasses = getSizeClasses();
  const Icon = config.icon;

  const formatScore = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}`;
  };

  return (
    <div className="inline-flex items-center">
      <span
        className={`
          inline-flex items-center gap-1.5 rounded-full border font-medium
          ${config.bgColor}
          ${config.textColor}
          ${config.borderColor}
          ${sizeClasses.badge}
        `}
        title={
          confidence
            ? `${config.label} (${(confidence).toFixed(0)}% confidence)`
            : config.label
        }
      >
        <Icon className={`${config.iconColor} ${sizeClasses.icon}`} />
        <span>{config.label}</span>
        {showScore && (
          <span className="font-semibold ml-1">{formatScore(score)}</span>
        )}
      </span>
    </div>
  );
}
