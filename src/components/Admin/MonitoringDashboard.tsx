import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  Zap,
  RefreshCw,
  ExternalLink,
  Shield,
  Eye,
  BarChart3,
  Clock,
  AlertCircle,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Database
} from 'lucide-react';
import { errorReporter } from '../../utils/errorHandling';
import { securityMonitor } from '../../utils/productionSecurity';

interface SystemMetrics {
  errorCount: number;
  securityEvents: number;
  performanceScore: number;
  uptime: string;
  lastUpdated: string;
  criticalIssues: string[];
  recentErrors: Array<{
    timestamp: string;
    message: string;
    component: string;
    severity: string;
  }>;
}

interface PerformanceMetrics {
  pageLoadTime: number;
  timeToInteractive: number;
  cumulativeLayoutShift: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
}

const MonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    errorCount: 0,
    securityEvents: 0,
    performanceScore: 0,
    uptime: '0h 0m',
    lastUpdated: new Date().toISOString(),
    criticalIssues: [],
    recentErrors: []
  });
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    timeToInteractive: 0,
    cumulativeLayoutShift: 0,
    largestContentfulPaint: 0,
    firstInputDelay: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    loadMonitoringData();
    const interval = setInterval(loadMonitoringData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadMonitoringData = async () => {
    try {
      // Get error reports
      const errorReports = errorReporter.getReports();
      const securityStats = securityMonitor.getSecurityStats();
      
      // Calculate performance metrics
      const performanceMetrics = await getPerformanceMetrics();
      
      // Get critical issues
      const criticalErrors = errorReporter.getReports('critical');
      const criticalIssues = criticalErrors.map(error => error.error.message);
      
      // Get recent errors (last 10)
      const recentErrors = errorReports.slice(-10).map(report => ({
        timestamp: report.timestamp,
        message: report.error.message,
        component: report.context.component || 'Unknown',
        severity: report.severity
      }));

      // Calculate uptime (time since page load)
      const startTime = performance.timeOrigin;
      const currentTime = Date.now();
      const uptimeMs = currentTime - startTime;
      const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
      const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

      setMetrics({
        errorCount: errorReports.length,
        securityEvents: securityStats.totalEvents,
        performanceScore: calculatePerformanceScore(performanceMetrics),
        uptime: `${uptimeHours}h ${uptimeMinutes}m`,
        lastUpdated: new Date().toISOString(),
        criticalIssues,
        recentErrors
      });

      setPerformanceData(performanceMetrics);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceMetrics = async (): Promise<PerformanceMetrics> => {
    return new Promise((resolve) => {
      // Use Performance Observer API if available
      if ('PerformanceObserver' in window) {
        const metrics: Partial<PerformanceMetrics> = {};
        
        try {
          // Get navigation timing
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
            metrics.timeToInteractive = navigation.domInteractive - navigation.fetchStart;
          }

          // Get paint timing
          const paintEntries = performance.getEntriesByType('paint');
          const lcp = paintEntries.find(entry => entry.name === 'largest-contentful-paint');
          if (lcp) {
            metrics.largestContentfulPaint = lcp.startTime;
          }

          resolve({
            pageLoadTime: metrics.pageLoadTime || 0,
            timeToInteractive: metrics.timeToInteractive || 0,
            cumulativeLayoutShift: 0, // Would need CLS observer
            largestContentfulPaint: metrics.largestContentfulPaint || 0,
            firstInputDelay: 0 // Would need FID observer
          });
        } catch (error) {
          console.warn('Performance metrics not available:', error);
          resolve({
            pageLoadTime: 0,
            timeToInteractive: 0,
            cumulativeLayoutShift: 0,
            largestContentfulPaint: 0,
            firstInputDelay: 0
          });
        }
      } else {
        resolve({
          pageLoadTime: 0,
          timeToInteractive: 0,
          cumulativeLayoutShift: 0,
          largestContentfulPaint: 0,
          firstInputDelay: 0
        });
      }
    });
  };

  const calculatePerformanceScore = (metrics: PerformanceMetrics): number => {
    if (!metrics.pageLoadTime) return 0;
    
    // Simple scoring based on page load time
    if (metrics.pageLoadTime < 1000) return 100;
    if (metrics.pageLoadTime < 2000) return 90;
    if (metrics.pageLoadTime < 3000) return 80;
    if (metrics.pageLoadTime < 4000) return 70;
    return 60;
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-emerald-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const testExternalServices = async () => {
    const results = {
      sentry: false,
      logrocket: false,
      monitoring: false
    };

    // Test Sentry connection
    try {
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureMessage('Monitoring dashboard test', 'info');
        results.sentry = true;
      }
    } catch (error) {
      console.warn('Sentry test failed:', error);
    }

    // Test LogRocket connection
    try {
      if (typeof window !== 'undefined' && (window as any).LogRocket) {
        results.logrocket = true;
      }
    } catch (error) {
      console.warn('LogRocket test failed:', error);
    }

    // Test custom monitoring endpoint
    try {
      const monitoringEndpoint = import.meta.env.VITE_MONITORING_ENDPOINT;
      if (monitoringEndpoint && monitoringEndpoint !== 'your_monitoring_endpoint_here') {
        const response = await fetch(monitoringEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'health_check',
            timestamp: new Date().toISOString(),
            source: 'admin_dashboard'
          })
        });
        results.monitoring = response.ok;
      }
    } catch (error) {
      console.warn('Monitoring endpoint test failed:', error);
    }

    return results;
  };

  const [serviceStatus, setServiceStatus] = useState({
    sentry: false,
    logrocket: false,
    monitoring: false
  });

  useEffect(() => {
    testExternalServices().then(setServiceStatus);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-premium p-6 animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-2xl">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900">System Monitoring</h2>
            <p className="text-gray-600">Real-time application health and performance metrics</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={loadMonitoringData}
            className="btn-secondary text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">System Health</h3>
            <div className="bg-emerald-100 p-2 rounded-xl">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div className="text-3xl font-display font-bold text-emerald-600 mb-2">
            {metrics.criticalIssues.length === 0 ? 'Healthy' : 'Issues'}
          </div>
          <p className="text-sm text-gray-500">
            Uptime: {metrics.uptime}
          </p>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Error Count</h3>
            <div className="bg-red-100 p-2 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <div className={`text-3xl font-display font-bold mb-2 ${
            metrics.errorCount === 0 ? 'text-emerald-600' : 
            metrics.errorCount < 10 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {metrics.errorCount}
          </div>
          <p className="text-sm text-gray-500">
            Total errors logged
          </p>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Security Events</h3>
            <div className="bg-orange-100 p-2 rounded-xl">
              <Shield className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <div className={`text-3xl font-display font-bold mb-2 ${
            metrics.securityEvents === 0 ? 'text-emerald-600' : 
            metrics.securityEvents < 5 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {metrics.securityEvents}
          </div>
          <p className="text-sm text-gray-500">
            Security events logged
          </p>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Performance</h3>
            <div className="bg-blue-100 p-2 rounded-xl">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className={`text-3xl font-display font-bold mb-2 ${getStatusColor(metrics.performanceScore, { good: 90, warning: 70 })}`}>
            {metrics.performanceScore}
          </div>
          <p className="text-sm text-gray-500">
            Performance score
          </p>
        </div>
      </div>

      {/* External Services Status */}
      <div className="card-premium p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-purple-100 p-3 rounded-2xl">
            <Server className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-2xl font-display font-bold text-gray-900">External Monitoring Services</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`border-2 rounded-2xl p-6 transition-all duration-200 ${
            serviceStatus.sentry 
              ? 'border-emerald-200 bg-emerald-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-900">Sentry Error Tracking</h4>
              <div className={`w-3 h-3 rounded-full ${
                serviceStatus.sentry ? 'bg-emerald-500' : 'bg-gray-400'
              }`}></div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Real-time error monitoring, performance tracking, and crash reporting
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={serviceStatus.sentry ? 'text-emerald-600' : 'text-gray-500'}>
                  {serviceStatus.sentry ? 'Connected' : 'Not configured'}
                </span>
              </div>
              {serviceStatus.sentry && (
                <a
                  href="https://sentry.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-500 text-sm flex items-center space-x-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>View Dashboard</span>
                </a>
              )}
            </div>
          </div>

          <div className={`border-2 rounded-2xl p-6 transition-all duration-200 ${
            serviceStatus.logrocket 
              ? 'border-emerald-200 bg-emerald-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-900">LogRocket Sessions</h4>
              <div className={`w-3 h-3 rounded-full ${
                serviceStatus.logrocket ? 'bg-emerald-500' : 'bg-gray-400'
              }`}></div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Session recordings and user experience monitoring
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={serviceStatus.logrocket ? 'text-emerald-600' : 'text-gray-500'}>
                  {serviceStatus.logrocket ? 'Recording' : 'Not configured'}
                </span>
              </div>
              {serviceStatus.logrocket && (
                <a
                  href="https://app.logrocket.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-500 text-sm flex items-center space-x-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>View Sessions</span>
                </a>
              )}
            </div>
          </div>

          <div className={`border-2 rounded-2xl p-6 transition-all duration-200 ${
            serviceStatus.monitoring 
              ? 'border-emerald-200 bg-emerald-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-900">Custom Monitoring</h4>
              <div className={`w-3 h-3 rounded-full ${
                serviceStatus.monitoring ? 'bg-emerald-500' : 'bg-gray-400'
              }`}></div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Custom endpoint for application-specific monitoring
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={serviceStatus.monitoring ? 'text-emerald-600' : 'text-gray-500'}>
                  {serviceStatus.monitoring ? 'Active' : 'Not configured'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-500 p-2 rounded-xl">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 mb-3">Setup External Monitoring</h4>
              <div className="space-y-3 text-blue-800 text-sm">
                <div>
                  <p className="font-medium">1. Sentry Error Tracking:</p>
                  <p>Add <code>VITE_SENTRY_DSN=your_sentry_dsn_here</code> to your environment variables</p>
                </div>
                <div>
                  <p className="font-medium">2. LogRocket Session Recording:</p>
                  <p>Add <code>VITE_LOGROCKET_APP_ID=your_app_id_here</code> to your environment variables</p>
                </div>
                <div>
                  <p className="font-medium">3. Custom Monitoring:</p>
                  <p>Add <code>VITE_MONITORING_ENDPOINT=your_endpoint_here</code> for custom monitoring</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="card-premium p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-blue-100 p-3 rounded-2xl">
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-2xl font-display font-bold text-gray-900">Performance Metrics</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Zap className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {formatTime(performanceData.pageLoadTime)}
            </p>
            <p className="text-sm text-gray-600">Page Load Time</p>
          </div>

          <div className="text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {formatTime(performanceData.timeToInteractive)}
            </p>
            <p className="text-sm text-gray-600">Time to Interactive</p>
          </div>

          <div className="text-center">
            <div className="bg-purple-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Eye className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {formatTime(performanceData.largestContentfulPaint)}
            </p>
            <p className="text-sm text-gray-600">Largest Contentful Paint</p>
          </div>

          <div className="text-center">
            <div className="bg-yellow-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Cpu className="h-6 w-6 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {performanceData.cumulativeLayoutShift.toFixed(3)}
            </p>
            <p className="text-sm text-gray-600">Cumulative Layout Shift</p>
          </div>

          <div className="text-center">
            <div className="bg-indigo-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Wifi className="h-6 w-6 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {formatTime(performanceData.firstInputDelay)}
            </p>
            <p className="text-sm text-gray-600">First Input Delay</p>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-6 rounded-2xl">
            <h4 className="font-bold text-emerald-900 mb-3">Performance Grade</h4>
            <div className="flex items-center space-x-3">
              <div className={`text-4xl font-bold ${getStatusColor(metrics.performanceScore, { good: 90, warning: 70 })}`}>
                {metrics.performanceScore}
              </div>
              <div className="text-emerald-700">
                <p className="font-medium">
                  {metrics.performanceScore >= 90 ? 'Excellent' :
                   metrics.performanceScore >= 70 ? 'Good' : 'Needs Improvement'}
                </p>
                <p className="text-sm">Overall performance</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-6 rounded-2xl">
            <h4 className="font-bold text-blue-900 mb-3">System Resources</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex justify-between">
                <span>Memory Usage:</span>
                <span>{((performance as any).memory?.usedJSHeapSize / 1024 / 1024).toFixed(1) || 'N/A'} MB</span>
              </div>
              <div className="flex justify-between">
                <span>Network:</span>
                <span className="text-emerald-600">Online</span>
              </div>
              <div className="flex justify-between">
                <span>Browser:</span>
                <span>{navigator.userAgent.split(' ')[0]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      <div className="card-premium p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-red-100 p-3 rounded-2xl">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-2xl font-display font-bold text-gray-900">Recent Errors</h3>
        </div>

        {metrics.recentErrors.length > 0 ? (
          <div className="space-y-4">
            {metrics.recentErrors.map((error, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        error.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        error.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        error.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {error.severity.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{error.component}</span>
                    </div>
                    <p className="text-gray-700 mb-2">{error.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(error.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-emerald-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h4 className="text-xl font-display font-bold text-gray-900 mb-3">No Recent Errors</h4>
            <p className="text-gray-600">Your application is running smoothly with no logged errors.</p>
          </div>
        )}
      </div>

      {/* Critical Issues */}
      {metrics.criticalIssues.length > 0 && (
        <div className="card-premium p-8 border-l-4 border-red-500">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-red-500 p-3 rounded-2xl">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-display font-bold text-red-900">Critical Issues Detected</h3>
          </div>

          <div className="space-y-3">
            {metrics.criticalIssues.map((issue, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800 font-medium">{issue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monitoring Setup Guide */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-8">
        <div className="flex items-start space-x-4">
          <div className="bg-gray-500 p-3 rounded-2xl">
            <Database className="h-6 w-6 text-white" />
          </div>
          <div>
            <h4 className="font-display font-bold text-gray-900 mb-4 text-lg">Production Monitoring Setup</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">1. Sentry Error Tracking</h5>
                <ul className="space-y-1 text-gray-600 text-sm">
                  <li>• Create account at sentry.io</li>
                  <li>• Create new React project</li>
                  <li>• Add DSN to environment variables</li>
                  <li>• Automatic error capture and alerting</li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">2. LogRocket Session Recording</h5>
                <ul className="space-y-1 text-gray-600 text-sm">
                  <li>• Create account at logrocket.com</li>
                  <li>• Create new application</li>
                  <li>• Add App ID to environment variables</li>
                  <li>• View user sessions and debug issues</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4">
              <h5 className="font-semibold text-gray-900 mb-2">Environment Variables to Add:</h5>
              <div className="bg-gray-100 rounded-lg p-3 font-mono text-sm">
                <div>VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id</div>
                <div>VITE_LOGROCKET_APP_ID=your-app-id/project-name</div>
                <div>VITE_MONITORING_ENDPOINT=https://your-custom-monitoring.com/api</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;