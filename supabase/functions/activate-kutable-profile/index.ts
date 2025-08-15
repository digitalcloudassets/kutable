import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, withCors, handlePreflight } from "../_shared/cors.ts";

const headers = corsHeaders(["POST", "OPTIONS"]);

Deno.serve(async (req) => {
  const preflight = handlePreflight(req, headers);
  if (preflight) return preflight;

  const cors = withCors(req, headers);
  if (!cors.ok) return cors.res;

  const json = (status: number, data: any) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors.headers, "Content-Type": "application/json" }
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Kutable Barber Profile ID
    const kutableBarberId = "e639f78f-abea-4a27-b995-f31032e25ab5";

    // First, verify the profile exists and get current status
    const { data: currentProfile, error: fetchError } = await supabase
      .from("barber_profiles")
      .select("id, business_name, owner_name, is_active, status")
      .eq("id", kutableBarberId)
      .single();

    if (fetchError) {
      throw new Error(`Profile not found: ${fetchError.message}`);
    }

    console.log("Current profile status:", {
      id: currentProfile.id,
      business_name: currentProfile.business_name,
      owner_name: currentProfile.owner_name,
      is_active: currentProfile.is_active,
      status: currentProfile.status
    });

    // Only update the specific fields needed for activation
    const { error } = await supabase
      .from("barber_profiles")
      .update({
        is_active: true,
        status: "active"
      })
      .eq("id", kutableBarberId);

    if (error) {
      throw new Error(`Failed to activate Kutable barber profile: ${error.message}`);
    }

    console.log("✅ Kutable barber profile activated successfully");

    return json(200, {
      success: true,
      message: "✅ Kutable barber profile is now active and publicly visible on the main site.",
      profile: {
        id: kutableBarberId,
        business_name: currentProfile.business_name,
        owner_name: currentProfile.owner_name,
        previous_status: {
          is_active: currentProfile.is_active,
          status: currentProfile.status
        },
        new_status: {
          is_active: true,
          status: "active"
        }
      }
    });

  } catch (error) {
    console.error("Error activating Kutable profile:", error);
    
    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : "Failed to activate profile"
    });
  }
});