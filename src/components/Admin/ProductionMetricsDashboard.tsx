import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  Zap,
  Shield,
  Server,
  RefreshCw
} from 'lucide-react';
import { productionMonitor, ProductionMetrics } from '../../utils/productionMonitoring';

const ProductionMetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ProductionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadMetrics();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadMetrics, 30000); // Update every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadMetrics = () => {
    const currentMetrics = productionMonitor.getMetrics();
    setMetrics(currentMetrics);
    setLoading(false);
  };

  const getHealthStatus = (errorRate: number, responseTime: number) => {
    if (errorRate > 5 || responseTime > 3000) return 'critical';
    if (errorRate > 1 || responseTime > 1000) return 'warning';
    return 'healthy';
  };

  const formatUptime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading || !metrics) {
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

  const healthStatus = getHealthStatus(metrics.errorRate, metrics.averageResponseTime);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Production Metrics</h2>
          <p className="text-gray-600 mt-2">Real-time application performance and health monitoring</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>
          <button
            onClick={loadMetrics}
            className="btn-secondary"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Overall Health Status */}
      <div className={`border-2 rounded-2xl p-8 ${
        healthStatus === 'healthy' 
          ? 'border-emerald-200 bg-emerald-50' 
          : healthStatus === 'warning'
          ? 'border-yellow-200 bg-yellow-50'
          : 'border-red-200 bg-red-50'
      }`}>
        <div className="flex items-center space-x-4">
          <div className={`p-4 rounded-2xl ${
            healthStatus === 'healthy' ? 'bg-emerald-500' :
            healthStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
          }`}>
            {healthStatus === 'healthy' ? (
              <CheckCircle className="h-8 w-8 text-white" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-white" />
            )}
          </div>
          <div>
            <h3 className={`text-2xl font-bold ${
              healthStatus === 'healthy' ? 'text-emerald-900' :
              healthStatus === 'warning' ? 'text-yellow-900' : 'text-red-900'
            }`}>
              System {healthStatus === 'healthy' ? 'Healthy' : healthStatus === 'warning' ? 'Warning' : 'Critical'}
            </h3>
            <p className={`text-lg ${
              healthStatus === 'healthy' ? 'text-emerald-800' :
              healthStatus === 'warning' ? 'text-yellow-800' : 'text-red-800'
            }`}>
              Last updated: {metrics.lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Uptime</h3>
            <div className="bg-green-100 p-2 rounded-xl">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {formatUptime(metrics.uptime)}
          </div>
          <p className="text-sm text-gray-500">
            Since deployment
          </p>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Error Rate</h3>
            <div className={`p-2 rounded-xl ${
              metrics.errorRate < 1 ? 'bg-green-100' :
              metrics.errorRate < 5 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <AlertTriangle className={`h-5 w-5 ${
                metrics.errorRate < 1 ? 'text-green-600' :
                metrics.errorRate < 5 ? 'text-yellow-600' : 'text-red-600'
              }`} />
            </div>
          </div>
          <div className={`text-3xl font-bold mb-2 ${
            metrics.errorRate < 1 ? 'text-green-600' :
            metrics.errorRate < 5 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {metrics.errorRate.toFixed(2)}%
          </div>
          <p className="text-sm text-gray-500">
            Error rate
          </p>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Response Time</h3>
            <div className={`p-2 rounded-xl ${
              metrics.averageResponseTime < 1000 ? 'bg-green-100' :
              metrics.averageResponseTime < 3000 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <Zap className={`h-5 w-5 ${
                metrics.averageResponseTime < 1000 ? 'text-green-600' :
                metrics.averageResponseTime < 3000 ? 'text-yellow-600' : 'text-red-600'
              }`} />
            </div>
          </div>
          <div className={`text-3xl font-bold mb-2 ${
            metrics.averageResponseTime < 1000 ? 'text-green-600' :
            metrics.averageResponseTime < 3000 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {Math.round(metrics.averageResponseTime)}ms
          </div>
          <p className="text-sm text-gray-500">
            Average response
          </p>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Revenue Today</h3>
            <div className="bg-blue-100 p-2 rounded-xl">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {formatCurrency(metrics.revenueToday)}
          </div>
          <p className="text-sm text-gray-500">
            {metrics.bookingsToday} bookings
          </p>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="card-premium p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-blue-100 p-3 rounded-2xl">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Performance Insights</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-xl p-6">
            <h4 className="font-bold text-gray-900 mb-3">Response Time Trends</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Average:</span>
                <span className="font-medium">{Math.round(metrics.averageResponseTime)}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Target:</span>
                <span className="font-medium text-green-600">&lt; 1000ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    metrics.averageResponseTime < 1000 ? 'bg-green-500' :
                    metrics.averageResponseTime < 3000 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min((metrics.averageResponseTime / 3000) * 100, 100)}%`
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-6">
            <h4 className="font-bold text-gray-900 mb-3">Error Rate Health</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Rate:</span>
                <span className="font-medium">{metrics.errorRate.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Target:</span>
                <span className="font-medium text-green-600">&lt; 1%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    metrics.errorRate < 1 ? 'bg-green-500' :
                    metrics.errorRate < 5 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.min((metrics.errorRate / 10) * 100, 100)}%`
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-6">
            <h4 className="font-bold text-gray-900 mb-3">Business Metrics</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Users:</span>
                <span className="font-medium">{metrics.activeUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bookings Today:</span>
                <span className="font-medium">{metrics.bookingsToday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Revenue Today:</span>
                <span className="font-medium text-green-600">{formatCurrency(metrics.revenueToday)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Resources */}
      <div className="card-premium p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-purple-100 p-3 rounded-2xl">
            <Server className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">System Resources</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {typeof performance !== 'undefined' && (performance as any).memory 
                ? `${((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`
                : 'N/A'
              }
            </p>
            <p className="text-sm text-gray-600">Memory Usage</p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {navigator.onLine ? 'Online' : 'Offline'}
            </p>
            <p className="text-sm text-gray-600">Connection</p>
          </div>

          <div className="text-center">
            <div className="bg-orange-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatUptime(metrics.uptime)}
            </p>
            <p className="text-sm text-gray-600">Uptime</p>
          </div>

          <div className="text-center">
            <div className="bg-purple-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {metrics.activeUsers}
            </p>
            <p className="text-sm text-gray-600">Active Users</p>
          </div>
        </div>
      </div>

      {/* Alerts and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Alerts */}
        <div className="card-premium p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-yellow-100 p-3 rounded-2xl">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Performance Alerts</h3>
          </div>

          <div className="space-y-4">
            {metrics.errorRate > 1 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-800">High Error Rate</span>
                </div>
                <p className="text-red-700 text-sm">
                  Error rate of {metrics.errorRate.toFixed(2)}% exceeds the 1% threshold. 
                  Check error logs and recent deployments.
                </p>
              </div>
            )}

            {metrics.averageResponseTime > 2000 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Slow Response Times</span>
                </div>
                <p className="text-yellow-700 text-sm">
                  Average response time of {Math.round(metrics.averageResponseTime)}ms is above optimal range. 
                  Consider performance optimizations.
                </p>
              </div>
            )}

            {metrics.errorRate < 1 && metrics.averageResponseTime < 1000 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">All Systems Normal</span>
                </div>
                <p className="text-green-700 text-sm">
                  Performance metrics are within optimal ranges. System is running smoothly.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Monitoring Recommendations */}
        <div className="card-premium p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-blue-100 p-3 rounded-2xl">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Monitoring Setup</h3>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">External Monitoring</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Set up UptimeRobot for uptime monitoring</li>
                <li>• Configure Pingdom for performance monitoring</li>
                <li>• Set up StatusPage for public status updates</li>
                <li>• Configure alerting to Slack/email</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Error Tracking</h4>
              <ul className="text-green-700 text-sm space-y-1">
                <li>• Sentry for real-time error monitoring</li>
                <li>• LogRocket for session replay debugging</li>
                <li>• Custom webhook for critical alerts</li>
                <li>• Daily error summary reports</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionMetricsDashboard;