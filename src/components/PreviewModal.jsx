import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import { saveAs } from 'file-saver';
import ApperIcon from './ApperIcon';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PreviewModal = ({ file, onClose, onDelete }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [searchText, setSearchText] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentPage < numPages) {
        setCurrentPage(prev => prev + 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, currentPage, numPages]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const downloadFile = async () => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      saveAs(blob, file.name);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getFileType = () => {
    const type = file.type.toLowerCase();
    if (type.includes('pdf')) return 'pdf';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('image/')) return 'image';
    if (type.includes('word') || type.includes('doc')) return 'document';
    if (type.includes('excel') || type.includes('sheet')) return 'document';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'document';
    return 'other';
  };

  const renderPDFViewer = () => (
    <div className="space-y-4">
      {/* PDF Controls */}
      <div className="flex items-center justify-between bg-surface-100 dark:bg-surface-700 rounded-lg p-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg bg-white dark:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ApperIcon name="ChevronLeft" className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">
            Page {currentPage} of {numPages || '?'}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(numPages, prev + 1))}
            disabled={currentPage >= numPages}
            className="p-2 rounded-lg bg-white dark:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ApperIcon name="ChevronRight" className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
            className="p-2 rounded-lg bg-white dark:bg-surface-800"
          >
            <ApperIcon name="ZoomOut" className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(prev => Math.min(3.0, prev + 0.1))}
            className="p-2 rounded-lg bg-white dark:bg-surface-800"
          >
            <ApperIcon name="ZoomIn" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Search */}
      <div className="relative">
        <ApperIcon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          placeholder="Search in PDF..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* PDF Document */}
      <div className="max-h-[60vh] overflow-auto bg-surface-50 dark:bg-surface-900 rounded-lg p-4">
        <Document
          file={file.url}
          onLoadSuccess={({ numPages }) => {
            setNumPages(numPages);
            setIsLoading(false);
          }}
          onLoadError={(error) => {
            setError('Failed to load PDF');
            setIsLoading(false);
          }}
          loading={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            className="shadow-lg"
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>
    </div>
  );

  const renderVideoViewer = () => (
    <div className="space-y-4">
      <video
        controls
        className="preview-video w-full max-h-[60vh] bg-black rounded-lg"
        onLoadStart={() => setIsLoading(true)}
        onLoadedData={() => setIsLoading(false)}
        onError={() => {
          setError('Failed to load video');
          setIsLoading(false);
        }}
      >
        <source src={file.url} type={file.type} />
        Your browser does not support the video tag.
      </video>
      <div className="flex items-center justify-between text-sm text-surface-600 dark:text-surface-400">
        <span>Video format: {file.type}</span>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="flex items-center space-x-1 hover:text-primary"
        >
          <ApperIcon name="Maximize" className="w-4 h-4" />
          <span>Fullscreen</span>
        </button>
      </div>
    </div>
  );

  const renderImageViewer = () => (
    <div className="space-y-4">
      <div className="max-h-[60vh] overflow-auto bg-surface-50 dark:bg-surface-900 rounded-lg p-4">
        <img
          src={file.url}
          alt={file.name}
          className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setError('Failed to load image');
            setIsLoading(false);
          }}
          style={{ transform: `scale(${scale})` }}
        />
      </div>
      <div className="flex items-center justify-center space-x-3">
        <button
          onClick={() => setScale(prev => Math.max(0.1, prev - 0.1))}
          className="p-2 rounded-lg bg-surface-100 dark:bg-surface-700"
        >
          <ApperIcon name="ZoomOut" className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(prev => Math.min(5.0, prev + 0.1))}
          className="p-2 rounded-lg bg-surface-100 dark:bg-surface-700"
        >
          <ApperIcon name="ZoomIn" className="w-4 h-4" />
        </button>
        <button
          onClick={() => setScale(1.0)}
          className="px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 text-sm"
        >
          Reset
        </button>
      </div>
    </div>
  );

  const renderDocumentViewer = () => (
    <div className="space-y-4">
      <div className="bg-surface-50 dark:bg-surface-900 rounded-lg p-4">
        <iframe
          src={`https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true`}
          className="w-full h-96 border-0 rounded-lg"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setError('Failed to load document');
            setIsLoading(false);
          }}
          title={file.name}
        />
      </div>
      <div className="text-sm text-surface-600 dark:text-surface-400 text-center">
        Document viewer powered by Google Docs
      </div>
    </div>
  );

  const renderDefaultViewer = () => (
    <div className="text-center py-12">
      <div className="bg-surface-100 dark:bg-surface-700 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
        <ApperIcon name="File" className="w-12 h-12 text-surface-400" />
      </div>
      <h3 className="text-lg font-medium text-surface-900 dark:text-surface-50 mb-2">
        Preview not available
      </h3>
      <p className="text-surface-600 dark:text-surface-400 mb-4">
        This file type cannot be previewed. You can download it to view the content.
      </p>
      <button
        onClick={downloadFile}
        className="flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors mx-auto"
      >
        <ApperIcon name="Download" className="w-4 h-4" />
        <span>Download File</span>
      </button>
    </div>
  );

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-surface-600 dark:text-surface-400">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="bg-red-100 dark:bg-red-900/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <ApperIcon name="AlertCircle" className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-surface-900 dark:text-surface-50 mb-2">
            Preview Error
          </h3>
          <p className="text-surface-600 dark:text-surface-400 mb-4">{error}</p>
          <button
            onClick={downloadFile}
            className="flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors mx-auto"
          >
            <ApperIcon name="Download" className="w-4 h-4" />
            <span>Download File</span>
          </button>
        </div>
      );
    }

    const fileType = getFileType();
    switch (fileType) {
      case 'pdf':
        return renderPDFViewer();
      case 'video':
        return renderVideoViewer();
      case 'image':
        return renderImageViewer();
      case 'document':
        return renderDocumentViewer();
      default:
        return renderDefaultViewer();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 modal-backdrop z-60 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      ref={modalRef}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden glassmorphism"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <ApperIcon name={getFileIcon(file.type)} className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 truncate max-w-md">
                {file.name}
              </h3>
              <p className="text-sm text-surface-600 dark:text-surface-400">
                {formatFileSize(file.size)} • {file.type}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
          >
            <ApperIcon name="X" className="w-5 h-5 text-surface-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          {renderPreview()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50">
          <div className="text-sm text-surface-600 dark:text-surface-400">
            Uploaded {new Date(file.uploadedAt).toLocaleString()}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={downloadFile}
              className="flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors"
            >
              <ApperIcon name="Download" className="w-4 h-4" />
              <span>Download</span>
            </button>
            <button
              onClick={() => onDelete(file.id)}
              className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <ApperIcon name="Trash2" className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Helper function (moved from MainFeature for reuse)
const getFileIcon = (type) => {
  if (type.startsWith('image/')) return 'Image';
  if (type.startsWith('video/')) return 'Video';
  if (type.startsWith('audio/')) return 'Music';
  if (type.includes('pdf')) return 'FileText';
  if (type.includes('zip') || type.includes('rar')) return 'Archive';
  return 'File';
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default PreviewModal;