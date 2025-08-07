@@ .. @@
     // Listen for auth changes
     const { data: { subscription } } = supabase.auth.onAuthStateChange(
       async (event, session) => {
-        console.log('Auth state change:', event, session?.user?.id);
         if (event === 'SIGNED_OUT' || session === null) {
           // Clear any stale tokens when session is null
           if (event !== 'SIGNED_OUT') {
             await supabase.auth.signOut();
           }
         }
         setUser(session?.user ?? null);
         setLoading(false);
       }
     );