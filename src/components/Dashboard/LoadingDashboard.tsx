import React from 'react';
import { Sparkles } from 'lucide-react';

const LoadingDashboard = React.memo(() => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
        </div>
        <div className="space-y-2">
          <p className="text-gray-700 font-medium">Loading your dashboard...</p>
          <p className="text-sm text-gray-500">Setting up your personalized experience</p>
        </div>
      </div>
    </div>
  );
});

LoadingDashboard.displayName = 'LoadingDashboard';

export default LoadingDashboard;