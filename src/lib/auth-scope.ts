import { supabase } from './supabaseClient';
import { clearConnectState, getConnectState } from './connectState';

let currentUserId: string | null = null;
let initialized = false;

export function bindAuthScope() {
  if (initialized) return;
  initialized = true;
  
  supabase.auth.onAuthStateChange(async (event, session) => {
    const newId = session?.user?.id ?? null;
    
    if (newId !== currentUserId) {
      // User switched or signed out; clear any cross-account onboarding state
      const cs = getConnectState();
      if (cs && cs.userId !== newId) {
        console.log('Clearing Connect state due to user switch:', {
          previousUser: cs.userId,
          newUser: newId,
          event
        });
        clearConnectState();
      }
      currentUserId = newId;
    }
    
    // Additional cleanup on sign out
    if (event === 'SIGNED_OUT') {
      clearConnectState();
      currentUserId = null;
    }
  });
}