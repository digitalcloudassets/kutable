import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface AdminGuardBannerProps {
  message: string;
}

const AdminGuardBanner: React.FC<AdminGuardBannerProps> = ({ message }) => {
  const [dismissed, setDismissed] = React.useState(false);

  // Don't show banner for certain expected states
  if (dismissed || 
      message.includes('fallback mode') || 
      message.includes('WebContainer') ||
      message.includes('Development environment detected')) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Admin Access Notice
            </p>
            <p className="text-xs text-yellow-700">
              {message}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-400 hover:text-yellow-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AdminGuardBanner;