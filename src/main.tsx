import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { performanceOptimizer, initializeWebVitals } from './utils/performanceOptimizations';
import { initializeProductionOptimizations } from './utils/productionConfig';

// Initialize production optimizations
if (!import.meta.env.DEV) {
  initializeProductionOptimizations();
  performanceOptimizer.initializeAll();
  initializeWebVitals();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
