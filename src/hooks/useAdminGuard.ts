import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useAdminGuard() {
  const { user, session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user || !session) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/.netlify/functions/admin-guard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId: user.id }),
        });

        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin || false);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdminStatus();
  }, [user, session]);

  return { isAdmin, loading };
}