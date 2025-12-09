import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentConfigRequest {
  action: 'get' | 'set';
  provider?: 'mercadopago' | 'paypal' | 'stripe';
  credentials?: {
    accessToken?: string;
    clientSecret?: string;
    secretKey?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for secret management
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Get user's tenant
    const { data: tenantData, error: tenantError } = await supabaseClient.rpc('get_user_tenant', {
      _user_id: user.id
    });
    if (tenantError) throw new Error(`Failed to get user tenant: ${tenantError.message}`);
    
    const tenantId = tenantData;
    if (!tenantId) throw new Error("User has no tenant");

    // Verify user has tenant admin role
    const { data: hasRole, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'tenant_admin',
      _tenant_id: tenantId
    });
    if (roleError || !hasRole) {
      throw new Error("Insufficient permissions - tenant admin required");
    }

    const { action, provider, credentials }: PaymentConfigRequest = await req.json();

    if (action === 'get') {
      // Return configuration status (without sensitive data)
      const { data: settings, error: settingsError } = await supabaseClient
        .from('tenant_settings')
        .select('mercadopago_public_key, paypal_client_id, whatsapp_number, whatsapp_message')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (settingsError) {
        console.error('Error fetching tenant settings:', settingsError);
        throw new Error(`Failed to get settings: ${settingsError.message}`);
      }

      // If no settings exist, create default settings
      if (!settings) {
        console.log(`Creating default settings for tenant: ${tenantId}`);
        const { data: newSettings, error: createError } = await supabaseClient
          .from('tenant_settings')
          .insert({
            tenant_id: tenantId,
            mercadopago_public_key: null,
            paypal_client_id: null,
            whatsapp_number: null,
            whatsapp_message: 'Hola! Me interesa este producto: {product_name}. Precio: {price}. Mi información de contacto: {customer_name} - {customer_phone}'
          })
          .select('mercadopago_public_key, paypal_client_id, whatsapp_number, whatsapp_message')
          .single();

        if (createError) {
          console.error('Error creating default settings:', createError);
          // Continue with empty settings if creation fails
        } else {
          console.log('Default settings created successfully');
        }
      }

      // Check which providers have secrets configured
      const secretNames = [
        `tenant_${tenantId}_mercadopago_access_token`,
        `tenant_${tenantId}_paypal_client_secret`,
        `tenant_${tenantId}_stripe_secret_key`
      ];

      const configStatus = {
        whatsapp: {
          enabled: !!settings?.whatsapp_number,
          number: settings?.whatsapp_number || '',
          message: settings?.whatsapp_message || 'Hola! Me interesa este producto: {product_name}. Precio: {price}. Mi información de contacto: {customer_name} - {customer_phone}'
        },
        mercadopago: {
          enabled: !!settings?.mercadopago_public_key,
          publicKey: settings?.mercadopago_public_key || '',
          hasAccessToken: false // We can't check secret existence from edge functions
        },
        paypal: {
          enabled: !!settings?.paypal_client_id,
          clientId: settings?.paypal_client_id || '',
          hasClientSecret: false
        },
        stripe: {
          enabled: false, // Not stored in tenant_settings yet
          publicKey: '',
          hasSecretKey: false
        }
      };

      return new Response(JSON.stringify(configStatus), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === 'set' && provider && credentials) {
      // Store sensitive credentials as secrets and update public settings
      const secretName = `tenant_${tenantId}_${provider}_${
        provider === 'mercadopago' ? 'access_token' :
        provider === 'paypal' ? 'client_secret' :
        'secret_key'
      }`;

      // Note: We can't directly set secrets from edge functions
      // This would need to be handled by a separate admin function
      // For now, we'll return instructions for manual setup
      
      return new Response(JSON.stringify({
        success: false,
        message: "Secret storage from edge functions is not yet implemented. Please configure secrets manually in the Supabase dashboard.",
        secretName,
        instructions: `Please add the secret '${secretName}' in your Supabase project settings.`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Invalid action or missing parameters");

  } catch (error) {
    console.error("Error in manage-payment-config:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});