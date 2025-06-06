import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MainFeature from '../components/MainFeature';
import ApperIcon from '../components/ApperIcon';
import { fileService, uploadSessionService } from '../services';

const Home = () => {
  const [isDark, setIsDark] = useState(false);
  const [uploadStats, setUploadStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    sessionsToday: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const files = await fileService.getAll();
        const sessions = await uploadSessionService.getAll();
        
        const totalFiles = files?.length || 0;
        const totalSize = files?.reduce((sum, file) => sum + (file.size || 0), 0) || 0;
        const today = new Date().toDateString();
        const sessionsToday = sessions?.filter(session => 
          new Date(session.startTime).toDateString() === today
        )?.length || 0;

        setUploadStats({ totalFiles, totalSize, sessionsToday });
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };

    loadStats();
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 dark:bg-surface-800/80 backdrop-blur-lg border-b border-surface-200 dark:border-surface-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-primary to-secondary p-2 rounded-xl">
                <ApperIcon name="Upload" className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">
                DropZone Pro
              </h1>
            </div>

            <div className="flex items-center space-x-6">
              {/* Stats */}
              <div className="hidden md:flex items-center space-x-4 text-sm text-surface-600 dark:text-surface-400">
                <div className="flex items-center space-x-1">
                  <ApperIcon name="Files" className="w-4 h-4" />
                  <span>{uploadStats.totalFiles} files</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ApperIcon name="HardDrive" className="w-4 h-4" />
                  <span>{formatFileSize(uploadStats.totalSize)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ApperIcon name="Calendar" className="w-4 h-4" />
                  <span>{uploadStats.sessionsToday} today</span>
                </div>
              </div>

              {/* Dark Mode Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-lg bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors"
              >
                <ApperIcon name={isDark ? "Sun" : "Moon"} className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <MainFeature onStatsUpdate={setUploadStats} />
        </motion.div>
      </main>
    </div>
  );
};

export default Home;