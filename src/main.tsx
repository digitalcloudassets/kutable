import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/daypicker.mobile.css';
import './styles/field-icons.css';
import './styles/stepper.mobile.css';
import './styles/app-shell.css';
import './styles/stepper.mobile.css';
import { AuthProvider } from './context/AuthProvider';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);