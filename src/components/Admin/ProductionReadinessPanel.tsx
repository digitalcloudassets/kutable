import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
  Clock,
  Database,
  BarChart3,
  Lock,
  FileText,
  Activity,
  Zap
} from 'lucide-react';
import { productionChecklist, ProductionChecklistItem } from '../../utils/productionChecklist';
import { productionMonitor } from '../../utils/productionMonitoring';

const ProductionReadinessPanel: React.FC = () => {
  const [checklist, setChecklist] = useState<ProductionChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    loadChecklist();
    loadHealthStatus();
  }, []);

  const loadChecklist = () => {
    setLoading(true);
    setTimeout(() => {
      const items = productionChecklist.getChecklist();
      setChecklist(items);
      setLoading(false);
    }, 1000);
  };

  const loadHealthStatus = () => {
    const health = productionMonitor.getHealthStatus();
    setHealthStatus(health);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-5 w-5 text-emerald-600 flex-none" />;
      case 'fail': return <AlertTriangle className="h-5 w-5 text-red-600 flex-none" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600 flex-none" />;
      case 'manual': return <Clock className="h-5 w-5 text-blue-600 flex-none" />;
      default: return <Clock className="h-5 w-5 text-gray-400 flex-none" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return Shield;
      case 'configuration': return Database;
      case 'monitoring': return BarChart3;
      case 'performance': return Zap;
      case 'compliance': return FileText;
      default: return Activity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'fail': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'manual': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const exportReport = () => {
    const report = productionChecklist.generateReport();
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kutable-production-readiness-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const overallStatus = productionChecklist.getOverallStatus();
  const categories = ['security', 'configuration', 'monitoring', 'performance', 'compliance'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-w-0">
      {/* Overall Status */}
      <div
        className={`border-2 rounded-2xl p-8 overflow-hidden isolate ${
          overallStatus.ready ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
        }`}
      >
        <div className="flex items-center justify-between mb-6 gap-4 min-w-0">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={`p-4 rounded-2xl flex-none ${
                overallStatus.ready ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            >
              {overallStatus.ready ? (
                <CheckCircle className="h-8 w-8 text-white" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <h2
                className={`font-bold wrap-anywhere text-[clamp(1.25rem,2.2vw,1.875rem)] ${
                  overallStatus.ready ? 'text-emerald-900' : 'text-red-900'
                }`}
              >
                {overallStatus.ready ? 'Production Ready' : 'Not Production Ready'}
              </h2>
              <p className={`${overallStatus.ready ? 'text-emerald-800' : 'text-red-800'}`}>
                {overallStatus.completionPercentage.toFixed(1)}% Complete
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button onClick={loadChecklist} className="btn-secondary">
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button onClick={exportReport} className="btn-primary">
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center min-w-0">
            <div className="text-3xl font-bold text-red-600">{overallStatus.criticalIssues}</div>
            <div className="text-sm font-medium text-gray-600">Critical Issues</div>
          </div>
          <div className="text-center min-w-0">
            <div className="text-3xl font-bold text-yellow-600">{overallStatus.warnings}</div>
            <div className="text-sm font-medium text-gray-600">Warnings</div>
          </div>
          <div className="text-center min-w-0">
            <div className="text-3xl font-bold text-emerald-600">
              {checklist.filter((item) => item.status === 'pass').length}
            </div>
            <div className="text-sm font-medium text-gray-600">Completed</div>
          </div>
          <div className="text-center min-w-0">
            <div className="text-3xl font-bold text-blue-600">
              {checklist.filter((item) => item.status === 'manual').length}
            </div>
            <div className="text-sm font-medium text-gray-600">Manual Checks</div>
          </div>
        </div>

        {/* Health Status */}
        {healthStatus && (
          <div className="mt-8 pt-8 border-t border-gray-200 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              {healthStatus.checks.map((check: any, index: number) => (
                <div key={index} className={`border rounded-lg p-4 ${getStatusColor(check.status)} min-w-0`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium nowrap-ellipsis">{check.name}</span>
                    {getStatusIcon(check.status)}
                  </div>
                  <div className="text-sm mt-1 wrap-anywhere">{check.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Checklist by Category */}
      <div className="space-y-6 min-w-0">
        {categories.map((category) => {
          const categoryItems = checklist.filter((item) => item.category === category);
          const passCount = categoryItems.filter((item) => item.status === 'pass').length;
          const failCount = categoryItems.filter((item) => item.status === 'fail').length;
          const CategoryIcon = getCategoryIcon(category);
          const isExpanded = expandedCategory === category;

          return (
            <div key={category} className="card-premium overflow-hidden isolate">
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors min-w-0"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="bg-gray-100 p-3 rounded-2xl flex-none">
                    <CategoryIcon className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 capitalize nowrap-ellipsis">{category}</h3>
                    <p className="text-gray-600 nowrap-ellipsis">
                      {passCount}/{categoryItems.length} checks passed
                      {failCount > 0 && ` • ${failCount} issues`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium flex-none ${
                      failCount === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {failCount === 0 ? 'All Good' : `${failCount} Issues`}
                  </div>
                  <svg
                    className={`h-5 w-5 text-gray-400 transform transition-transform flex-none ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 20 20"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 min-w-0">
                  <div className="space-y-4">
                    {categoryItems.map((item) => (
                      <div key={item.id} className={`border rounded-lg p-4 ${getStatusColor(item.status)} min-w-0`}>
                        <div className="flex items-start justify-between gap-3 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 min-w-0">
                              {getStatusIcon(item.status)}
                              <h4 className="font-semibold nowrap-ellipsis">{item.title}</h4>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium flex-none ${
                                  item.priority === 'critical'
                                    ? 'bg-red-100 text-red-800'
                                    : item.priority === 'high'
                                    ? 'bg-orange-100 text-orange-800'
                                    : item.priority === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {item.priority}
                              </span>
                            </div>
                            <p className="text-sm mb-2 wrap-anywhere">{item.description}</p>
                            {item.documentation && item.status !== 'pass' && (
                              <div className="bg-white/50 rounded-lg p-3 mt-3">
                                <p className="text-sm font-medium">Action Required:</p>
                                <p className="text-sm wrap-anywhere">{item.documentation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Production Environment Variables Guide */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-8 overflow-hidden isolate">
        <div className="flex items-start gap-4 min-w-0">
          <div className="bg-blue-500 p-3 rounded-2xl flex-none">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0 w-full">
            <h3 className="font-bold text-blue-900 mb-4 text-[clamp(1.125rem,2vw,1.5rem)] wrap-anywhere">
              Production Environment Setup
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6">
              <div className="min-w-0">
                <h4 className="font-bold text-blue-800 mb-3 nowrap-ellipsis">Required Environment Variables:</h4>
                <div className="space-y-1.5 text-[12px] leading-5 font-mono bg-blue-100 rounded-lg p-3 wrap-anywhere">
                  <div>VITE_SUPABASE_URL=https://your-project.supabase.co</div>
                  <div>VITE_SUPABASE_ANON_KEY=your_anon_key</div>
                  <div>VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_key</div>
                  <div>VITE_ADMIN_USERNAME=secure_admin_username</div>
                  <div>VITE_ADMIN_PASSWORD=very_secure_password_16_chars_min</div>
                </div>
              </div>

              <div className="min-w-0">
                <h4 className="font-bold text-blue-800 mb-3 nowrap-ellipsis">Optional but Recommended:</h4>
                <div className="space-y-1.5 text-[12px] leading-5 font-mono bg-blue-100 rounded-lg p-3 wrap-anywhere">
                  <div>VITE_SENTRY_DSN=https://your-dsn@sentry.io</div>
                  <div>VITE_LOGROCKET_APP_ID=your-app-id</div>
                  <div>VITE_GOOGLE_MAPS_API_KEY=your_maps_key</div>
                  <div>VITE_MONITORING_ENDPOINT=https://your-monitor.com</div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-white border border-blue-300 rounded-xl p-3">
              <h4 className="font-bold text-blue-900 mb-2 nowrap-ellipsis">Supabase Edge Function Secrets:</h4>
              <pre className="scroll-x no-scrollbar whitespace-pre text-[11px] leading-5 font-mono text-blue-800 wrap-anywhere max-w-full">
RESEND_API_KEY=re_your_key
RESEND_FROM="Kutable <notifications@mail.kutable.com>"
TWILIO_ACCOUNT_SID=AC_your_sid
TWILIO_AUTH_TOKEN=your_auth_token
STRIPE_SECRET_KEY=sk_live_your_secret
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Issues Alert */}
      {overallStatus.criticalIssues > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 overflow-hidden isolate">
          <div className="flex items-start gap-4 min-w-0">
            <div className="bg-red-500 p-3 rounded-2xl flex-none">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-bold text-red-900 mb-4 wrap-anywhere">🚨 Critical Issues Must Be Resolved</h3>
              <p className="text-red-800 mb-6 wrap-anywhere">
                The following critical issues must be fixed before deploying to production:
              </p>
              <div className="space-y-3">
                {productionChecklist.getCriticalIssues().map((issue) => (
                  <div key={issue.id} className="bg-white border border-red-300 rounded-lg p-4 min-w-0">
                    <h4 className="font-bold text-red-900 mb-2 nowrap-ellipsis">{issue.title}</h4>
                    <p className="text-red-800 text-sm mb-2 wrap-anywhere">{issue.description}</p>
                    {issue.documentation && (
                      <p className="text-red-700 text-sm font-medium wrap-anywhere">→ {issue.documentation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Production Deployment Checklist */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-100 border border-emerald-200 rounded-2xl p-8 overflow-hidden isolate">
        <div className="flex items-start gap-4 min-w-0">
          <div className="bg-emerald-500 p-3 rounded-2xl flex-none">
            <CheckCircle className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-2xl font-bold text-emerald-900 mb-4 wrap-anywhere">
              Final Production Deployment Steps
            </h3>
            <div className="space-y-3 text-emerald-800">
              {[ 
                '1. Set all environment variables in Netlify',
                '2. Deploy Supabase Edge Functions',
                '3. Configure Stripe webhooks for production domain',
                '4. Set up DNS and SSL certificate',
                '5. Configure monitoring and alerting',
                '6. Run final security and performance tests'
              ].map((t) => (
                <div key={t} className="flex items-center gap-2 min-w-0">
                  <CheckCircle className="h-4 w-4 text-emerald-600 flex-none" />
                  <span className="font-medium wrap-anywhere">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionReadinessPanel;