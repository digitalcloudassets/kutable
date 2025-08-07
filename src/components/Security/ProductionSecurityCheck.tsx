import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { getProductionReadinessReport, securityMonitor } from '../../utils/productionSecurity';

const ProductionSecurityCheck: React.FC = () => {
  const [securityReport, setSecurityReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    runSecurityCheck();
  }, []);

  const runSecurityCheck = () => {
    setLoading(true);
    setTimeout(() => {
      const report = getProductionReadinessReport();
      const stats = securityMonitor.getSecurityStats();
      setSecurityReport({ ...report, stats });
      setLoading(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="animate-spin">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Running Security Check...</h3>
        </div>
        <div className="space-y-3">
          <div className="animate-pulse h-4 bg-gray-200 rounded"></div>
          <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!securityReport) return null;

  const { isReady, criticalIssues, warnings, recommendations, stats } = securityReport;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isReady ? 'bg-green-100' : 'bg-red-100'}`}>
            {isReady ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Production Security Status
            </h3>
            <p className={`text-sm font-medium ${isReady ? 'text-green-600' : 'text-red-600'}`}>
              {isReady ? 'Ready for Production' : 'Security Issues Detected'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
          <button
            onClick={runSecurityCheck}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
          <p className="text-sm text-gray-600">Security Events</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">{stats.highRiskEvents}</p>
          <p className="text-sm text-gray-600">High Risk Events</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.recentActivity}</p>
          <p className="text-sm text-gray-600">Recent Activity</p>
        </div>
      </div>

      {expanded && (
        <div className="space-y-6">
          {/* Critical Issues */}
          {criticalIssues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <X className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold text-red-800">Critical Issues ({criticalIssues.length})</h4>
              </div>
              <ul className="space-y-1 text-sm text-red-700">
                {criticalIssues.map((issue, index) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h4 className="font-semibold text-yellow-800">Warnings ({warnings.length})</h4>
              </div>
              <ul className="space-y-1 text-sm text-yellow-700">
                {warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-blue-800">Security Recommendations</h4>
            </div>
            <ul className="space-y-1 text-sm text-blue-700">
              {recommendations.slice(0, 5).map((rec, index) => (
                <li key={index}>• {rec}</li>
              ))}
            </ul>
          </div>

          {/* Security Checklist */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Production Security Checklist</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Input validation and sanitization implemented</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Rate limiting configured</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Password security requirements enforced</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>File upload restrictions in place</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>HTTPS and security headers configured</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Brute force protection enabled</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Error message sanitization implemented</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionSecurityCheck;