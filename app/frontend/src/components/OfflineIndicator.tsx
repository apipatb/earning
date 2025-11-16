/**
 * Offline Indicator Component
 * Shows online/offline status and syncing state
 */

import { useState, useEffect } from 'react';
import {
  isOnline,
  onNetworkStatusChange,
  getPendingRequestsCount,
  syncPendingRequests
} from '../lib/pwa-utils';

interface OfflineIndicatorProps {
  /**
   * Position of the indicator
   * @default 'bottom-right'
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  /**
   * Show pending requests count
   * @default true
   */
  showPendingCount?: boolean;

  /**
   * Auto-hide when online
   * @default false
   */
  autoHideWhenOnline?: boolean;

  /**
   * Delay before auto-hiding (ms)
   * @default 3000
   */
  autoHideDelay?: number;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export default function OfflineIndicator({
  position = 'bottom-right',
  showPendingCount = true,
  autoHideWhenOnline = false,
  autoHideDelay = 3000
}: OfflineIndicatorProps) {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Listen for network status changes
    const unsubscribe = onNetworkStatusChange((status) => {
      setOnline(status);
      setIsVisible(true);

      if (status) {
        // Auto-sync when coming online
        handleSync();

        // Auto-hide if enabled
        if (autoHideWhenOnline) {
          setTimeout(() => {
            setIsVisible(false);
          }, autoHideDelay);
        }
      }
    });

    // Update pending count periodically
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      unsubscribe?.();
      clearInterval(interval);
    };
  }, [autoHideWhenOnline, autoHideDelay]);

  const updatePendingCount = async () => {
    const count = await getPendingRequestsCount();
    setPendingCount(count);
  };

  const handleSync = async () => {
    if (!online) return;

    setSyncStatus('syncing');

    try {
      await syncPendingRequests();
      await updatePendingCount();
      setSyncStatus('success');

      setTimeout(() => {
        setSyncStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('[OfflineIndicator] Sync failed:', error);
      setSyncStatus('error');

      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    }
  };

  const getPositionClasses = () => {
    const positions = {
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4'
    };
    return positions[position];
  };

  if (!isVisible && online) {
    return null;
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-40 animate-slide-in`}>
      <div
        className={`
          flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm
          transition-all duration-300
          ${
            online
              ? 'bg-green-500/90 text-white'
              : 'bg-red-500/90 text-white'
          }
        `}
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {online ? (
            syncStatus === 'syncing' ? (
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            ) : syncStatus === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                />
              </svg>
            )
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.415m-1.414-1.415l-2.828 2.829m0 0a1 1 0 101.415 1.414"
              />
            </svg>
          )}
        </div>

        {/* Status Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm">
              {online ? (
                syncStatus === 'syncing' ? (
                  'Syncing...'
                ) : syncStatus === 'success' ? (
                  'Synced'
                ) : (
                  'Online'
                )
              ) : (
                'Offline'
              )}
            </span>

            {/* Pending Count Badge */}
            {!online && showPendingCount && pendingCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20">
                {pendingCount} pending
              </span>
            )}
          </div>

          {!online && (
            <p className="text-xs opacity-90 mt-0.5">
              Changes will sync when back online
            </p>
          )}
        </div>

        {/* Sync Button */}
        {online && pendingCount > 0 && syncStatus === 'idle' && (
          <button
            onClick={handleSync}
            className="flex-shrink-0 px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors text-sm font-medium"
          >
            Sync Now
          </button>
        )}

        {/* Close Button */}
        {online && autoHideWhenOnline && (
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Detailed Status (when offline with pending items) */}
      {!online && pendingCount > 0 && (
        <div className="mt-2 px-4 py-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-sm">
          <div className="flex items-start space-x-2">
            <svg
              className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">
                You have {pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Your changes are saved locally and will automatically sync when your connection is
                restored.
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
