import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MercadoPagoConfig, PreApproval } from "npm:mercadopago@2.0.15";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpgradeRequest {
  plan_id: string;
  billing_cycle: 'monthly' | 'annual';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('No autorizado');
    }

    const { plan_id, billing_cycle }: UpgradeRequest = await req.json();

    console.log('Processing upgrade:', { user_id: user.id, plan_id, billing_cycle });

    // Get user's tenant - check both tenant_admin and superadmin roles
    const { data: userRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('tenant_id, role')
      .eq('user_id', user.id);

    if (roleError) {
      console.error('Error fetching user roles:', roleError);
      throw new Error('No se pudo obtener los roles del usuario');
    }

    if (!userRoles || userRoles.length === 0) {
      throw new Error('No se encontró ningún rol para el usuario');
    }

    // Find tenant_admin role first
    let userRole = userRoles.find(r => r.role === 'tenant_admin');
    
    // If no tenant_admin role, check if superadmin exists
    if (!userRole) {
      const superAdminRole = userRoles.find(r => r.role === 'superadmin');
      if (superAdminRole) {
        throw new Error('Los superadmins no pueden comprar planes. Por favor, usa una cuenta de tenant.');
      }
      throw new Error('No se encontró el tenant del usuario');
    }

    const tenantId = userRole.tenant_id;
    
    if (!tenantId) {
      throw new Error('El rol de tenant_admin no tiene un tenant_id asociado');
    }

    console.log('Tenant found:', { tenantId });

    // Get tenant data
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('plan')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new Error('No se encontró el tenant');
    }

    // Check if already on a paid plan
    if (tenant.plan !== 'free') {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Ya tienes un plan activo. Por favor cancela tu plan actual primero.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get pricing configuration using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: pricingSettings, error: pricingError } = await supabaseAdmin
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'membership_pricing')
      .single();

    if (pricingError) {
      throw new Error('No se pudo obtener la configuración de precios');
    }

    const pricing = pricingSettings.setting_value.plans;
    const planConfig = pricing[plan_id];

    if (!planConfig) {
      console.error('Plan not found:', { plan_id, availablePlans: Object.keys(pricing) });
      throw new Error('Plan no encontrado');
    }

    console.log('Plan config retrieved:', { plan_id, price_mxn: planConfig.price_mxn });

    // Get MercadoPago access token from environment (secret)
    const mercadoPagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    
    if (!mercadoPagoAccessToken) {
      console.error('MERCADOPAGO_ACCESS_TOKEN secret not found');
      throw new Error('No se encontró el token de MercadoPago. Contacta al administrador.');
    }

    console.log('MercadoPago token retrieved from secrets');

    // Create MercadoPago subscription using SDK
    const client = new MercadoPagoConfig({ 
      accessToken: mercadoPagoAccessToken,
      options: { timeout: 5000 }
    });
    const preapprovalClient = new PreApproval(client);

    console.log('Creating MercadoPago subscription');

    const mpData = await preapprovalClient.create({
      body: {
        reason: `Plan Pro Toogo - ${billing_cycle === 'monthly' ? 'Mensual' : 'Anual'}`,
        auto_recurring: {
          frequency: billing_cycle === 'monthly' ? 1 : 12,
          frequency_type: 'months',
          transaction_amount: planConfig.price_mxn,
          currency_id: 'MXN'
        },
        back_url: `${Deno.env.get('SUPABASE_URL')}/dashboard/plan`,
        notification_url: 'https://herqxhfmsstbteahhxpr.supabase.co/functions/v1/mercadopago-webhook',
        payer_email: user.email
      }
    });
    console.log('MercadoPago subscription created:', mpData.id);

    // NOTE: DO NOT create subscription record here!
    // The subscription record will be created by the mercadopago-webhook
    // only after the payment is confirmed by MercadoPago.
    // This prevents phantom subscriptions without actual payment.
    console.log('MercadoPago subscription created, waiting for payment confirmation via webhook');

    // Return payment URL
    return new Response(
      JSON.stringify({
        ok: true,
        payment_url: mpData.init_point,
        subscription_id: mpData.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in process-plan-upgrade:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || 'Error al procesar el upgrade'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
