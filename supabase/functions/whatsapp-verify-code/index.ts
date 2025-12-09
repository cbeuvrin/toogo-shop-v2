import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, tenantId, code } = await req.json();

    if (!phoneNumber || !tenantId || !code) {
      return new Response(
        JSON.stringify({ error: 'phoneNumber, tenantId, and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[whatsapp-verify-code] Verifying code for:', phoneNumber);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the whatsapp_user record
    const { data: whatsappUser, error: fetchError } = await supabase
      .from('whatsapp_users')
      .select('verification_code, verification_expires_at, is_verified')
      .eq('phone_number', phoneNumber)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !whatsappUser) {
      console.error('[whatsapp-verify-code] User not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Phone number not registered' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already verified
    if (whatsappUser.is_verified) {
      return new Response(
        JSON.stringify({ success: true, message: 'Already verified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code matches
    if (whatsappUser.verification_code !== code) {
      console.log('[whatsapp-verify-code] Code mismatch');
      return new Response(
        JSON.stringify({ error: 'Invalid verification code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code is expired
    const expiresAt = new Date(whatsappUser.verification_expires_at);
    if (expiresAt < new Date()) {
      console.log('[whatsapp-verify-code] Code expired');
      return new Response(
        JSON.stringify({ error: 'Verification code has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as verified and clear the code
    const { error: updateError } = await supabase
      .from('whatsapp_users')
      .update({
        is_verified: true,
        verification_code: null,
        verification_expires_at: null,
      })
      .eq('phone_number', phoneNumber)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('[whatsapp-verify-code] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify phone number' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[whatsapp-verify-code] Phone verified successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Phone number verified successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[whatsapp-verify-code] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
