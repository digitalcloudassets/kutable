import React from 'react';
import { Database, AlertCircle, ExternalLink } from 'lucide-react';

interface SupabaseConnectionBannerProps {
  isConnected: boolean;
}

const SupabaseConnectionBanner: React.FC<SupabaseConnectionBannerProps> = ({ isConnected }) => {
  if (isConnected) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-1">
            Supabase Not Connected
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            To enable full functionality including user authentication, data storage, and payments, 
            you need to connect your Supabase project.
          </p>
          <div className="flex items-center space-x-3">
            <button className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors">
              <Database className="h-4 w-4 mr-1" />
              Connect to Supabase
            </button>
            <a
              href="https://supabase.com/docs/guides/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs text-yellow-700 hover:text-yellow-800 transition-colors"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Setup Guide
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseConnectionBanner;