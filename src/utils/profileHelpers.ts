import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

// Centralized client profile management to prevent duplicates
export const getOrCreateClientProfile = async (user: User) => {
  const userId = user?.id ?? null;
  if (!user || !userId) {
    console.warn('[getOrCreateClientProfile] No user or user.id provided');
    return null;
  }

  // Check if user is intended to be a barber (don't create client profile)
  if (user.user_metadata?.user_type === 'barber') {
    console.log('User is intended to be a barber, not creating client profile');
    return null;
  }
  try {
    
    // STEP 1: Try to find by user_id first (most reliable)
    let { data: existingProfile } = await supabase
      .from('client_profiles')
      .select('id, user_id, email')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingProfile) {
      return existingProfile;
    }

    // STEP 2: If not found by user_id, search by email (handle legacy data)
    if (user.email) {
      const { data: profileByEmail } = await supabase
        .from('client_profiles')
        .select('id, user_id, email, first_name, last_name')
        .eq('email', user.email)
        .maybeSingle();
        
      if (profileByEmail) {
        
        // Update the user_id to match the authenticated user
        const { data: updatedProfile, error: updateError } = await supabase
          .from('client_profiles')
          .update({ 
            user_id: userId,
            updated_at: new Date().toISOString()
          })
          .eq('id', profileByEmail.id)
          .select('id')
          .single();
          
        if (!updateError && updatedProfile) {
          return updatedProfile;
        } else {
          console.error('❌ Failed to fix user_id mismatch:', updateError);
        }
        if (session?.user) {
          await supabase.auth.updateUser({ data: { avatar_url: url } });
        }
      }
    }

    // STEP 3: Create new profile only if none exists
    
    const { data: newProfile, error: createError } = await supabase
      .from('client_profiles')
      .upsert({
        user_id: userId,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        email: user.email || '',
        phone: '',
        preferred_contact: 'sms',
        profile_image_url: null, // Explicit null - no default avatar
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select('id')
      .single();

    if (createError) {
      throw createError;
    }

    return newProfile;

  } catch (error) {
    console.warn('Error in getOrCreateClientProfile:', error);
    return null;
  }
};

// Clean up duplicate client profiles (run manually when needed)
export const cleanupDuplicateClientProfiles = async (userEmail: string) => {
  if (!userEmail) return { success: false, error: 'Email required' };

  try {
    
    // Find all profiles with this email
    const { data: duplicateProfiles } = await supabase
      .from('client_profiles')
      .select('id, user_id, created_at, first_name, last_name')
      .eq('email', userEmail)
      .order('created_at', { ascending: true }); // Oldest first

    if (!duplicateProfiles || duplicateProfiles.length <= 1) {
      return { success: true, message: 'No duplicates found' };
    }


    // Keep the first profile (oldest), delete the rest
    const profileToKeep = duplicateProfiles[0];
    const profilesToDelete = duplicateProfiles.slice(1);


    // Delete duplicate profiles
    for (const profile of profilesToDelete) {
      const { error: deleteError } = await supabase
        .from('client_profiles')
        .delete()
        .eq('id', profile.id);

      if (deleteError) {
        console.error('❌ Failed to delete duplicate profile:', profile.id, deleteError);
      }
    }

    return { 
      success: true, 
      message: `Cleaned up ${profilesToDelete.length} duplicate profiles. Kept profile: ${profileToKeep.id}`,
      keptProfile: profileToKeep,
      deletedCount: profilesToDelete.length
    };

  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Cleanup failed' };
  }
};