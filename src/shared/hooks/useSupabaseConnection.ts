import { useState, useEffect } from 'react';

export const useSupabaseConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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