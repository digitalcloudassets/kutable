import React from 'react';
import { Sparkles } from 'lucide-react';

const FallbackDashboard = React.memo(() => {
  return (
    <div className="card-premium p-12 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-accent-500/5"></div>
      <div className="relative z-10">
        <div className="bg-gradient-to-br from-primary-500 to-accent-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium animate-float">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">Welcome to Kutable!</h2>
        <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
          We're setting up your personalized dashboard. This will just take a moment...
        </p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-100 border-t-primary-500"></div>
        </div>
      </div>
    </div>
  );
});

FallbackDashboard.displayName = 'FallbackDashboard';

export default FallbackDashboard;