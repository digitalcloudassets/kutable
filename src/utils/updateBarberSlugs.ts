import { supabase } from '../lib/supabase';

const generateSlugFromBusinessName = (businessName: string): string => {
  return businessName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
};

export const generateUniqueSlug = async (businessName: string): Promise<string> => {
  let baseSlug = generateSlugFromBusinessName(businessName);
  
  if (!baseSlug) {
    baseSlug = 'barber';
  }
  
  let slug = baseSlug;
  let counter = 1;
  
  // Check for conflicts and make unique
  while (true) {
    const { data: existingProfile } = await supabase
      .from('barber_profiles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    
    if (!existingProfile) {
      break;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
};

export const updateAllBarberSlugs = async (): Promise<{
  success: boolean;
  updated: number;
  errors: string[];
}> => {
  try {
    console.log('🔄 Starting to update all barber profile slugs...');
    
    // Find all barber profiles that have UUID slugs or null slugs
    const { data: barbersToUpdate, error: fetchError } = await supabase
      .from('barber_profiles')
      .select('id, business_name, slug')
      .or('slug.is.null,slug~^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');

    if (fetchError) {
      throw fetchError;
    }

    if (!barbersToUpdate || barbersToUpdate.length === 0) {
      console.log('✅ No barber profiles need slug updates');
      return { success: true, updated: 0, errors: [] };
    }

    console.log(`📋 Found ${barbersToUpdate.length} barber profiles that need slug updates`);

    const errors: string[] = [];
    let updated = 0;

    for (const barber of barbersToUpdate) {
      try {
        if (!barber.business_name) {
          errors.push(`Barber ${barber.id}: No business name available`);
          continue;
        }

        const newSlug = await generateUniqueSlug(barber.business_name);
        
        const { error: updateError } = await supabase
          .from('barber_profiles')
          .update({ 
            slug: newSlug,
            updated_at: new Date().toISOString()
          })
          .eq('id', barber.id);

        if (updateError) {
          errors.push(`Barber ${barber.business_name}: ${updateError.message}`);
        } else {
          console.log(`✅ Updated ${barber.business_name}: ${barber.slug} → ${newSlug}`);
          updated++;
        }
      } catch (error) {
        errors.push(`Barber ${barber.business_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`🎉 Slug update complete: ${updated} updated, ${errors.length} errors`);
    
    return {
      success: errors.length === 0,
      updated,
      errors
    };

  } catch (error) {
    console.error('❌ Failed to update barber slugs:', error);
    return {
      success: false,
      updated: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

// Helper function to update a single barber's slug
export const updateSingleBarberSlug = async (barberId: string): Promise<{
  success: boolean;
  newSlug?: string;
  error?: string;
}> => {
  try {
    const { data: barber, error: fetchError } = await supabase
      .from('barber_profiles')
      .select('id, business_name, slug')
      .eq('id', barberId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    if (!barber.business_name) {
      return { success: false, error: 'No business name available' };
    }

    const newSlug = await generateUniqueSlug(barber.business_name);
    
    const { error: updateError } = await supabase
      .from('barber_profiles')
      .update({ 
        slug: newSlug,
        updated_at: new Date().toISOString()
      })
      .eq('id', barberId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, newSlug };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};