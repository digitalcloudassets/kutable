// Data repair utilities to fix user_id linkage issues
import { supabase } from '../lib/supabase';

// Re-export interface from Edge Function
export interface DataIntegrityReport {
  clientProfilesWithoutUserId: number;
  barberProfilesWithoutUserId: number;
  orphanedBookings: number;
  duplicateProfiles: number;
  repairsSuggested: string[];
}

export async function generateDataIntegrityReport(): Promise<DataIntegrityReport> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-data-integrity-report', {
      body: {}
    });

    if (error) {
      throw new Error(error.message || 'Failed to generate report');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Report generation failed');
    }

    return data.report;
  } catch (error) {
    console.error('Error generating data integrity report:', error);
    // Return default report on error
    return {
      clientProfilesWithoutUserId: 0,
      barberProfilesWithoutUserId: 0,
      orphanedBookings: 0,
      duplicateProfiles: 0,
      repairsSuggested: ['Error checking data integrity - manual review needed']
    };
  }
}

export async function repairUserIdLinkage(email: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('repair-data-integrity', {
      body: { email }
    });

    if (error) {
      throw new Error(error.message || 'Failed to repair data');
    }

    if (!data?.success) {
      return {
        success: false,
        message: data?.message || 'Repair failed'
      };
    }

    return {
      success: data.success,
      message: data.message,
      details: data.details
    };

  } catch (error) {
    console.error('Error in repairUserIdLinkage:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Repair failed with unknown error'
    };
  }
}

export async function findProfilesByEmail(email: string): Promise<{
  authUser: any;
  clientProfiles: any[];
  barberProfiles: any[];
}> {
  try {
    const { data, error } = await supabase.functions.invoke('find-profiles-by-email', {
      body: { email }
    });

    if (error) {
      throw new Error(error.message || 'Failed to find profiles');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Profile search failed');
    }

    return {
      authUser: data.authUser || null,
      clientProfiles: data.clientProfiles || [],
      barberProfiles: data.barberProfiles || []
    };
  } catch (error) {
    console.error('Error finding profiles by email:', error);
    return {
      authUser: null,
      clientProfiles: [],
      barberProfiles: []
    };
  }
}