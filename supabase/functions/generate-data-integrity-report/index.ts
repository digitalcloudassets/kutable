import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, withCors, handlePreflight } from '../_shared/cors.ts'

const headers = corsHeaders(['POST', 'OPTIONS'])

export interface DataIntegrityReport {
  clientProfilesWithoutUserId: number;
  barberProfilesWithoutUserId: number;
  orphanedBookings: number;
  duplicateProfiles: number;
  repairsSuggested: string[];
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req, headers);
  if (preflight) return preflight;

  const cors = withCors(req, headers);
  if (!cors.ok) return cors.res;

  const json = (status: number, data: any) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors.headers, 'Content-Type': 'application/json' }
    })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return json(500, {
        success: false,
        error: 'Missing required environment variables'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const report: DataIntegrityReport = {
      clientProfilesWithoutUserId: 0,
      barberProfilesWithoutUserId: 0,
      orphanedBookings: 0,
      duplicateProfiles: 0,
      repairsSuggested: []
    };

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

    return json(200, {
      success: true,
      report
    });

  } catch (error) {
    console.error('Error generating data integrity report:', error);
    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate report'
    });
  }
})