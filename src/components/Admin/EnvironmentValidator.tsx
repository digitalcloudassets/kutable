import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CreditCard, 
  Mail, 
  MessageSquare, 
  Shield, 
  Eye,
  CheckCircle,
  AlertTriangle,
  X,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface EnvironmentCheck {
  service: string;
  status: 'configured' | 'missing' | 'invalid' | 'testing';
  required: boolean;
  description: string;
  icon: React.ElementType;
  color: string;
  testEndpoint?: string;
}

const EnvironmentValidator: React.FC = () => {
  const [checks, setChecks] = useState<EnvironmentCheck[]>([]);
  const [testing, setTesting] = useState(false);
  const [lastTest, setLastTest] = useState<Date | null>(null);

  useEffect(() => {
    runEnvironmentChecks();
  }, []);

  const runEnvironmentChecks = async () => {
    setTesting(true);
    
    // Simulate testing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const environmentChecks: EnvironmentCheck[] = [
      {
        service: 'Supabase Database',
        status: checkSupabaseConfig(),
        required: true,
        description: 'Database connection and authentication',
        icon: Database,
        color: 'blue',
        testEndpoint: '/api/test-db'
      },
      {
        service: 'Stripe Payments',
        status: checkStripeConfig(),
        required: true,
        description: 'Payment processing and Connect accounts',
        icon: CreditCard,
        color: 'purple',
        testEndpoint: '/api/test-stripe'
      },
      {
        service: 'Email Service (Resend)',
        status: checkEmailConfig(),
        required: true,
        description: 'Transactional email delivery',
        icon: Mail,
        color: 'green',
        testEndpoint: 'https://your-project.supabase.co/functions/v1/env-check'
      },
      {
        service: 'SMS Service (Twilio)',
        status: checkSMSConfig(),
        required: true,
        description: 'SMS notifications and confirmations',
        icon: MessageSquare,
        color: 'orange'
      },
      {
        service: 'Error Tracking (Sentry)',
        status: checkSentryConfig(),
        required: false,
        description: 'Production error monitoring and alerting',
        icon: Shield,
        color: 'red'
      },
      {
        service: 'Session Recording (LogRocket)',
        status: checkLogRocketConfig(),
        required: false,
        description: 'User session recording and debugging',
        icon: Eye,
        color: 'indigo'
      }
    ];

    setChecks(environmentChecks);
    setLastTest(new Date());
    setTesting(false);
  };

  const checkSupabaseConfig = (): 'configured' | 'missing' | 'invalid' => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url || !key) return 'missing';
    if (url.includes('placeholder') || key.includes('placeholder')) return 'invalid';
    if (!url.includes('.supabase.co') || key.length < 50) return 'invalid';
    
    return 'configured';
  };

  const checkStripeConfig = (): 'configured' | 'missing' | 'invalid' => {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    if (!key) return 'missing';
    if (key.includes('placeholder') || !key.startsWith('pk_')) return 'invalid';
    
    return 'configured';
  };

  const checkEmailConfig = (): 'configured' | 'missing' | 'invalid' => {
    // This would need to be checked via API call to edge function
    return 'testing';
  };

  const checkSMSConfig = (): 'configured' | 'missing' | 'invalid' => {
    // This would need to be checked via API call to edge function
    return 'testing';
  };

  const checkSentryConfig = (): 'configured' | 'missing' | 'invalid' => {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    
    if (!dsn || dsn === 'your_sentry_dsn_here') return 'missing';
    if (!dsn.includes('sentry.io')) return 'invalid';
    
    return 'configured';
  };

  const checkLogRocketConfig = (): 'configured' | 'missing' | 'invalid' => {
    const appId = import.meta.env.VITE_LOGROCKET_APP_ID;
    
    if (!appId || appId === 'your_logrocket_app_id_here') return 'missing';
    
    return 'configured';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured': return <CheckCircle className="h-5 w-5 text-emerald-600" />;
      case 'missing': return <X className="h-5 w-5 text-red-600" />;
      case 'invalid': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'testing': return (
        <div className="animate-spin">
          <RefreshCw className="h-5 w-5 text-blue-600" />
        </div>
      );
      default: return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured': return 'border-emerald-200 bg-emerald-50';
      case 'missing': return 'border-red-200 bg-red-50';
      case 'invalid': return 'border-yellow-200 bg-yellow-50';
      case 'testing': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const testService = async (check: EnvironmentCheck) => {
    if (!check.testEndpoint) return;

    try {
      setChecks(prev => prev.map(c => 
        c.service === check.service 
          ? { ...c, status: 'testing' }
          : c
      ));

      const response = await fetch(check.testEndpoint);
      const result = await response.json();

      setChecks(prev => prev.map(c => 
        c.service === check.service 
          ? { ...c, status: result.success ? 'configured' : 'invalid' }
          : c
      ));
    } catch (error) {
      setChecks(prev => prev.map(c => 
        c.service === check.service 
          ? { ...c, status: 'invalid' }
          : c
      ));
    }
  };

  const configuredCount = checks.filter(c => c.status === 'configured').length;
  const requiredCount = checks.filter(c => c.required).length;
  const requiredConfigured = checks.filter(c => c.required && c.status === 'configured').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Environment Configuration</h2>
          <p className="text-gray-600 mt-2">
            {requiredConfigured}/{requiredCount} required services configured • {configuredCount}/{checks.length} total
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {lastTest && (
            <span className="text-sm text-gray-500">
              Last checked: {lastTest.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={runEnvironmentChecks}
            disabled={testing}
            className="btn-secondary"
          >
            {testing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>Re-check</span>
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`border-2 rounded-2xl p-6 ${
        requiredConfigured === requiredCount 
          ? 'border-emerald-200 bg-emerald-50' 
          : 'border-red-200 bg-red-50'
      }`}>
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-2xl ${
            requiredConfigured === requiredCount ? 'bg-emerald-500' : 'bg-red-500'
          }`}>
            {requiredConfigured === requiredCount ? (
              <CheckCircle className="h-6 w-6 text-white" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-white" />
            )}
          </div>
          <div>
            <h3 className={`text-xl font-bold ${
              requiredConfigured === requiredCount ? 'text-emerald-900' : 'text-red-900'
            }`}>
              {requiredConfigured === requiredCount 
                ? 'All Required Services Configured' 
                : 'Missing Required Configuration'
              }
            </h3>
            <p className={`${
              requiredConfigured === requiredCount ? 'text-emerald-800' : 'text-red-800'
            }`}>
              {requiredConfigured === requiredCount 
                ? 'Your application is ready for production deployment'
                : `${requiredCount - requiredConfigured} critical service(s) need configuration`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Service Checks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch auto-rows-fr">
        {checks.map((check) => (
          <div
            key={check.service}
            className={`relative isolate flex h-full flex-col rounded-2xl border bg-white p-4 transition-shadow hover:shadow-sm min-w-0 ${getStatusColor(check.status)}`}
          >
            <div className="absolute top-3 right-3 z-10 pointer-events-none">
              {getStatusIcon(check.status)}
            </div>

            <div className="flex items-start gap-3 min-w-0 mb-2 pr-8">
              <div
                className={`flex-none h-9 w-9 rounded-xl grid place-items-center ${
                  {
                    blue: 'bg-blue-100',
                    purple: 'bg-purple-100',
                    green: 'bg-green-100',
                    orange: 'bg-orange-100',
                    red: 'bg-red-100',
                    indigo: 'bg-indigo-100'
                  }[check.color] || 'bg-gray-100'
                }`}
              >
                <check.icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 text-sm break-words leading-5">
                  {check.service}
                </h3>
                <p className="text-xs text-gray-600 leading-5 break-words">{check.description}</p>
              </div>
            </div>

            <div className="mt-auto pt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              {check.required && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-red-100 text-red-800">
                  Required
                </span>
              )}
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap capitalize ${
                  check.status === 'configured'
                    ? 'bg-emerald-100 text-emerald-800'
                    : check.status === 'missing'
                    ? 'bg-red-100 text-red-800'
                    : check.status === 'invalid'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {check.status}
              </span>

              {check.testEndpoint && (
                <button
                  onClick={() => testService(check)}
                  disabled={check.status === 'testing'}
                  className="text-xs text-primary-600 hover:underline shrink-0"
                >
                  Test
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Configuration Instructions</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Netlify Environment Variables</h4>
            <div className="space-y-3 text-sm">
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="font-medium mb-1">1. Go to Netlify Dashboard → Site Settings → Environment Variables</p>
                <p className="text-gray-600">Add all VITE_ prefixed variables from your .env file</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="font-medium mb-1">2. Use Production API Keys</p>
                <p className="text-gray-600">Replace all test/development keys with production keys</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="font-medium mb-1">3. Secure Admin Credentials</p>
                <p className="text-gray-600">Change default admin username and use strong password (16+ chars)</p>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Supabase Edge Functions</h4>
            <div className="space-y-3 text-sm">
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="font-medium mb-1">1. Deploy Edge Functions</p>
                <p className="text-gray-600 mb-2">Run: <code>supabase functions deploy</code></p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="font-medium mb-1">2. Set Function Secrets</p>
                <div className="text-gray-600 space-y-1 font-mono text-xs scroll-x">
                  <div>supabase secrets set RESEND_API_KEY=re_...</div>
                  <div>supabase secrets set TWILIO_ACCOUNT_SID=AC...</div>
                  <div>supabase secrets set STRIPE_SECRET_KEY=sk_live_...</div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="font-medium mb-1">3. Test Functions</p>
                <p className="text-gray-600">Use the test endpoints to verify functionality</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentValidator;