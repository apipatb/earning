/**
 * File Upload Hook
 * Handles file uploads with progress tracking and error handling
 * Supports: PDF, PNG, JPG, JPEG
 * Max file size: 50MB
 */

import { useCallback, useState } from 'react';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResponse {
  success: boolean;
  message: string;
  document: {
    id: string;
    filename: string;
    mimetype: string;
    size: number;
    uploadedAt: string;
  };
}

interface UploadError {
  error: string;
  code: string;
}

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });
  const [error, setError] = useState<UploadError | null>(null);

  const uploadFile = useCallback(
    async (
      file: File,
      onProgress?: (progress: UploadProgress) => void
    ): Promise<UploadResponse | null> => {
      try {
        setIsUploading(true);
        setError(null);
        setProgress({ loaded: 0, total: file.size, percentage: 0 });

        // Validate file size (50MB max)
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
        if (file.size > MAX_FILE_SIZE) {
          const errorObj: UploadError = {
            error: `File size exceeds maximum limit of 50MB`,
            code: 'FILE_TOO_LARGE',
          };
          setError(errorObj);
          setIsUploading(false);
          return null;
        }

        // Validate file type
        const ALLOWED_TYPES = [
          'application/pdf',
          'image/png',
          'image/jpeg',
        ];
        if (!ALLOWED_TYPES.includes(file.type)) {
          const errorObj: UploadError = {
            error: 'Invalid file type. Allowed types: PDF, PNG, JPG, JPEG',
            code: 'INVALID_FILE_TYPE',
          };
          setError(errorObj);
          setIsUploading(false);
          return null;
        }

        // Create FormData
        const formData = new FormData();
        formData.append('file', file);

        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          const errorObj: UploadError = {
            error: 'Authentication token not found',
            code: 'NO_TOKEN',
          };
          setError(errorObj);
          setIsUploading(false);
          return null;
        }

        // Make upload request
        const response = await fetch('/api/v1/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData: UploadError = await response.json();
          setError(errorData);
          setIsUploading(false);
          return null;
        }

        const data: UploadResponse = await response.json();

        setProgress({
          loaded: file.size,
          total: file.size,
          percentage: 100,
        });

        if (onProgress) {
          onProgress({
            loaded: file.size,
            total: file.size,
            percentage: 100,
          });
        }

        setIsUploading(false);
        return data;
      } catch (err) {
        const errorObj: UploadError = {
          error: err instanceof Error ? err.message : 'Upload failed',
          code: 'UPLOAD_ERROR',
        };
        setError(errorObj);
        setIsUploading(false);
        return null;
      }
    },
    []
  );

  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError({
          error: 'Authentication token not found',
          code: 'NO_TOKEN',
        });
        return false;
      }

      const response = await fetch(`/api/v1/upload/${fileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData: UploadError = await response.json();
        setError(errorData);
        return false;
      }

      return true;
    } catch (err) {
      const errorObj: UploadError = {
        error: err instanceof Error ? err.message : 'Delete failed',
        code: 'DELETE_ERROR',
      };
      setError(errorObj);
      return false;
    }
  }, []);

  const getDocument = useCallback(
    async (fileId: string): Promise<UploadResponse['document'] | null> => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError({
            error: 'Authentication token not found',
            code: 'NO_TOKEN',
          });
          return null;
        }

        const response = await fetch(`/api/v1/upload/${fileId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData: UploadError = await response.json();
          setError(errorData);
          return null;
        }

        const data: UploadResponse = await response.json();
        return data.document;
      } catch (err) {
        const errorObj: UploadError = {
          error: err instanceof Error ? err.message : 'Retrieval failed',
          code: 'RETRIEVAL_ERROR',
        };
        setError(errorObj);
        return null;
      }
    },
    []
  );

  const listDocuments = useCallback(
    async (): Promise<UploadResponse['document'][] | null> => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError({
            error: 'Authentication token not found',
            code: 'NO_TOKEN',
          });
          return null;
        }

        const response = await fetch('/api/v1/upload', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData: UploadError = await response.json();
          setError(errorData);
          return null;
        }

        const data = await response.json();
        return data.documents;
      } catch (err) {
        const errorObj: UploadError = {
          error: err instanceof Error ? err.message : 'List failed',
          code: 'LIST_ERROR',
        };
        setError(errorObj);
        return null;
      }
    },
    []
  );

  return {
    uploadFile,
    deleteFile,
    getDocument,
    listDocuments,
    isUploading,
    progress,
    error,
    clearError: () => setError(null),
  };
};

/**
 * Example usage in a React component:
 *
 * const { uploadFile, isUploading, progress, error } = useFileUpload();
 *
 * const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *   const file = e.target.files?.[0];
 *   if (file) {
 *     const result = await uploadFile(file, (progress) => {
 *       console.log(`Upload progress: ${progress.percentage}%`);
 *     });
 *     if (result) {
 *       console.log('File uploaded successfully', result);
 *     }
 *   }
 * };
 */
