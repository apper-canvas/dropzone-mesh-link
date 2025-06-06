import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ApperIcon from '../components/ApperIcon';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="flex justify-center">
            <div className="bg-gradient-to-r from-primary to-secondary p-6 rounded-full">
              <ApperIcon name="FileX" className="w-16 h-16 text-white" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-surface-900 dark:text-surface-50">404</h1>
            <h2 className="text-2xl font-semibold text-surface-700 dark:text-surface-300">Page Not Found</h2>
            <p className="text-surface-600 dark:text-surface-400 max-w-md mx-auto">
              The file you're looking for doesn't exist in this directory.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <ApperIcon name="Home" className="w-5 h-5" />
            <span>Back to Upload</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;