import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader, Clock } from 'lucide-react';

interface TranscodeJob {
  id: string;
  format: 'MP4' | 'WEBM' | 'HLS';
  resolution: 'SD_480P' | 'HD_720P' | 'FHD_1080P' | 'QHD_2K' | 'UHD_4K';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fileSize?: number;
  bitrate?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface TranscodeStatus {
  videoId: string;
  videoStatus: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
  transcodeJobs: TranscodeJob[];
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
  processingJobs: number;
}

interface VideoTranscodingStatusProps {
  videoId: string;
  compact?: boolean;
  onComplete?: () => void;
}

export default function VideoTranscodingStatus({
  videoId,
  compact = false,
  onComplete,
}: VideoTranscodingStatusProps) {
  const [status, setStatus] = useState<TranscodeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();

    // Poll for updates every 5 seconds while processing
    const interval = setInterval(() => {
      if (status && (status.videoStatus === 'PROCESSING' || status.videoStatus === 'UPLOADING')) {
        loadStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [videoId, status?.videoStatus]);

  const loadStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/videos/${videoId}/transcode-status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load transcode status');
      }

      const data = await response.json();
      setStatus(data);

      // Check if processing is complete
      if (data.videoStatus === 'READY' && onComplete) {
        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getResolutionLabel = (resolution: string): string => {
    const labels: Record<string, string> = {
      SD_480P: '480p',
      HD_720P: '720p',
      FHD_1080P: '1080p',
      QHD_2K: '2K',
      UHD_4K: '4K',
    };
    return labels[resolution] || resolution;
  };

  const getFormatLabel = (format: string): string => {
    return format.toUpperCase();
  };

  const getStatusIcon = (jobStatus: TranscodeJob['status']) => {
    switch (jobStatus) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'PROCESSING':
        return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (jobStatus: TranscodeJob['status']) => {
    switch (jobStatus) {
      case 'COMPLETED':
        return 'text-green-700 bg-green-50';
      case 'FAILED':
        return 'text-red-700 bg-red-50';
      case 'PROCESSING':
        return 'text-blue-700 bg-blue-50';
      case 'PENDING':
        return 'text-gray-700 bg-gray-50';
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader className="h-5 w-5 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Error loading status: {error}
      </div>
    );
  }

  if (!status) {
    return null;
  }

  // Compact view - just show progress bar
  if (compact) {
    const progress = status.totalJobs > 0
      ? Math.round((status.completedJobs / status.totalJobs) * 100)
      : 0;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>
            {status.videoStatus === 'UPLOADING' && 'Uploading...'}
            {status.videoStatus === 'PROCESSING' && `Processing: ${status.completedJobs}/${status.totalJobs} jobs`}
            {status.videoStatus === 'READY' && 'Ready'}
            {status.videoStatus === 'FAILED' && 'Failed'}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              status.videoStatus === 'FAILED' ? 'bg-red-500' :
              status.videoStatus === 'READY' ? 'bg-green-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  // Full view - show detailed status
  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Transcoding Status</h3>
          <p className="text-xs text-gray-500 mt-1">
            {status.completedJobs} of {status.totalJobs} jobs completed
          </p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          status.videoStatus === 'READY' ? 'bg-green-100 text-green-800' :
          status.videoStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
          status.videoStatus === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {status.videoStatus}
        </span>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2 bg-blue-50 rounded-lg">
          <div className="text-lg font-semibold text-blue-700">{status.processingJobs}</div>
          <div className="text-xs text-blue-600">Processing</div>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <div className="text-lg font-semibold text-green-700">{status.completedJobs}</div>
          <div className="text-xs text-green-600">Completed</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-700">{status.pendingJobs}</div>
          <div className="text-xs text-gray-600">Pending</div>
        </div>
        <div className="text-center p-2 bg-red-50 rounded-lg">
          <div className="text-lg font-semibold text-red-700">{status.failedJobs}</div>
          <div className="text-xs text-red-600">Failed</div>
        </div>
      </div>

      {/* Job Details */}
      {status.transcodeJobs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider">
            Transcode Jobs
          </h4>
          <div className="space-y-2">
            {status.transcodeJobs.map((job) => (
              <div
                key={job.id}
                className={`flex items-center justify-between p-3 rounded-lg ${getStatusColor(job.status)}`}
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <div className="text-sm font-medium">
                      {getFormatLabel(job.format)} - {getResolutionLabel(job.resolution)}
                    </div>
                    {job.bitrate && (
                      <div className="text-xs opacity-75">
                        {job.bitrate} kbps
                        {job.fileSize && ` • ${formatFileSize(job.fileSize)}`}
                      </div>
                    )}
                    {job.error && (
                      <div className="text-xs text-red-600 mt-1">
                        Error: {job.error}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs font-medium uppercase">
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Animation */}
      {(status.videoStatus === 'PROCESSING' || status.videoStatus === 'UPLOADING') && (
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 py-2">
          <Loader className="h-4 w-4 animate-spin" />
          <span>
            {status.videoStatus === 'UPLOADING'
              ? 'Uploading video to cloud storage...'
              : 'Transcoding in progress. This may take several minutes...'}
          </span>
        </div>
      )}

      {/* Ready Message */}
      {status.videoStatus === 'READY' && (
        <div className="flex items-center justify-center space-x-2 text-sm text-green-600 py-2">
          <CheckCircle className="h-4 w-4" />
          <span>Video is ready for streaming!</span>
        </div>
      )}

      {/* Failed Message */}
      {status.videoStatus === 'FAILED' && (
        <div className="flex items-center justify-center space-x-2 text-sm text-red-600 py-2">
          <XCircle className="h-4 w-4" />
          <span>Video processing failed. Please try uploading again.</span>
        </div>
      )}
    </div>
  );
}
