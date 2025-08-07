import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

// Centralized client profile management to prevent duplicates
export const getOrCreateClientProfile = async (user: User) => {
  if (!user) return null;

  try {
    console.log('🔍 Looking up client profile for user:', user.id, user.email);
    
    // STEP 1: Try to find by user_id first (most reliable)
    let { data: existingProfile } = await supabase
      .from('client_profiles')
      .select('id, user_id, email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingProfile) {
      console.log('✅ Found client profile by user_id:', existingProfile.id);
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
        console.log('🔧 Found client profile by email, fixing user_id mismatch:', profileByEmail.id);
        
        // Update the user_id to match the authenticated user
        const { data: updatedProfile, error: updateError } = await supabase
          .from('client_profiles')
          .update({ 
            user_id: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', profileByEmail.id)
          .select('id')
          .single();
          
        if (!updateError && updatedProfile) {
          console.log('✅ Fixed user_id mismatch for profile:', updatedProfile.id);
          return updatedProfile;
        } else {
          console.error('❌ Failed to fix user_id mismatch:', updateError);
        }
      }
    }

    // STEP 3: Create new profile only if none exists
    console.log('📝 Creating new client profile for user:', user.id);
    
    const { data: newProfile, error: createError } = await supabase
      .from('client_profiles')
      .insert({
        user_id: user.id,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        email: user.email || '',
        phone: '',
        preferred_contact: 'sms'
      })
      .select('id')
      .single();

    if (createError) {
      console.error('❌ Failed to create client profile:', createError);
      throw createError;
    }

    console.log('✅ Created new client profile:', newProfile.id);
    return newProfile;

  } catch (error) {
    console.error('❌ Error in getOrCreateClientProfile:', error);
    return null;
  }
};

// Clean up duplicate client profiles (run manually when needed)
export const cleanupDuplicateClientProfiles = async (userEmail: string) => {
  if (!userEmail) return { success: false, error: 'Email required' };

  try {
    console.log('🧹 Cleaning up duplicate profiles for:', userEmail);
    
    // Find all profiles with this email
    const { data: duplicateProfiles } = await supabase
      .from('client_profiles')
      .select('id, user_id, created_at, first_name, last_name')
      .eq('email', userEmail)
      .order('created_at', { ascending: true }); // Oldest first

    if (!duplicateProfiles || duplicateProfiles.length <= 1) {
      console.log('✅ No duplicates found');
      return { success: true, message: 'No duplicates found' };
    }

    console.log(`📊 Found ${duplicateProfiles.length} profiles for ${userEmail}`);

    // Keep the first profile (oldest), delete the rest
    const profileToKeep = duplicateProfiles[0];
    const profilesToDelete = duplicateProfiles.slice(1);

    console.log('📌 Keeping profile:', profileToKeep.id, 'created:', profileToKeep.created_at);
    console.log('🗑️ Deleting profiles:', profilesToDelete.map(p => p.id));

    // Delete duplicate profiles
    for (const profile of profilesToDelete) {
      const { error: deleteError } = await supabase
        .from('client_profiles')
        .delete()
        .eq('id', profile.id);

      if (deleteError) {
        console.error('❌ Failed to delete duplicate profile:', profile.id, deleteError);
      } else {
        console.log('✅ Deleted duplicate profile:', profile.id);
      }
    }

    return { 
      success: true, 
      message: `Cleaned up ${profilesToDelete.length} duplicate profiles. Kept profile: ${profileToKeep.id}`,
      keptProfile: profileToKeep,
      deletedCount: profilesToDelete.length
    };

  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Cleanup failed' };
  }
};