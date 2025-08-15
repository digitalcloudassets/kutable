// Production performance optimizations
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private preloadedImages = new Set<string>();
  private imageCache = new Map<string, string>();

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // Preload critical images
  preloadCriticalAssets() {
    // Only preload truly critical images that are used immediately
    const logoElement = document.querySelector('img[src*="Kutable"]');
    if (!logoElement && !this.preloadedImages.has('/Kutable%20Logo.png')) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = '/Kutable%20Logo.png';
      document.head.appendChild(link);
      this.preloadedImages.add('/Kutable%20Logo.png');
    }
  }

  // Lazy load images with intersection observer
  enableLazyLoading() {
    if (!('IntersectionObserver' in window)) return;

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    // Observe all lazy images
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  // Optimize font loading
  optimizeFontLoading() {
    // Fonts are loaded via Google Fonts stylesheet in index.html
    // No manual font loading needed - just ensure font-display: swap is set in CSS
    console.log('Fonts loading via Google Fonts stylesheet');
  }

  // Bundle optimization hints
  setupBundleOptimizations() {
    // Prefetch critical chunks
    const criticalChunks = [
      '/src/pages/HomePage.tsx',
      '/src/pages/BarberListPage.tsx',
      '/src/components/Auth/LoginForm.tsx'
    ];

    criticalChunks.forEach(chunk => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = chunk;
      document.head.appendChild(link);
    });
  }

  // Database query optimization
  optimizeDatabaseQueries() {
    // These would be implemented in the actual query calls
    const queryOptimizations = {
      // Use specific select clauses instead of *
      useSelectClauses: true,
      // Implement pagination for large datasets
      usePagination: true,
      // Cache frequently accessed data
      enableCaching: true,
      // Use database indexes for filtering
      useIndexes: true
    };

    return queryOptimizations;
  }

  // Memory management
  optimizeMemoryUsage() {
    // Clean up old data periodically
    setInterval(() => {
      // Clear old cached images
      if (this.imageCache.size > 100) {
        const entries = Array.from(this.imageCache.entries());
        entries.slice(0, 50).forEach(([key]) => {
          this.imageCache.delete(key);
        });
      }

      // Force garbage collection if available
      if ((window as any).gc) {
        (window as any).gc();
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Network optimization
  setupNetworkOptimizations() {
    // Enable keepalive for fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const enhancedInit = {
        ...init,
        keepalive: true,
        // Add timeout for better error handling
        signal: init?.signal || AbortSignal.timeout(30000)
      };
      return originalFetch(input, enhancedInit);
    };

    // Setup resource hints
    this.setupResourceHints();
  }

  private setupResourceHints() {
    // DNS prefetch for external domains
    const externalDomains = [
      'https://js.stripe.com',
      'https://maps.googleapis.com',
      'https://fonts.googleapis.com',
      'https://www.googletagmanager.com'
    ];

    externalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });
  }

  // Initialize all optimizations
  initializeAll() {
    this.preloadCriticalAssets();
    this.enableLazyLoading();
    this.optimizeFontLoading();
    this.setupBundleOptimizations();
    this.optimizeMemoryUsage();
    this.setupNetworkOptimizations();
  }
}

export const performanceOptimizer = PerformanceOptimizer.getInstance();

// Web Vitals tracking for production
export const initializeWebVitals = () => {
  if (import.meta.env.DEV) return;

  // Track Core Web Vitals
  const vitalsData = {
    FCP: 0, // First Contentful Paint
    LCP: 0, // Largest Contentful Paint
    FID: 0, // First Input Delay
    CLS: 0, // Cumulative Layout Shift
    TTFB: 0 // Time to First Byte
  };

  // Use Performance Observer if available
  if ('PerformanceObserver' in window) {
    try {
      // Largest Contentful Paint
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        vitalsData.LCP = lastEntry.startTime;
        reportVital('LCP', lastEntry.startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry) => {
          vitalsData.FID = entry.processingStart - entry.startTime;
          reportVital('FID', entry.processingStart - entry.startTime);
        });
      }).observe({ type: 'first-input', buffered: true });

      // Cumulative Layout Shift
      let clsValue = 0;
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            vitalsData.CLS = clsValue;
          }
        }
        reportVital('CLS', clsValue);
      }).observe({ type: 'layout-shift', buffered: true });

    } catch (error) {
      console.warn('Web Vitals tracking not available:', error);
    }
  }

  // Manual tracking for TTFB and FCP
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      vitalsData.TTFB = navigation.responseStart - navigation.requestStart;
      reportVital('TTFB', vitalsData.TTFB);

      // First Contentful Paint
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        vitalsData.FCP = fcpEntry.startTime;
        reportVital('FCP', fcpEntry.startTime);
      }
    }
  });

  function reportVital(name: string, value: number) {
    // Report to Google Analytics if configured
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', name, {
        event_category: 'Web Vitals',
        value: Math.round(value),
        non_interaction: true
      });
    }

    // Report to custom monitoring
    const monitoringEndpoint = import.meta.env.VITE_MONITORING_ENDPOINT;
    if (monitoringEndpoint && monitoringEndpoint !== 'your_monitoring_endpoint_here') {
      fetch(monitoringEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric_type: 'web_vital',
          name,
          value,
          timestamp: new Date().toISOString(),
          url: window.location.href
        })
      }).catch(console.warn);
    }
  }
};

// Production bundle analysis
export const analyzeBundleSize = () => {
  if (import.meta.env.DEV) return;

  const chunkSizes = new Map<string, number>();
  
  // Monitor script loading
  const originalAppend = Document.prototype.appendChild;
  Document.prototype.appendChild = function<T extends Node>(node: T): T {
    if (node instanceof HTMLScriptElement && node.src) {
      fetch(node.src, { method: 'HEAD' })
        .then(response => {
          const size = parseInt(response.headers.get('content-length') || '0');
          if (size > 0) {
            chunkSizes.set(node.src, size);
            console.log(`Chunk loaded: ${node.src} (${(size / 1024).toFixed(1)}KB)`);
          }
        })
        .catch(() => {}); // Ignore errors
    }
    return originalAppend.call(this, node);
  };

  // Report bundle analysis after load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const totalSize = Array.from(chunkSizes.values()).reduce((sum, size) => sum + size, 0);
      console.log(`Total bundle size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      
      // Report large bundles
      if (totalSize > 5 * 1024 * 1024) { // 5MB
        console.warn('Bundle size is large. Consider code splitting.');
        errorReporter.report(
          new Error(`Large bundle detected: ${(totalSize / 1024 / 1024).toFixed(2)}MB`),
          { component: 'BundleAnalyzer' },
          'medium'
        );
      }
    }, 2000);
  });
};