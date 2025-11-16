import { useEffect, useState } from 'react';
import { Upload, Play, Trash2, Download, BarChart3, Film } from 'lucide-react';
import { notify } from '../store/notification.store';
import VideoUploader from '../components/VideoUploader';
import VideoPlayer from '../components/VideoPlayer';
import VideoTranscodingStatus from '../components/VideoTranscodingStatus';

interface Video {
  id: string;
  title: string;
  description?: string;
  status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
  thumbnail?: string;
  cdnUrl?: string;
  views: number;
  duration?: number;
  fileSize: number;
  resolution?: string;
  uploadedAt: string;
  processedAt?: string;
  transcodeJobs: TranscodeJob[];
  _count: {
    accessLogs: number;
  };
}

interface TranscodeJob {
  id: string;
  format: 'MP4' | 'WEBM' | 'HLS';
  resolution: 'SD_480P' | 'HD_720P' | 'FHD_1080P' | 'QHD_2K' | 'UHD_4K';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fileSize?: number;
  bitrate?: number;
  completedAt?: string;
}

interface VideoAnalytics {
  totalViews: number;
  uniqueViewers: number;
  avgWatchTime: number;
  viewsByCountry: Array<{ country: string; views: number }>;
  viewsOverTime: Array<{ date: string; views: number }>;
}

export default function VideoLibrary() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<VideoAnalytics | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadVideos();
  }, [page]);

  const loadVideos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/videos?page=${page}&limit=12`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load videos');
      }

      const data = await response.json();
      setVideos(data.videos);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      notify.error('Error', 'Failed to load videos. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (video: Video) => {
    setVideos([video, ...videos]);
    setShowUploader(false);
    notify.success('Success', 'Video uploaded successfully. Processing started.');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/videos/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete video');
      }

      setVideos(videos.filter((v) => v.id !== id));
      notify.success('Success', 'Video deleted successfully');
    } catch (error) {
      notify.error('Error', 'Failed to delete video. Please try again.');
      console.error(error);
    }
  };

  const handlePlayVideo = (video: Video) => {
    setSelectedVideo(video);
    setShowPlayer(true);
  };

  const handleViewAnalytics = async (video: Video) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/videos/${video.id}/analytics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const data = await response.json();
      setAnalytics(data.analytics);
      setSelectedVideo(video);
      setShowAnalytics(true);
    } catch (error) {
      notify.error('Error', 'Failed to load analytics. Please try again.');
      console.error(error);
    }
  };

  const handleTriggerTranscode = async (videoId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/videos/${videoId}/transcode`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formats: ['MP4', 'WEBM', 'HLS'],
          resolutions: ['HD_720P', 'FHD_1080P'],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start transcoding');
      }

      notify.success('Success', 'Transcoding started. This may take a few minutes.');
      loadVideos();
    } catch (error) {
      notify.error('Error', 'Failed to start transcoding. Please try again.');
      console.error(error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: Video['status']) => {
    const styles = {
      UPLOADING: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-yellow-100 text-yellow-800',
      READY: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading videos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Library</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your video content with upload, transcoding, and CDN distribution
          </p>
        </div>
        <button
          onClick={() => setShowUploader(!showUploader)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Video
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Film className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Videos</dt>
                  <dd className="text-lg font-medium text-gray-900">{videos.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Play className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Ready to Stream</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {videos.filter((v) => v.status === 'READY').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Upload className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Processing</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {videos.filter((v) => v.status === 'PROCESSING' || v.status === 'UPLOADING').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Views</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {videos.reduce((sum, v) => sum + v.views, 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Uploader */}
      {showUploader && (
        <div className="bg-white shadow rounded-lg p-6">
          <VideoUploader onUploadComplete={handleUploadComplete} onCancel={() => setShowUploader(false)} />
        </div>
      )}

      {/* Video Grid */}
      {videos.length === 0 ? (
        <div className="text-center py-12 bg-white shadow rounded-lg">
          <Film className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No videos</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by uploading your first video.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowUploader(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-600"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Video
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <div key={video.id} className="bg-white shadow rounded-lg overflow-hidden">
              {/* Thumbnail */}
              <div className="relative h-48 bg-gray-200">
                {video.thumbnail ? (
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Film className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                {video.status === 'READY' && (
                  <button
                    onClick={() => handlePlayVideo(video)}
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 hover:bg-opacity-60 transition-opacity"
                  >
                    <Play className="h-16 w-16 text-white" fill="white" />
                  </button>
                )}
                <div className="absolute top-2 right-2">{getStatusBadge(video.status)}</div>
                {video.duration && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.duration)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 truncate">{video.title}</h3>
                {video.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{video.description}</p>
                )}

                <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>{video.views} views</span>
                    <span>{formatFileSize(video.fileSize)}</span>
                  </div>
                </div>

                {video.resolution && (
                  <div className="mt-2 text-xs text-gray-500">{video.resolution}</div>
                )}

                {/* Transcoding Status */}
                {(video.status === 'PROCESSING' || video.status === 'UPLOADING') && (
                  <div className="mt-3">
                    <VideoTranscodingStatus videoId={video.id} />
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex space-x-2">
                  {video.status === 'READY' && (
                    <>
                      <button
                        onClick={() => handlePlayVideo(video)}
                        className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Play
                      </button>
                      <button
                        onClick={() => handleViewAnalytics(video)}
                        className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Analytics
                      </button>
                    </>
                  )}
                  {video.status === 'FAILED' && (
                    <button
                      onClick={() => handleTriggerTranscode(video.id)}
                      className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Video Player Modal */}
      {showPlayer && selectedVideo && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowPlayer(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
              <VideoPlayer videoId={selectedVideo.id} onClose={() => setShowPlayer(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && selectedVideo && analytics && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowAnalytics(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900">{selectedVideo.title} - Analytics</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Total Views</div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.totalViews}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Unique Viewers</div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.uniqueViewers}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500">Avg Watch Time</div>
                  <div className="text-2xl font-bold text-gray-900">{formatDuration(analytics.avgWatchTime)}</div>
                </div>
              </div>
              {analytics.viewsByCountry.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Views by Country</h3>
                  <div className="space-y-2">
                    {analytics.viewsByCountry.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">{item.country || 'Unknown'}</span>
                        <span className="text-sm font-medium text-gray-900">{item.views} views</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
