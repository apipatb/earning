import { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';
import { notify } from '../store/notification.store';

interface VideoPlayerProps {
  videoId: string;
  onClose: () => void;
}

interface HLSPlaylist {
  masterPlaylistUrl: string;
  variantPlaylists: Array<{
    resolution: string;
    bandwidth: number;
    url: string;
  }>;
}

export default function VideoPlayer({ videoId, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [hlsInstance, setHlsInstance] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [qualities, setQualities] = useState<Array<{ resolution: string; url: string }>>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [watchStartTime, setWatchStartTime] = useState<number>(Date.now());
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadVideo();
    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      // Log watch time on unmount
      logWatchTime();
    };
  }, [videoId]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  const loadVideo = async () => {
    try {
      const token = localStorage.getItem('token');

      // Try to get HLS playlist first
      const streamResponse = await fetch(`/api/v1/videos/${videoId}/stream`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (streamResponse.ok) {
        const streamData = await streamResponse.json();
        const playlist: HLSPlaylist = streamData.playlist;

        // Load HLS.js if available
        if (typeof window !== 'undefined' && (window as any).Hls) {
          const Hls = (window as any).Hls;

          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
            });

            hls.loadSource(playlist.masterPlaylistUrl);
            hls.attachMedia(videoRef.current!);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setLoading(false);
              // Auto-play
              videoRef.current?.play().catch(() => {
                // Auto-play prevented
                setPlaying(false);
              });
            });

            hls.on(Hls.Events.ERROR, (event: any, data: any) => {
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.error('Network error:', data);
                    notify.error('Playback Error', 'Network error occurred');
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.error('Media error:', data);
                    hls.recoverMediaError();
                    break;
                  default:
                    console.error('Fatal error:', data);
                    notify.error('Playback Error', 'Unable to play video');
                    break;
                }
              }
            });

            setHlsInstance(hls);
            setQualities(
              playlist.variantPlaylists.map((v) => ({
                resolution: v.resolution,
                url: v.url,
              }))
            );
          } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            videoRef.current.src = playlist.masterPlaylistUrl;
            setLoading(false);
          }
        } else {
          // HLS.js not loaded, try direct URL
          await loadDirectUrl();
        }
      } else {
        // Fallback to direct video URL
        await loadDirectUrl();
      }

      // Log access
      await logAccess();
    } catch (error) {
      console.error('Error loading video:', error);
      notify.error('Error', 'Failed to load video');
      setLoading(false);
    }
  };

  const loadDirectUrl = async () => {
    try {
      const token = localStorage.getItem('token');
      const urlResponse = await fetch(`/api/v1/videos/${videoId}/url`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!urlResponse.ok) {
        throw new Error('Failed to get video URL');
      }

      const urlData = await urlResponse.json();
      setVideoUrl(urlData.url);

      if (videoRef.current) {
        videoRef.current.src = urlData.url;
        setLoading(false);
      }
    } catch (error) {
      throw error;
    }
  };

  const logAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/v1/videos/${videoId}/access`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      console.error('Error logging access:', error);
    }
  };

  const logWatchTime = async () => {
    if (currentTime === 0) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/v1/videos/${videoId}/access`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          watchTime: currentTime,
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      console.error('Error logging watch time:', error);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setMuted(newVolume === 0);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) {
        setShowControls(false);
      }
    }, 3000);
  };

  const changeQuality = (index: number) => {
    if (!hlsInstance || index === selectedQuality) return;

    if (index === -1) {
      // Auto quality
      hlsInstance.currentLevel = -1;
    } else {
      hlsInstance.currentLevel = index;
    }
    setSelectedQuality(index);
    setShowQualityMenu(false);
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Video Player</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Video Container */}
      <div
        className="relative bg-black rounded-lg overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => playing && setShowControls(false)}
      >
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        )}

        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full aspect-video"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onClick={togglePlay}
        />

        {/* Custom Controls */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress Bar */}
          <div className="px-4 pt-4">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`,
              }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between px-4 pb-4 pt-2">
            <div className="flex items-center space-x-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="text-white hover:text-gray-300"
              >
                {playing ? (
                  <Pause className="h-6 w-6" fill="white" />
                ) : (
                  <Play className="h-6 w-6" fill="white" />
                )}
              </button>

              {/* Volume */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-gray-300"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Time */}
              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quality Selector */}
              {qualities.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="text-white hover:text-gray-300"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-lg py-2 min-w-[120px]">
                      <button
                        onClick={() => changeQuality(-1)}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          selectedQuality === -1
                            ? 'text-blue-400 bg-gray-800'
                            : 'text-white hover:bg-gray-800'
                        }`}
                      >
                        Auto
                      </button>
                      {qualities.map((quality, index) => (
                        <button
                          key={index}
                          onClick={() => changeQuality(index)}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            selectedQuality === index
                              ? 'text-blue-400 bg-gray-800'
                              : 'text-white hover:bg-gray-800'
                          }`}
                        >
                          {quality.resolution}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-gray-300"
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
