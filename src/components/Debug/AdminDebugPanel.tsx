import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import { NotificationManager } from '../../utils/notifications';
import { pingFunctions, getFunctionsBaseUrl, checkFunctionDeployment, plainFetchProbe } from '../../lib/functionsDiagnostics';

const AdminDebugPanel: React.FC = () => {
  const { allowed: isAdmin, loading: adminLoading, errorMsg: adminError } = useAdminGuard();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [pingResult, setPingResult] = useState<any>(null);
  const [deployResult, setDeployResult] = useState<any>(null);

  const testPing = async () => {
    setTesting(true);
    setPingResult(null);
    setDeployResult(null);
    
    console.log('🏓 Testing Edge Functions connectivity...');
    console.log('🔗 Functions URL:', getFunctionsBaseUrl());
    
    // First test deployment
    const deployCheck = await checkFunctionDeployment();
    console.log('📋 Deployment check:', deployCheck);
    setDeployResult(deployCheck);
    
    const result = await pingFunctions();
    console.log('🏓 Direct ping result:', result);
    
    const testResult = {
      success: result.ok,
      data: result.body,
      error: result.ok ? null : result.detail,
      url: result.url || getFunctionsBaseUrl(),
      status: result.status,
      developmentMode: result.developmentMode || false,
      errorType: result.errorType || null,
      timestamp: new Date().toISOString()
    };
    
    setPingResult(testResult);
    
    if (result.ok) {
      NotificationManager.success('✅ Edge Functions reachable!');
    } else if (result.developmentMode) {
      NotificationManager.info('ℹ️ Running in fallback mode - connect to Supabase for full functionality');
    } else {
      NotificationManager.error(`❌ Edge Functions unreachable: ${result.detail}`);
    }
    
    setTesting(false);
  };

  const testAdminGuard = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      console.log('🔍 Testing admin-guard function...');
      const { data, error } = await supabase.functions.invoke('admin-guard', { body: {} });
      
      const testResult = {
        success: !error,
        data: data,
        error: error?.message || null,
        timestamp: new Date().toISOString()
      };
      
      console.log('🔍 Admin guard test result:', testResult);
      setResult(testResult);
      
      if (data?.ok) {
        NotificationManager.success('✅ Admin access confirmed!');
      } else {
        NotificationManager.error('❌ Admin access denied');
      }
    } catch (error: any) {
      console.error('🔍 Admin guard test error:', error);
      setResult({ 
        success: false, 
        error: error?.message || 'Network error or function unreachable',
        timestamp: new Date().toISOString()
      });
      NotificationManager.error('Function test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-blue-900">Admin Access Debug</h3>
        <div className="text-xs text-blue-700">
          Functions URL: {getFunctionsBaseUrl() || 'Not configured'}
        </div>
        <div className="flex gap-2">
          <button
            onClick={testPing}
            disabled={testing}
            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2 text-sm"
          >
            {testing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <span>🏓</span>
            )}
            <span>{testing ? 'Testing...' : 'Test Network'}</span>
          </button>
          <button
            onClick={testAdminGuard}
            disabled={testing}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2 text-sm"
          >
            {testing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <span>🔍</span>
            )}
            <span>{testing ? 'Testing...' : 'Test Admin'}</span>
          </button>
        </div>
      </div>
      
      {/* Admin Hook Status */}
      <div className="mb-4 bg-white/50 rounded-lg p-3">
        <h4 className="font-medium text-blue-900 mb-2">Admin Hook Status:</h4>
        <div className="text-sm">
          <div className="flex justify-between">
            <span>Admin Access:</span>
            <span className={`font-medium ${
              adminLoading ? 'text-blue-600' : 
              isAdmin ? 'text-green-600' : 'text-red-600'
            }`}>
              {adminLoading ? 'Checking...' : isAdmin ? 'Granted' : 'Denied'}
            </span>
          </div>
          {adminError && (
            <div className="mt-2 text-red-700 font-medium text-xs bg-red-100 p-2 rounded">
              Error: {adminError}
            </div>
          )}
        </div>
      </div>
      
      {/* Ping Test Result */}
      {pingResult && (
        <div className={`rounded-lg p-3 text-sm mb-4 ${
          pingResult.success && pingResult.data?.ok 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <p className="font-medium mb-2">
            {pingResult.success && pingResult.data?.ok ? '✅ Network Test Passed' : '❌ Network Test Failed'}
          </p>
          <pre className="text-xs bg-white/50 p-2 rounded overflow-auto">
            {JSON.stringify(pingResult, null, 2)}
          </pre>
        </div>
      )}
      
      {/* Deployment Test Result */}
      {deployResult && (
        <div className={`rounded-lg p-3 text-sm mb-4 ${
          deployResult.deployed && deployResult.reachable 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          <p className="font-medium mb-2">
            📋 Deployment Status: {deployResult.deployed ? 'Functions Deployed' : 'Not Deployed'}
          </p>
          <pre className="text-xs bg-white/50 p-2 rounded overflow-auto">
            {JSON.stringify(deployResult, null, 2)}
          </pre>
        </div>
      )}
      
      {/* Admin Test Result */}
      {result && (
        <div className={`rounded-lg p-3 text-sm ${
          result.success && result.data?.ok 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <p className="font-medium mb-2">
            {result.success && result.data?.ok ? '✅ Admin Access Granted' : '❌ Admin Access Denied'}
          </p>
          <pre className="text-xs bg-white/50 p-2 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <p className="text-blue-700 text-sm mt-3">
        <strong>Debug Info:</strong> Tests deployment status, network connectivity, and admin permissions. Use explicit VITE_SUPABASE_FUNCTIONS_URL to force URL if auto-detection fails.
      </p>
    </div>
  );
};

export default AdminDebugPanel;