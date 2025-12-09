import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { MercadoPagoConfig, MerchantAccount } from "npm:mercadopago@2.0.15";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-PAYMENT-CREDENTIALS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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

    // Check if user is superadmin
    const { data: roleData, error: roleError } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'superadmin' });
    
    if (roleError || !roleData) {
      throw new Error("Access denied. Superadmin role required.");
    }

    const { provider, credentials } = await req.json();

    if (!provider || !credentials) {
      throw new Error("Missing provider or credentials");
    }

    logStep("Validating credentials", { provider });

    let isValid = false;
    let message = "";

    switch (provider) {
      case 'stripe': {
        const { publishableKey, secretKey } = credentials;
        
        if (!publishableKey || !secretKey) {
          throw new Error("Missing Stripe publishable key or secret key");
        }

        // Validate Stripe keys format
        if (!publishableKey.startsWith('pk_')) {
          message = "Clave pública de Stripe inválida (debe comenzar con pk_)";
          break;
        }

        if (!secretKey.startsWith('sk_')) {
          message = "Clave secreta de Stripe inválida (debe comenzar con sk_)";
          break;
        }

        // Test Stripe API connection
        try {
          const response = await fetch('https://api.stripe.com/v1/account', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${secretKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });

          if (response.ok) {
            const account = await response.json();
            isValid = true;
            message = `Conexión exitosa con cuenta Stripe: ${account.business_profile?.name || account.email}`;
            logStep("Stripe validation successful", { accountId: account.id });
          } else {
            const error = await response.json();
            message = `Error de Stripe: ${error.error?.message || 'Credenciales inválidas'}`;
            logStep("Stripe validation failed", { error });
          }
        } catch (error) {
          message = `Error conectando con Stripe: ${error.message}`;
          logStep("Stripe connection error", { error: error.message });
        }
        break;
      }

      case 'paypal': {
        const { clientId, clientSecret } = credentials;
        
        if (!clientId || !clientSecret) {
          throw new Error("Missing PayPal client ID or client secret");
        }

        // Test PayPal API connection
        try {
          const tokenResponse = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
          });

          if (tokenResponse.ok) {
            isValid = true;
            message = "Conexión exitosa con PayPal";
            logStep("PayPal validation successful");
          } else {
            const error = await tokenResponse.json();
            message = `Error de PayPal: ${error.error_description || 'Credenciales inválidas'}`;
            logStep("PayPal validation failed", { error });
          }
        } catch (error) {
          message = `Error conectando con PayPal: ${error.message}`;
          logStep("PayPal connection error", { error: error.message });
        }
        break;
      }

      case 'mercadopago': {
        const { accessToken, publicKey } = credentials;
        
        if (!accessToken || !publicKey) {
          throw new Error("Missing MercadoPago access token or public key");
        }

        // Validate MercadoPago keys format
        if (!accessToken.startsWith('APP_USR-')) {
          message = "Access Token de MercadoPago inválido (debe comenzar con APP_USR-)";
          break;
        }

        if (!publicKey.startsWith('APP_USR-')) {
          message = "Public Key de MercadoPago inválida (debe comenzar con APP_USR-)";
          break;
        }

        // Test MercadoPago API connection using SDK
        try {
          const client = new MercadoPagoConfig({ 
            accessToken: accessToken,
            options: { timeout: 5000 }
          });
          const merchantClient = new MerchantAccount(client);
          
          const userData = await merchantClient.get();
          isValid = true;
          message = `Conexión exitosa con MercadoPago: ${userData.first_name} ${userData.last_name}`;
          logStep("MercadoPago validation successful", { userId: userData.id });
        } catch (error: any) {
          message = `Error de MercadoPago: ${error.message || 'Credenciales inválidas'}`;
          logStep("MercadoPago validation failed", { error: error.message });
        }
        break;
      }

      default:
        throw new Error(`Proveedor no soportado: ${provider}`);
    }

    return new Response(JSON.stringify({ 
      valid: isValid, 
      message,
      provider 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      valid: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});