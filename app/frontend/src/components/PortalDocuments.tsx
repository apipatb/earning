import { useEffect, useState } from 'react';
import { Download, File, FileText, Image, Video, Archive, Search } from 'lucide-react';
import { notify } from '../store/notification.store';

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  thumbnailUrl: string | null;
  uploadedAt: string;
}

export default function PortalDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Mock customer ID
  const customerId = 'demo-customer-id';

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/v1/customer/documents?customerId=${customerId}`);

      // Mock data
      setDocuments([
        {
          id: '1',
          fileName: 'Service Agreement.pdf',
          fileSize: 245678,
          mimeType: 'application/pdf',
          url: '#',
          thumbnailUrl: null,
          uploadedAt: new Date().toISOString(),
        },
        {
          id: '2',
          fileName: 'Product Specifications.docx',
          fileSize: 89234,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          url: '#',
          thumbnailUrl: null,
          uploadedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '3',
          fileName: 'Invoice_2024_001.pdf',
          fileSize: 123456,
          mimeType: 'application/pdf',
          url: '#',
          thumbnailUrl: null,
          uploadedAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: '4',
          fileName: 'Product Image.jpg',
          fileSize: 567890,
          mimeType: 'image/jpeg',
          url: '#',
          thumbnailUrl: '#',
          uploadedAt: new Date(Date.now() - 259200000).toISOString(),
        },
      ]);
    } catch (error) {
      notify.error('Error', 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (documentId: string, fileName: string) => {
    try {
      // TODO: Implement actual download
      notify.success('Success', `Downloading ${fileName}`);
    } catch (error) {
      notify.error('Error', 'Failed to download document');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="w-8 h-8 text-purple-500" />;
    } else if (mimeType.startsWith('video/')) {
      return <Video className="w-8 h-8 text-red-500" />;
    } else if (mimeType.includes('pdf')) {
      return <FileText className="w-8 h-8 text-red-500" />;
    } else if (
      mimeType.includes('zip') ||
      mimeType.includes('rar') ||
      mimeType.includes('archive')
    ) {
      return <Archive className="w-8 h-8 text-yellow-500" />;
    } else {
      return <File className="w-8 h-8 text-blue-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileTypeFromMime = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'archive';
    return 'other';
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const fileType = getFileTypeFromMime(doc.mimeType);
    const matchesFilter = filterType === 'ALL' || fileType === filterType;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
        <p className="text-sm text-gray-600 mt-1">
          Access and download your documents
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="image">Images</option>
              <option value="pdf">PDFs</option>
              <option value="document">Documents</option>
              <option value="spreadsheet">Spreadsheets</option>
              <option value="video">Videos</option>
              <option value="archive">Archives</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <File className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Size</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatFileSize(documents.reduce((sum, doc) => sum + doc.fileSize, 0))}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Archive className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent Upload</p>
              <p className="text-sm font-bold text-gray-900">
                {documents.length > 0
                  ? new Date(documents[0].uploadedAt).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No documents found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getFileIcon(doc.mimeType)}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {doc.fileName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(doc.fileSize)}
                    </p>
                  </div>
                </div>
              </div>

              {doc.thumbnailUrl && (
                <div className="mb-4">
                  <img
                    src={doc.thumbnailUrl}
                    alt={doc.fileName}
                    className="w-full h-32 object-cover rounded"
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span>
                  Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                </span>
              </div>

              <button
                onClick={() => handleDownload(doc.id, doc.fileName)}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
