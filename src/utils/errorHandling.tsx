import React from 'react';
import { NotificationService, BookingNotificationData, NotificationEvent } from '../services/NotificationService';
import { supabase } from '../lib/supabase';

// Production-ready error handling and logging

export interface ErrorReport {
  id: string;
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    component?: string;
    action?: string;
    userId?: string;
    url: string;
    userAgent: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorReporter {
  private static instance: ErrorReporter;
  private reports: ErrorReport[] = [];
  private reportedErrors = new Set<string>();

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  report(
    error: Error | string,
    context: Partial<ErrorReport['context']> = {},
    severity: ErrorReport['severity'] = 'medium'
  ): void {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const errorKey = `${errorObj.name}-${errorObj.message}`;
    
    // Avoid duplicate reports within 5 minutes
    if (this.reportedErrors.has(errorKey)) {
      return;
    }
    
    this.reportedErrors.add(errorKey);
    setTimeout(() => this.reportedErrors.delete(errorKey), 5 * 60 * 1000);

    const report: ErrorReport = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      error: {
        name: errorObj.name,
        message: this.sanitizeErrorMessage(errorObj.message),
        stack: import.meta.env.DEV ? errorObj.stack : undefined
      },
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent.slice(0, 200),
        ...context
      },
      severity
    };

    this.reports.push(report);
    
    // Keep only last 100 reports
    if (this.reports.length > 100) {
      this.reports = this.reports.slice(-100);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error reported:', report);
    }

    // In production, you would send this to a logging service
    if (!import.meta.env.DEV && severity === 'critical') {
      this.sendToLoggingService(report);
    }
  }

  private sanitizeErrorMessage(message: string): string {
    // Remove sensitive information from error messages
    return message
      .replace(/password/gi, '[REDACTED]')
      .replace(/token/gi, '[REDACTED]')
      .replace(/key/gi, '[REDACTED]')
      .replace(/secret/gi, '[REDACTED]')
      .replace(/\b\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\b/g, '[CARD_NUMBER_REDACTED]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]')
      .slice(0, 500);
  }

  private async sendToLoggingService(report: ErrorReport): Promise<void> {
    try {
      // In production, send to your logging service (e.g., Sentry, LogRocket, etc.)
      // For now, we'll just log it
      console.error('CRITICAL ERROR:', report);
      
      // You could send to Supabase edge function for logging
      // await fetch('/api/log-error', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(report)
      // });
    } catch (error) {
      console.error('Failed to send error report:', error);
    }
  }

  getReports(severity?: ErrorReport['severity']): ErrorReport[] {
    return this.reports.filter(report => !severity || report.severity === severity);
  }

  clearReports(): void {
    this.reports = [];
    this.reportedErrors.clear();
  }
}

export const errorReporter = ErrorReporter.getInstance();

// Global error handler
export const setupGlobalErrorHandling = (): void => {
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    errorReporter.report(
      event.error || new Error(event.message),
      {
        component: 'Global',
        action: 'unhandled_error'
      },
      'high'
    );
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorReporter.report(
      new Error(event.reason?.message || 'Unhandled promise rejection'),
      {
        component: 'Global',
        action: 'unhandled_promise_rejection'
      },
      'high'
    );
  });
};

// Error boundary hook
export const withErrorBoundary = (
  component: React.ComponentType<any>,
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
) => {
  return class ErrorBoundary extends React.Component<any, { hasError: boolean; error?: Error }> {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      errorReporter.report(
        error,
        {
          component: component.name,
          action: 'render_error',
          componentStack: errorInfo.componentStack?.slice(0, 1000)
        },
        'high'
      );
    }

    render() {
      if (this.state.hasError) {
        if (fallback) {
          const Fallback = fallback;
          return <Fallback 
            error={this.state.error || new Error('Unknown error')} 
            reset={() => this.setState({ hasError: false, error: undefined })} 
          />;
        }
        
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
              <p className="text-gray-600 mb-6">We've been notified and are working to fix this.</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        );
      }

      const Component = component;
      return <Component {...this.props} />;
    }
  };
};

// Secure fetch wrapper
export const secureFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const secureOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...options.headers,
    },
    credentials: 'same-origin',
  };

  try {
    const response = await fetch(url, secureOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    errorReporter.report(
      error as Error,
      {
        action: 'api_request',
        url: url.slice(0, 100) // Limit URL length in logs
      },
      'medium'
    );
    throw error;
  }
};