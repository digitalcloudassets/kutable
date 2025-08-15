// Data repair utilities to fix user_id linkage issues
import { supabase } from '../lib/supabase';

export interface DataIntegrityReport {
  clientProfilesWithoutUserId: number;
  barberProfilesWithoutUserId: number;
  orphanedBookings: number;
  duplicateProfiles: number;
  repairsSuggested: string[];
}

export async function generateDataIntegrityReport(): Promise<DataIntegrityReport> {
  const report: DataIntegrityReport = {
    clientProfilesWithoutUserId: 0,
    barberProfilesWithoutUserId: 0,
    orphanedBookings: 0,
    duplicateProfiles: 0,
    repairsSuggested: []
  };

  try {
    // Check client profiles without user_id
    const { count: clientsWithoutUserId } = await supabase
      .from('client_profiles')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null);
    
    report.clientProfilesWithoutUserId = clientsWithoutUserId || 0;
    
    if (report.clientProfilesWithoutUserId > 0) {
      report.repairsSuggested.push(`${report.clientProfilesWithoutUserId} client profiles missing user_id - can be linked by email`);
    }

    // Check barber profiles without user_id
    const { count: barbersWithoutUserId } = await supabase
      .from('barber_profiles')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null);
    
    report.barberProfilesWithoutUserId = barbersWithoutUserId || 0;
    
    if (report.barberProfilesWithoutUserId > 0) {
      report.repairsSuggested.push(`${report.barberProfilesWithoutUserId} barber profiles missing user_id - can be linked by email`);
    }

    // Check for duplicate email addresses
    const { data: duplicateEmails } = await supabase
      .from('client_profiles')
      .select('email')
      .not('email', 'is', null);
    
    if (duplicateEmails) {
      const emailCounts = duplicateEmails.reduce((acc: Record<string, number>, profile) => {
        if (profile.email) {
          acc[profile.email] = (acc[profile.email] || 0) + 1;
        }
        return acc;
      }, {});
      
      const duplicates = Object.values(emailCounts).filter(count => count > 1).length;
      report.duplicateProfiles = duplicates;
      
      if (duplicates > 0) {
        report.repairsSuggested.push(`${duplicates} duplicate email addresses found - may cause login confusion`);
      }
    }

  } catch (error) {
    console.error('Error generating data integrity report:', error);
    report.repairsSuggested.push('Error checking data integrity - manual review needed');
  }

  return report;
}

export async function repairUserIdLinkage(email: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log(`[DataRepair] Starting user_id linkage repair for email: ${email}`);

    // Step 1: Find the auth user by email
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!authUser) {
      return {
        success: false,
        message: `No auth user found with email: ${email}`
      };
    }

    console.log(`[DataRepair] Found auth user:`, { id: authUser.id, email: authUser.email });

    // Step 2: Check for client profiles with this email but missing user_id
    const { data: clientProfiles, error: clientError } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('email', email);

    if (clientError) {
      throw new Error(`Failed to fetch client profiles: ${clientError.message}`);
    }

    // Step 3: Check for barber profiles with this email but missing user_id  
    const { data: barberProfiles, error: barberError } = await supabase
      .from('barber_profiles')
      .select('*')
      .eq('email', email);

    if (barberError) {
      throw new Error(`Failed to fetch barber profiles: ${barberError.message}`);
    }

    const repairs = [];

    // Repair client profiles
    for (const profile of clientProfiles || []) {
      if (!profile.user_id || profile.user_id !== authUser.id) {
        console.log(`[DataRepair] Fixing client profile user_id:`, {
          profileId: profile.id,
          currentUserId: profile.user_id,
          correctUserId: authUser.id
        });

        const { error: updateError } = await supabase
          .from('client_profiles')
          .update({ 
            user_id: authUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`[DataRepair] Failed to update client profile ${profile.id}:`, updateError);
        } else {
          repairs.push(`Updated client profile: ${profile.first_name} ${profile.last_name}`);
        }
      }
    }

    // Repair barber profiles
    for (const profile of barberProfiles || []) {
      if (!profile.user_id || profile.user_id !== authUser.id) {
        console.log(`[DataRepair] Fixing barber profile user_id:`, {
          profileId: profile.id,
          businessName: profile.business_name,
          currentUserId: profile.user_id,
          correctUserId: authUser.id
        });

        const { error: updateError } = await supabase
          .from('barber_profiles')
          .update({ 
            user_id: authUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`[DataRepair] Failed to update barber profile ${profile.id}:`, updateError);
        } else {
          repairs.push(`Updated barber profile: ${profile.business_name}`);
        }
      }
    }

    return {
      success: true,
      message: `Repair completed. ${repairs.length} profiles updated.`,
      details: {
        authUserId: authUser.id,
        repairsApplied: repairs,
        clientProfilesFound: clientProfiles?.length || 0,
        barberProfilesFound: barberProfiles?.length || 0
      }
    };

  } catch (error) {
    console.error('[DataRepair] Repair failed:', error);
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
    // Find auth user
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;
    
    const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // Find client profiles
    const { data: clientProfiles, error: clientError } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('email', email);

    if (clientError) throw clientError;

    // Find barber profiles
    const { data: barberProfiles, error: barberError } = await supabase
      .from('barber_profiles')
      .select('*')
      .eq('email', email);

    if (barberError) throw barberError;

    return {
      authUser: authUser || null,
      clientProfiles: clientProfiles || [],
      barberProfiles: barberProfiles || []
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