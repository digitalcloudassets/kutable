import { useState, useEffect } from 'react';
import { env } from '../lib/env';

export const useSupabaseConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = () => {
    const supabaseUrl = env.supabaseUrl;
    const supabaseAnonKey = env.supabaseAnonKey;

    const hasValidCredentials = supabaseUrl && 
      supabaseAnonKey && 
      supabaseUrl !== 'https://your-project.supabase.co' &&
      supabaseAnonKey !== 'your_supabase_anon_key_here' &&
      supabaseUrl !== 'your_supabase_url_here' &&
      supabaseAnonKey !== 'your_supabase_anon_key_here' &&
      !supabaseUrl.includes('placeholder') &&
      !supabaseAnonKey.includes('placeholder') &&
      supabaseUrl.startsWith('https://') &&
      supabaseUrl.includes('.supabase.co');

    setIsConnected(hasValidCredentials);
    setLoading(false);
  };

  return { isConnected, loading, checkConnection };
};