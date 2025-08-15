import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthProvider';
import { performanceOptimizer, initializeWebVitals } from './utils/performanceOptimizations';
import { initializeProductionOptimizations } from './utils/productionConfig';
import { logger } from './utils/logger';

// Initialize production optimizations
if (!import.meta.env.DEV) {
  initializeProductionOptimizations();
  performanceOptimizer.initializeAll();
  initializeWebVitals();
}

// Global error taps: quiet in prod for debug/info, but always capture errors/warns.
window.addEventListener('error', (e) => {
  logger.error('Uncaught error', e.error ?? e.message ?? e);
});
window.addEventListener('unhandledrejection', (e) => {
  logger.error('Unhandled promise rejection', e.reason ?? e);
});

// Optional small gate so routes don't render until auth ready
function Gate() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">Loading Kutable...</p>
            <p className="text-sm text-gray-500">Preparing your experience</p>
          </div>
        </div>
      </div>
    );
  }
  return <App />;
}

// Optional small gate so routes don't render until auth ready
function Gate() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">Loading Kutable...</p>
            <p className="text-sm text-gray-500">Preparing your experience</p>
          </div>
        </div>
      </div>
    );
  }
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Gate />
    </AuthProvider>
  </StrictMode>
);