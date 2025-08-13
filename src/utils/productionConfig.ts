// Production configuration management
export interface ProductionConfig {
  environment: 'development' | 'staging' | 'production';
  apiUrl: string;
  cdnUrl?: string;
  monitoring: {
    sentry: boolean;
    logRocket: boolean;
    analytics: boolean;
  };
  features: {
    payments: boolean;
    messaging: boolean;
    notifications: boolean;
    fileUploads: boolean;
  };
  security: {
    csp: boolean;
    hsts: boolean;
    rateLimit: boolean;
  };
}

export const getProductionConfig = (): ProductionConfig => {
  const isDev = import.meta.env.DEV;
  const environment = isDev ? 'development' : 'production';
  
  return {
    environment,
    apiUrl: isDev ? 'http://localhost:3000' : 'https://kutable.com',
    cdnUrl: isDev ? undefined : 'https://cdn.kutable.com',
    monitoring: {
      sentry: !isDev && !!import.meta.env.VITE_SENTRY_DSN && 
              import.meta.env.VITE_SENTRY_DSN !== 'your_sentry_dsn_here',
      logRocket: !isDev && !!import.meta.env.VITE_LOGROCKET_APP_ID && 
                 import.meta.env.VITE_LOGROCKET_APP_ID !== 'your_logrocket_app_id_here',
      analytics: !!import.meta.env.VITE_GA_MEASUREMENT_ID &&
                 import.meta.env.VITE_GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX'
    },
    features: {
      payments: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY && 
                import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY !== 'your_stripe_publishable_key_here',
      messaging: !!import.meta.env.VITE_SUPABASE_URL && 
                 import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_url_here',
      notifications: true, // Always enabled for core functionality
      fileUploads: !!import.meta.env.VITE_SUPABASE_URL
    },
    security: {
      csp: !isDev,
      hsts: !isDev,
      rateLimit: true
    }
  };
};

// Environment validation for production deployment
export const validateProductionEnvironment = (): {
  isValid: boolean;
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
} => {
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Critical: Supabase Configuration
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl === 'your_supabase_url_here') {
    criticalIssues.push('Supabase URL not configured - Database functionality disabled');
  }
  
  if (!supabaseKey || supabaseKey.includes('placeholder') || supabaseKey === 'your_supabase_anon_key_here') {
    criticalIssues.push('Supabase anon key not configured - Authentication disabled');
  }

  // Critical: Payment Configuration
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!stripeKey || stripeKey.includes('placeholder') || stripeKey === 'your_stripe_publishable_key_here') {
    criticalIssues.push('Stripe publishable key not configured - Payment processing disabled');
  } else if (stripeKey.startsWith('pk_test_')) {
    warnings.push('Using Stripe test keys - Ensure this is intentional for production');
  }

  // Critical: Admin Security
  const adminUsername = import.meta.env.VITE_ADMIN_USERNAME;
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
  
  if (!adminUsername || adminUsername === 'admin') {
    criticalIssues.push('Admin username is default or missing - Change from "admin"');
  }
  
  if (!adminPassword || adminPassword === 'SecureAdminPass2025!@#' || adminPassword.length < 16) {
    criticalIssues.push('Admin password is default or weak - Use strong unique password');
  }

  // Warnings: Monitoring
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (!sentryDsn || sentryDsn === 'your_sentry_dsn_here') {
    warnings.push('Sentry error tracking not configured - Production error monitoring disabled');
  }

  const logRocketId = import.meta.env.VITE_LOGROCKET_APP_ID;
  if (!logRocketId || logRocketId === 'your_logrocket_app_id_here') {
    warnings.push('LogRocket session recording not configured - User session insights disabled');
  }

  // Warnings: Communication Services
  if (import.meta.env.DEV) {
    warnings.push('Application running in development mode');
  }

  // Recommendations
  recommendations.push('Set up Web Application Firewall (WAF) at CDN level');
  recommendations.push('Configure automated database backups');
  recommendations.push('Set up uptime monitoring (Pingdom, UptimeRobot)');
  recommendations.push('Configure log retention policies');
  recommendations.push('Set up automated security scans');
  recommendations.push('Implement rate limiting at edge/proxy level');
  recommendations.push('Configure CDN for static assets');
  recommendations.push('Set up SSL certificate monitoring');

  return {
    isValid: criticalIssues.length === 0,
    criticalIssues,
    warnings,
    recommendations
  };
};

// Performance optimizations for production
export const initializeProductionOptimizations = () => {
  if (import.meta.env.DEV) return;

  // Preload critical resources
  // Only preload the logo which is used immediately in header
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = '/Kutable%20Logo.png';
  link.as = 'image';
  document.head.appendChild(link);

  // Enable service worker for caching (if available)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered:', registration.scope))
        .catch(error => console.log('SW registration failed:', error));
    });
  }

  // Optimize images loading
  const images = document.querySelectorAll('img[data-src]');
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src || '';
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }
};

// Security headers for production
export const PRODUCTION_SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=(self)',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com https://*.googletagmanager.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://maps.googleapis.com wss://*.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};