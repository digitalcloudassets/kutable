// Enhanced production monitoring and alerting
import { errorReporter } from './errorHandling';

export interface AlertingConfig {
  email: string[];
  slack?: string;
  webhook?: string;
  thresholds: {
    errorRate: number;
    responseTime: number;
    uptime: number;
  };
}

export interface ProductionMetrics {
  uptime: number;
  errorRate: number;
  averageResponseTime: number;
  activeUsers: number;
  bookingsToday: number;
  revenueToday: number;
  lastUpdated: Date;
}

class ProductionMonitor {
  private static instance: ProductionMonitor;
  private metrics: ProductionMetrics;
  private startTime: number;
  private errorCount: number = 0;
  private requestCount: number = 0;
  private responseTimes: number[] = [];

  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      uptime: 0,
      errorRate: 0,
      averageResponseTime: 0,
      activeUsers: 0,
      bookingsToday: 0,
      revenueToday: 0,
      lastUpdated: new Date()
    };

    if (typeof window !== 'undefined') {
      this.initializeMonitoring();
    }
  }

  static getInstance(): ProductionMonitor {
    if (!ProductionMonitor.instance) {
      ProductionMonitor.instance = new ProductionMonitor();
    }
    return ProductionMonitor.instance;
  }

  private initializeMonitoring() {
    // Track page visibility for active users
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.trackActiveUser();
        }
      });
    }

    // Monitor performance
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const nav = entry as PerformanceNavigationTiming;
              const responseTime = nav.responseEnd - nav.requestStart;
              this.trackResponseTime(responseTime);
            }
          }
        });
        observer.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('Performance monitoring not available:', error);
      }
    }

    // Update metrics periodically
    setInterval(() => this.updateMetrics(), 30000); // Every 30 seconds
  }

  private trackActiveUser() {
    // Simple active user tracking
    this.metrics.activeUsers = Math.max(1, this.metrics.activeUsers);
  }

  private trackResponseTime(time: number) {
    this.responseTimes.push(time);
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-50); // Keep last 50
    }
    this.requestCount++;
  }

  public trackError(error: Error) {
    this.errorCount++;
    errorReporter.report(error, { component: 'ProductionMonitor' }, 'medium');
  }

  public trackBooking(amount: number) {
    this.metrics.bookingsToday++;
    this.metrics.revenueToday += amount;
  }

  private updateMetrics() {
    const now = Date.now();
    const uptimeMs = now - this.startTime;
    
    this.metrics = {
      uptime: uptimeMs / 1000 / 60 / 60, // Hours
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      averageResponseTime: this.responseTimes.length > 0 
        ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length 
        : 0,
      activeUsers: this.metrics.activeUsers,
      bookingsToday: this.metrics.bookingsToday,
      revenueToday: this.metrics.revenueToday,
      lastUpdated: new Date()
    };

    // Check for critical thresholds
    this.checkAlerts();
  }

  private checkAlerts() {
    const thresholds = {
      errorRate: 5, // 5%
      responseTime: 3000, // 3 seconds
      uptime: 99 // 99%
    };

    if (this.metrics.errorRate > thresholds.errorRate) {
      this.sendAlert('high_error_rate', `Error rate: ${this.metrics.errorRate.toFixed(2)}%`);
    }

    if (this.metrics.averageResponseTime > thresholds.responseTime) {
      this.sendAlert('slow_response', `Avg response time: ${this.metrics.averageResponseTime.toFixed(0)}ms`);
    }
  }

  private sendAlert(type: string, message: string) {
    // In production, send to monitoring service
    console.error(`PRODUCTION ALERT [${type}]: ${message}`);
    
    // Send to external monitoring service
    const monitoringEndpoint = import.meta.env.VITE_MONITORING_ENDPOINT;
    if (monitoringEndpoint && monitoringEndpoint !== 'your_monitoring_endpoint_here') {
      fetch(monitoringEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_type: type,
          message,
          metrics: this.metrics,
          timestamp: new Date().toISOString(),
          environment: 'production'
        })
      }).catch(error => console.error('Failed to send alert:', error));
    }

    // Report to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureMessage(`Production Alert: ${message}`, 'warning', {
        tags: { alert_type: type },
        extra: this.metrics
      });
    }
  }

  public getMetrics(): ProductionMetrics {
    return { ...this.metrics };
  }

  public getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{ name: string; status: 'pass' | 'fail' | 'warn'; message: string }>;
  } {
    const checks = [
      {
        name: 'Error Rate',
        status: this.metrics.errorRate < 1 ? 'pass' : this.metrics.errorRate < 5 ? 'warn' : 'fail',
        message: `${this.metrics.errorRate.toFixed(2)}%`
      },
      {
        name: 'Response Time',
        status: this.metrics.averageResponseTime < 1000 ? 'pass' : 
                this.metrics.averageResponseTime < 3000 ? 'warn' : 'fail',
        message: `${this.metrics.averageResponseTime.toFixed(0)}ms`
      },
      {
        name: 'Uptime',
        status: this.metrics.uptime > 0.99 ? 'pass' : this.metrics.uptime > 0.95 ? 'warn' : 'fail',
        message: `${(this.metrics.uptime * 100).toFixed(2)}%`
      }
    ];

    const hasFailures = checks.some(check => check.status === 'fail');
    const hasWarnings = checks.some(check => check.status === 'warn');
    
    const status = hasFailures ? 'critical' : hasWarnings ? 'warning' : 'healthy';

    return { status, checks };
  }
}

export const productionMonitor = ProductionMonitor.getInstance();

// Initialize monitoring on app start
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    productionMonitor; // Initialize singleton
  });
}

// Health check endpoint simulation
export const healthCheck = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: Record<string, boolean>;
}> => {
  const config = getProductionConfig();
  
  const services = {
    database: !!import.meta.env.VITE_SUPABASE_URL,
    payments: config.features.payments,
    monitoring: config.monitoring.sentry || config.monitoring.logRocket,
    analytics: config.monitoring.analytics
  };

  const allServicesHealthy = Object.values(services).every(Boolean);
  
  return {
    status: allServicesHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.environment,
    services
  };
};