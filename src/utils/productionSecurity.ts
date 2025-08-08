// Production security utilities and configurations
import { getSecurityHeaders } from './security';

// Environment validation for production
export const validateProductionEnvironment = (): { isValid: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  
  // Check for development/placeholder values
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  
  if (!supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl.includes('localhost')) {
    warnings.push('Supabase URL appears to be invalid for production');
  }
  
  if (!supabaseKey || supabaseKey.includes('placeholder') || supabaseKey.length < 50) {
    warnings.push('Supabase anon key appears to be invalid for production');
  }
  
  if (!stripeKey || stripeKey.includes('placeholder') || !stripeKey.startsWith('pk_')) {
    warnings.push('Stripe publishable key appears to be invalid for production');
  }
  
  if (stripeKey && stripeKey.startsWith('pk_test_')) {
    warnings.push('Using Stripe test key - ensure this is intentional for production');
  }
  
  // Check for debug flags
  if (import.meta.env.DEV) {
    warnings.push('Application is running in development mode');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
};

// Content Security Policy for production
export const getProductionCSP = (): string => {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com https://*.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://maps.googleapis.com wss://*.supabase.co",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ');
};

// Security monitoring and logging
export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private logs: Array<{
    timestamp: string;
    type: 'auth_attempt' | 'payment_attempt' | 'form_submission' | 'file_upload' | 'admin_access';
    details: any;
    risk: 'low' | 'medium' | 'high';
  }> = [];

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  log(type: string, details: any, risk: 'low' | 'medium' | 'high' = 'low'): void {
    this.logs.push({
      timestamp: new Date().toISOString(),
      type: type as any,
      details: this.sanitizeLogData(details),
      risk
    });

    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    // Alert on high-risk events
    if (risk === 'high') {
      console.warn('HIGH RISK SECURITY EVENT:', type, details);
      this.reportToExternalServices(type, details);
    }
  }

  private reportToExternalServices(eventType: string, details: any): void {
    // Report security events to external monitoring
    try {
      // Sentry integration
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureMessage(`Security Event: ${eventType}`, 'warning', {
          tags: {
            component: 'security_monitor',
            event_type: eventType,
            risk_level: 'high'
          },
          extra: {
            details: this.sanitizeLogData(details),
            timestamp: new Date().toISOString()
          }
        });
      }

      // Send to backend monitoring endpoint (if configured)
      const monitoringEndpoint = import.meta.env.VITE_MONITORING_ENDPOINT;
      if (monitoringEndpoint && monitoringEndpoint !== 'your_monitoring_endpoint_here') {
        fetch(monitoringEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: eventType,
            risk_level: 'high',
            details: this.sanitizeLogData(details),
            timestamp: new Date().toISOString(),
            source: 'kutable_frontend'
          })
        }).catch(error => {
          console.warn('Failed to send security event to monitoring endpoint:', error);
        });
      }
    } catch (error) {
      console.error('Failed to report security event:', error);
    }
  }

  private sanitizeLogData(data: any): any {
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (key.toLowerCase().includes('password') || 
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('secret')) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'string') {
          sanitized[key] = value.slice(0, 100); // Limit log size
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    return data;
  }

  getRecentLogs(risk?: 'low' | 'medium' | 'high'): Array<any> {
    return this.logs
      .filter(log => !risk || log.risk === risk)
      .slice(-100); // Last 100 logs
  }

  getSecurityStats(): {
    totalEvents: number;
    highRiskEvents: number;
    recentActivity: number;
  } {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentLogs = this.logs.filter(log => new Date(log.timestamp) > oneHourAgo);
    
    return {
      totalEvents: this.logs.length,
      highRiskEvents: this.logs.filter(log => log.risk === 'high').length,
      recentActivity: recentLogs.length
    };
  }
}

export const securityMonitor = SecurityMonitor.getInstance();

// Production-ready error handler
export const handleSecureError = (error: any, context: string): string => {
  // Log the actual error for debugging
  console.error(`[${context}]`, error);
  
  // Log security event
  securityMonitor.log('error_occurred', {
    context,
    errorType: error?.constructor?.name,
    message: error?.message?.slice(0, 100)
  }, 'medium');
  
  // Return generic error message to user
  if (import.meta.env.DEV) {
    return error?.message || 'An error occurred';
  }
  
  // Production: Don't expose internal errors
  const genericMessages: { [key: string]: string } = {
    'auth': 'Authentication failed. Please try again.',
    'payment': 'Payment processing error. Please try again.',
    'database': 'Service temporarily unavailable. Please try again later.',
    'validation': 'Invalid input provided. Please check your information.',
    'file_upload': 'File upload failed. Please try again.',
    'network': 'Network error. Please check your connection.',
    'default': 'An unexpected error occurred. Please try again.'
  };
  
  return genericMessages[context] || genericMessages['default'];
};

// Input sanitization for different contexts
export const sanitizeForDisplay = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const sanitizeForUrl = (input: string): string => {
  return encodeURIComponent(input.slice(0, 100));
};

export const sanitizeForSql = (input: string): string => {
  return input
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .slice(0, 500);
};

// File upload security
export const validateFileUploadSecurity = (file: File): { isValid: boolean; error?: string } => {
  // Enhanced file type validation
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'File type not allowed. Only JPG, PNG, WebP, MP4, MOV, and AVI files are permitted.' };
  }
  
  // Size limits
  const maxImageSize = 10 * 1024 * 1024; // 10MB
  const maxVideoSize = 50 * 1024 * 1024; // 50MB
  
  if (file.type.startsWith('image/') && file.size > maxImageSize) {
    return { isValid: false, error: 'Image files must be smaller than 10MB' };
  }
  
  if (file.type.startsWith('video/') && file.size > maxVideoSize) {
    return { isValid: false, error: 'Video files must be smaller than 50MB' };
  }
  
  // Filename validation
  const filename = file.name.toLowerCase();
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif', '.vbs', '.js', '.jar', '.php', '.asp', '.jsp'];
  if (dangerousExtensions.some(ext => filename.endsWith(ext))) {
    return { isValid: false, error: 'File type potentially dangerous and not allowed' };
  }
  
  // Check for double extensions
  if ((filename.match(/\./g) || []).length > 1) {
    const parts = filename.split('.');
    if (parts.length > 2 || dangerousExtensions.some(ext => filename.includes(ext))) {
      return { isValid: false, error: 'Invalid filename format' };
    }
  }
  
  return { isValid: true };
};

// Production readiness checklist
export const getProductionReadinessReport = (): {
  isReady: boolean;
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
} => {
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Check environment
  const envCheck = validateProductionEnvironment();
  if (!envCheck.isValid) {
    criticalIssues.push(...envCheck.warnings);
  }
  
  // Check security headers
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    warnings.push('Content Security Policy not set via meta tag');
  }
  
  // Check HTTPS
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    criticalIssues.push('Not using HTTPS in production');
  }
  
  // Check for development tools
  if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    warnings.push('React DevTools detected - remove for production');
  }
  
  // Recommendations
  recommendations.push('Implement Web Application Firewall (WAF)');
  recommendations.push('Set up monitoring and alerting for suspicious activity');
  recommendations.push('Regular security audits and penetration testing');
  recommendations.push('Implement automated backup and disaster recovery');
  recommendations.push('Set up real-time security monitoring');
  
  return {
    isReady: criticalIssues.length === 0,
    criticalIssues,
    warnings,
    recommendations
  };
};