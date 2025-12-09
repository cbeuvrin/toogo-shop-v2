import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MercadoPagoConfig, PreApproval } from "npm:mercadopago@2.0.15";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Creating retroactive preapprovals for existing subscriptions...');

    // Get MercadoPago credentials from system settings
    const { data: mpSettings, error: mpError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'membership_payment_config')
      .single();

    let mercadopagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mpError && mpSettings?.setting_value?.mercadopago?.access_token) {
      mercadopagoToken = mpSettings.setting_value.mercadopago.access_token;
    }

    if (!mercadopagoToken) {
      throw new Error('MercadoPago credentials not configured');
    }

    // Get subscriptions without mercadopago_subscription_id
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        tenants (
          id,
          name,
          owner_user_id
        )
      `)
      .is('mercadopago_subscription_id', null)
      .eq('status', 'active');

    if (subsError) throw subsError;

    console.log(`Found ${subscriptions?.length || 0} subscriptions without Preapprovals`);

    const results = [];

    for (const subscription of subscriptions || []) {
      try {
        console.log(`Processing subscription ${subscription.id} for tenant ${subscription.tenants?.name}`);

        // Get owner email
        const { data: userData } = await supabase.auth.admin.getUserById(
          subscription.tenants?.owner_user_id
        );

        if (!userData?.user?.email) {
          console.error(`No email found for tenant ${subscription.tenants?.name}`);
          results.push({
            subscription_id: subscription.id,
            tenant_name: subscription.tenants?.name,
            success: false,
            error: 'No owner email found'
          });
          continue;
        }

        const ownerEmail = userData.user.email;

        // Create Preapproval in MercadoPago using SDK
        const client = new MercadoPagoConfig({ 
          accessToken: mercadopagoToken,
          options: { timeout: 5000 }
        });
        const preapprovalClient = new PreApproval(client);

        console.log('Creating Preapproval in MercadoPago');

        const preapproval = await preapprovalClient.create({
          body: {
            reason: `Plan Pro Mensual - ${subscription.tenants?.name}`,
            auto_recurring: {
              frequency: 1,
              frequency_type: 'months',
              transaction_amount: subscription.amount_mxn || 299,
              currency_id: 'MXN'
            },
            payer_email: ownerEmail,
            external_reference: `tenant_${subscription.tenant_id}_subscription`,
            back_url: 'https://toogo.store/dashboard',
            notification_url: 'https://herqxhfmsstbteahhxpr.supabase.co/functions/v1/mercadopago-webhook',
            status: 'pending'
          }
        });
        console.log('Preapproval created:', preapproval.id);

        // Update subscription with preapproval_id
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            mercadopago_subscription_id: preapproval.id,
            status: 'pending', // Will become 'active' when user authorizes
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        if (updateError) throw updateError;

        results.push({
          subscription_id: subscription.id,
          tenant_name: subscription.tenants?.name,
          success: true,
          preapproval_id: preapproval.id,
          init_point: preapproval.init_point,
          owner_email: ownerEmail,
          message: 'Preapproval created successfully. User needs to authorize at init_point URL.'
        });

        console.log(`✅ Preapproval created for ${subscription.tenants?.name}`);
        console.log(`📧 User ${ownerEmail} needs to authorize at: ${preapproval.init_point}`);

      } catch (error) {
        console.error(`Error processing subscription ${subscription.id}:`, error);
        results.push({
          subscription_id: subscription.id,
          tenant_name: subscription.tenants?.name,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Retroactive preapprovals processed',
        total: subscriptions?.length || 0,
        results
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in create-retroactive-preapprovals:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500
      }
    );
  }
});
