import { ReactNode } from 'react';
import { GripVertical, X, Maximize2, Minimize2 } from 'lucide-react';

interface WidgetContainerProps {
  title: string;
  children: ReactNode;
  editMode?: boolean;
  onRemove?: () => void;
  onResize?: () => void;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function WidgetContainer({
  title,
  children,
  editMode = false,
  onRemove,
  onResize,
  size = 'medium',
  className = '',
}: WidgetContainerProps) {
  const sizeClasses = {
    small: 'col-span-1',
    medium: 'md:col-span-1',
    large: 'md:col-span-2',
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow ${
        editMode ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''
      } ${sizeClasses[size]} ${className}`}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {editMode && (
            <button className="cursor-move text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <GripVertical className="h-5 w-5" />
            </button>
          )}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>

        {editMode && (
          <div className="flex items-center gap-1">
            {onResize && (
              <button
                onClick={onResize}
                className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                title="Resize"
              >
                {size === 'large' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded"
                title="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}
