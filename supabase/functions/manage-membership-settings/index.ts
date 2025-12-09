import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-MEMBERSHIP-SETTINGS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Use service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { method } = req;
    let body = null;
    
    if (method !== 'GET') {
      try {
        const text = await req.text();
        if (text && text.trim() !== '') {
          body = JSON.parse(text);
        }
      } catch (e) {
        logStep("No valid JSON body provided for non-GET request");
      }
    }

    // Check if user is superadmin
    const { data: isSuperAdmin, error: roleError } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'superadmin' });
    
    if (roleError) {
      console.error("Error checking superadmin role:", roleError);
    }
    
    const userIsSuperAdmin = !roleError && isSuperAdmin === true;
    if (userIsSuperAdmin) {
      logStep("Superadmin access confirmed");
    }

    switch (method) {
      case 'GET': {
        // Public read: only return pricing for non-superadmins
        const { data: settings, error } = await supabaseClient
          .from('system_settings')
          .select('*')
          .in('setting_key', ['membership_pricing', 'membership_payment_config']);

        if (error) throw error;

        const pricing = settings.find(s => s.setting_key === 'membership_pricing')?.setting_value || {};
        
        if (userIsSuperAdmin) {
          const paymentConfig = settings.find(s => s.setting_key === 'membership_payment_config')?.setting_value || {};
          logStep("Settings retrieved successfully (superadmin)");
          return new Response(JSON.stringify({ pricing, paymentConfig }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } else {
          logStep("Pricing retrieved successfully (public)");
          return new Response(JSON.stringify({ pricing }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }

      case 'POST': {
        // Handle action for getting public payment config (authenticated users)
        if (body && body.action === 'get_public_payment_config') {
          logStep("Getting public payment config", { userId: user.id });
          
          const { data: settings, error } = await supabaseClient
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'membership_payment_config')
            .maybeSingle();

          if (error) throw error;

          const paymentConfig = settings?.setting_value || {};
          
          // Return only public keys (never secrets)
          const publicConfig: any = {};
          
          if (paymentConfig.mercadopago?.enabled) {
            const publicKey = Deno.env.get('MERCADOPAGO_PUBLIC_KEY');
            publicConfig.mercadopago = {
              enabled: true,
              public_key: publicKey || ''
            };
            logStep("Retrieved MercadoPago public key for authenticated user");
          }
          
          if (paymentConfig.paypal?.enabled) {
            publicConfig.paypal = {
              enabled: true,
              client_id: paymentConfig.paypal.client_id || ''
            };
          }

          return new Response(JSON.stringify(publicConfig), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
        
        // Handle special action for getting payment config with secrets (superadmin only)
        if (body && body.action === 'get_payment_config') {
          if (!userIsSuperAdmin) {
            throw new Error("Access denied. Superadmin role required for payment config.");
          }
          
          logStep("Getting payment config with secrets");
          
          const { data: settings, error } = await supabaseClient
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'membership_payment_config')
            .maybeSingle();

          if (error) throw error;

          const paymentConfig = settings?.setting_value || {};
          
          if (paymentConfig.mercadopago && paymentConfig.mercadopago.public_key === '[STORED_AS_SECRET]') {
            try {
              const publicKey = Deno.env.get('MERCADOPAGO_PUBLIC_KEY');
              if (publicKey) {
                paymentConfig.mercadopago.public_key = publicKey;
                logStep("Retrieved MercadoPago public key from secrets");
              }
            } catch (secretError) {
              console.error('Error retrieving MercadoPago public key:', secretError);
            }
          }

          return new Response(JSON.stringify(paymentConfig), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
        
        // If no body or no type, treat as read operation (public)
        if (!body || !body.type) {
          logStep("POST request treated as read operation - no type specified");
          
          const { data: settings, error } = await supabaseClient
            .from('system_settings')
            .select('*')
            .in('setting_key', ['membership_pricing', 'membership_payment_config']);

          if (error) throw error;

          const pricing = settings.find(s => s.setting_key === 'membership_pricing')?.setting_value || {};
          
          if (userIsSuperAdmin) {
            const paymentConfig = settings.find(s => s.setting_key === 'membership_payment_config')?.setting_value || {};
            logStep("Settings retrieved successfully via POST (superadmin)");
            return new Response(JSON.stringify({ pricing, paymentConfig }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          } else {
            logStep("Pricing retrieved successfully via POST (public)");
            return new Response(JSON.stringify({ pricing }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          }
        }
        
        // Write operations require superadmin
        if (!userIsSuperAdmin) {
          throw new Error("Access denied. Superadmin role required for modifications.");
        }

        const { type, data } = body;
        
        if (!data) {
          throw new Error("Missing data in request body");
        }

        logStep("Updating settings", { type, data });

        let settingKey: string;
        if (type === 'pricing') {
          settingKey = 'membership_pricing';
        } else if (type === 'payment_config') {
          settingKey = 'membership_payment_config';
          
          // Handle MercadoPago secrets separately
          if (data.mercadopago && data.mercadopago.access_token) {
            // Store access token as Supabase secret
            const { data: secretData, error: secretError } = await supabaseClient.functions.invoke('manage-secrets', {
              body: {
                action: 'set',
                secret_name: 'MERCADOPAGO_ACCESS_TOKEN',
                secret_value: data.mercadopago.access_token
              }
            });
            
            if (secretError) {
              console.error('Error storing MercadoPago access token:', secretError);
            } else {
              logStep("MercadoPago access token stored as secret");
            }
            
            // Store public key as Supabase secret
            if (data.mercadopago.public_key) {
              const { data: pubSecretData, error: pubSecretError } = await supabaseClient.functions.invoke('manage-secrets', {
                body: {
                  action: 'set',
                  secret_name: 'MERCADOPAGO_PUBLIC_KEY',
                  secret_value: data.mercadopago.public_key
                }
              });
              
              if (pubSecretError) {
                console.error('Error storing MercadoPago public key:', pubSecretError);
              } else {
                logStep("MercadoPago public key stored as secret");
              }
            }
            
            // Don't store actual secrets in the config, just the enabled status
            data.mercadopago = {
              enabled: data.mercadopago.enabled,
              access_token: data.mercadopago.access_token ? '[STORED_AS_SECRET]' : '',
              public_key: data.mercadopago.public_key ? '[STORED_AS_SECRET]' : ''
            };
          }
        } else {
          throw new Error("Invalid setting type");
        }

        // Update or insert setting
        const { error } = await supabaseClient
          .from('system_settings')
          .upsert({
            setting_key: settingKey,
            setting_value: data,
            updated_at: new Date().toISOString()
          }, { onConflict: 'setting_key' });

        if (error) throw error;

        logStep("Settings updated successfully", { settingKey });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      default:
        throw new Error(`Method ${method} not allowed`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});