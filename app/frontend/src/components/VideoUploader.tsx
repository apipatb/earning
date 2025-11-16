import { useState, useRef, DragEvent } from 'react';
import { Upload, X, Film, AlertCircle } from 'lucide-react';
import { notify } from '../store/notification.store';

interface VideoUploaderProps {
  onUploadComplete: (video: any) => void;
  onCancel: () => void;
}

export default function VideoUploader({ onUploadComplete, onCancel }: VideoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/webm',
  ];

  const maxSize = 2 * 1024 * 1024 * 1024; // 2GB

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      notify.error(
        'Invalid File Type',
        'Please select a valid video file (MP4, MPEG, MOV, AVI, WMV, or WEBM)'
      );
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      notify.error(
        'File Too Large',
        'Video file size exceeds the maximum limit of 2GB'
      );
      return;
    }

    setSelectedFile(file);

    // Auto-populate title from filename
    if (!title) {
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      setTitle(fileName);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      notify.error('Validation Error', 'Please select a video file');
      return;
    }

    if (!title.trim()) {
      notify.error('Validation Error', 'Please enter a video title');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title);
      if (description) {
        formData.append('description', description);
      }

      const token = localStorage.getItem('token');

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          notify.success('Success', 'Video uploaded successfully. Processing started.');
          onUploadComplete(response.video);
          resetForm();
        } else {
          const error = JSON.parse(xhr.responseText);
          notify.error('Upload Failed', error.message || 'Failed to upload video');
        }
        setUploading(false);
      });

      xhr.addEventListener('error', () => {
        notify.error('Upload Failed', 'Network error occurred during upload');
        setUploading(false);
      });

      xhr.open('POST', '/api/v1/videos/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (error) {
      console.error('Upload error:', error);
      notify.error('Upload Failed', 'An unexpected error occurred');
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setTitle('');
    setDescription('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Upload Video</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-500"
          disabled={uploading}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleUpload} className="space-y-4">
        {/* File Drop Zone */}
        {!selectedFile && (
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive
                ? 'border-primary bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileInput}
              className="hidden"
              disabled={uploading}
            />
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-900">
              Drop your video here, or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-500">
              MP4, MPEG, MOV, AVI, WMV, or WEBM up to 2GB
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Select File
            </button>
          </div>
        )}

        {/* Selected File Display */}
        {selectedFile && !uploading && (
          <div className="border border-gray-300 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Film className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Uploading...</span>
              <span className="font-medium text-gray-900">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              Please don't close this window while uploading
            </p>
          </div>
        )}

        {/* Video Information */}
        {selectedFile && (
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Video Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter video title"
                required
                disabled={uploading}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500">
                {title.length}/500 characters
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter video description"
                disabled={uploading}
                maxLength={5000}
              />
              <p className="mt-1 text-xs text-gray-500">
                {description.length}/5000 characters
              </p>
            </div>
          </div>
        )}

        {/* Info Notice */}
        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                What happens after upload?
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Your video will be uploaded to secure cloud storage</li>
                  <li>Automatic transcoding to multiple formats and resolutions</li>
                  <li>Thumbnail generation from the video</li>
                  <li>CDN distribution for fast worldwide streaming</li>
                  <li>Processing typically takes 5-15 minutes depending on file size</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedFile || uploading}
          >
            {uploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Video
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
