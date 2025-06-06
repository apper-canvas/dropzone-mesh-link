import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import ApperIcon from './ApperIcon';
import { fileService, uploadSessionService } from '../services';

const MainFeature = ({ onStatsUpdate }) => {
  const [files, setFiles] = useState([]);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadFiles();
    loadUploadHistory();
  }, []);

  const loadFiles = async () => {
    try {
      const result = await fileService.getAll();
      setFiles(result || []);
      updateStats(result || []);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const loadUploadHistory = async () => {
    try {
      const result = await uploadSessionService.getAll();
      setUploadHistory(result || []);
    } catch (error) {
      console.error('Failed to load upload history:', error);
    }
  };

  const updateStats = async (fileList = null) => {
    const currentFiles = fileList || files;
    const sessions = await uploadSessionService.getAll();
    
    const totalFiles = currentFiles.length;
    const totalSize = currentFiles.reduce((sum, file) => sum + file.size, 0);
    const today = new Date().toDateString();
    const sessionsToday = sessions?.filter(session => 
      new Date(session.startTime).toDateString() === today
    )?.length || 0;

    if (onStatsUpdate) {
      onStatsUpdate({ totalFiles, totalSize, sessionsToday });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    processFiles(selectedFiles);
  };

  const processFiles = (fileList) => {
    const validFiles = fileList.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`File "${file.name}" is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const newUploads = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      progress: 0,
      status: 'pending',
      speed: 0
    }));

    setUploadQueue(prev => [...prev, ...newUploads]);
    startUploads(newUploads);
  };

  const startUploads = async (uploads) => {
    const sessionId = Date.now().toString();
    const sessionStart = new Date().toISOString();

    for (const upload of uploads) {
      try {
        setUploadQueue(prev => 
          prev.map(u => u.id === upload.id ? { ...u, status: 'uploading' } : u)
        );

        await simulateUpload(upload);

        const newFile = {
          name: upload.file.name,
          size: upload.file.size,
          type: upload.file.type,
          uploadedAt: new Date().toISOString(),
          status: 'completed',
          progress: 100,
          url: `https://picsum.photos/200/300?random=${Date.now()}`,
          thumbnail: upload.file.type.startsWith('image/') 
            ? `https://picsum.photos/150/150?random=${Date.now()}` 
            : null
        };

        const savedFile = await fileService.create(newFile);
        setFiles(prev => [savedFile, ...prev]);

        setUploadQueue(prev => 
          prev.map(u => u.id === upload.id ? { ...u, status: 'completed', progress: 100 } : u)
        );

        toast.success(`"${upload.file.name}" uploaded successfully`);

        // Remove from queue after delay
        setTimeout(() => {
          setUploadQueue(prev => prev.filter(u => u.id !== upload.id));
        }, 2000);

      } catch (error) {
        setUploadQueue(prev => 
          prev.map(u => u.id === upload.id ? { ...u, status: 'error' } : u)
        );
        toast.error(`Failed to upload "${upload.file.name}"`);
      }
    }

    // Create upload session
    const sessionFiles = uploads.map(u => u.file.name);
    const totalSize = uploads.reduce((sum, u) => sum + u.file.size, 0);
    
    const session = {
      files: sessionFiles,
      totalSize,
      startTime: sessionStart,
      endTime: new Date().toISOString()
    };

    await uploadSessionService.create(session);
    loadUploadHistory();
    updateStats();
  };

  const simulateUpload = (upload) => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          resolve();
        }
        
        setUploadQueue(prev => 
          prev.map(u => u.id === upload.id ? { 
            ...u, 
            progress: Math.round(progress),
            speed: Math.random() * 5 + 1 // MB/s
          } : u)
        );
      }, 200);
    });
  };

  const cancelUpload = (uploadId) => {
    setUploadQueue(prev => prev.filter(u => u.id !== uploadId));
    toast.info('Upload cancelled');
  };

  const deleteFile = async (fileId) => {
    try {
      await fileService.delete(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setSelectedFile(null);
      toast.success('File deleted successfully');
      updateStats();
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return 'Image';
    if (type.startsWith('video/')) return 'Video';
    if (type.startsWith('audio/')) return 'Music';
    if (type.includes('pdf')) return 'FileText';
    if (type.includes('zip') || type.includes('rar')) return 'Archive';
    return 'File';
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
            transition-all duration-300 group
            ${isDragOver 
              ? 'border-primary bg-primary/5 dark:bg-primary/10' 
              : 'border-surface-300 dark:border-surface-600 hover:border-primary hover:bg-surface-50 dark:hover:bg-surface-800'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <motion.div
            animate={{ scale: isDragOver ? 1.1 : 1 }}
            className="space-y-4"
          >
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              isDragOver ? 'bg-primary' : 'bg-surface-100 dark:bg-surface-700 group-hover:bg-primary'
            }`}>
              <ApperIcon 
                name={isDragOver ? "Download" : "Upload"} 
                className={`w-8 h-8 transition-colors ${
                  isDragOver ? 'text-white' : 'text-surface-400 group-hover:text-white'
                }`} 
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-surface-900 dark:text-surface-50">
                {isDragOver ? 'Drop files here' : 'Upload your files'}
              </h3>
              <p className="text-surface-600 dark:text-surface-400">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-500">
                Maximum file size: 10MB
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Upload Queue */}
      <AnimatePresence>
        {uploadQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-card"
          >
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">
              Uploading Files
            </h3>
            <div className="space-y-3">
              {uploadQueue.map((upload) => (
                <div key={upload.id} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <ApperIcon name={getFileIcon(upload.file.type)} className="w-5 h-5 text-surface-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">
                        {upload.file.name}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-surface-500">
                        {upload.status === 'uploading' && (
                          <>
                            <span>{upload.progress}%</span>
                            <span>{upload.speed.toFixed(1)} MB/s</span>
                          </>
                        )}
                        <button
                          onClick={() => cancelUpload(upload.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <ApperIcon name="X" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${upload.progress}%` }}
                        className={`h-2 rounded-full transition-colors ${
                          upload.status === 'error' ? 'bg-red-500' : 'bg-primary'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50">
            Your Files ({files.length})
          </h2>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-2 text-sm text-surface-600 dark:text-surface-400 hover:text-primary"
          >
            <ApperIcon name="History" className="w-4 h-4" />
            <span>History</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <ApperIcon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Files Grid */}
        <div className={`${showHistory ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          {filteredFiles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="bg-surface-100 dark:bg-surface-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <ApperIcon name="FolderOpen" className="w-8 h-8 text-surface-400" />
              </div>
              <p className="text-surface-600 dark:text-surface-400">
                {searchTerm ? 'No files match your search' : 'No files uploaded yet'}
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedFile(file)}
                  className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-card hover:shadow-lg transition-all duration-300 cursor-pointer group"
                >
                  <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                    {file.thumbnail ? (
                      <img 
                        src={file.thumbnail} 
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ApperIcon 
                        name={getFileIcon(file.type)} 
                        className="w-12 h-12 text-surface-400"
                      />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-surface-900 dark:text-surface-50 truncate group-hover:text-primary transition-colors">
                      {file.name}
                    </h4>
                    <div className="flex items-center justify-between text-sm text-surface-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* History Sidebar */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-1"
            >
              <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-card sticky top-24">
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">
                  Upload History
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
                  {uploadHistory.map((session) => (
                    <div key={session.id} className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-surface-900 dark:text-surface-50">
                          {session.files?.length || 0} files
                        </span>
                        <span className="text-xs text-surface-500">
                          {new Date(session.startTime).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-surface-600 dark:text-surface-400">
                        {formatFileSize(session.totalSize)}
                      </p>
                    </div>
                  ))}
                  {uploadHistory.length === 0 && (
                    <p className="text-sm text-surface-500 text-center py-4">
                      No upload history yet
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* File Detail Modal */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedFile(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-surface-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto glassmorphism"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-surface-900 dark:text-surface-50">
                  File Details
                </h3>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700"
                >
                  <ApperIcon name="X" className="w-5 h-5 text-surface-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Preview */}
                <div className="aspect-video rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                  {selectedFile.thumbnail ? (
                    <img 
                      src={selectedFile.thumbnail} 
                      alt={selectedFile.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <ApperIcon 
                      name={getFileIcon(selectedFile.type)} 
                      className="w-24 h-24 text-surface-400"
                    />
                  )}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Name</label>
                    <p className="text-surface-900 dark:text-surface-50 break-all">{selectedFile.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Size</label>
                    <p className="text-surface-900 dark:text-surface-50">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Type</label>
                    <p className="text-surface-900 dark:text-surface-50">{selectedFile.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Uploaded</label>
                    <p className="text-surface-900 dark:text-surface-50">
                      {new Date(selectedFile.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-3 pt-4 border-t border-surface-200 dark:border-surface-700">
                  <a
                    href={selectedFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <ApperIcon name="Download" className="w-4 h-4" />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => deleteFile(selectedFile.id)}
                    className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <ApperIcon name="Trash2" className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainFeature;