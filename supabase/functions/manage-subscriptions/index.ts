import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log('Running subscription management cron job...');

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
      console.error('MercadoPago credentials not configured');
      throw new Error('MercadoPago credentials not configured');
    }

    // 1. Check subscriptions with Mercado Pago Preapprovals
    console.log('Checking Mercado Pago Preapproval statuses...');
    
    const { data: preapprovalSubscriptions, error: preapprovalError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .not('mercadopago_subscription_id', 'is', null);

    if (!preapprovalError && preapprovalSubscriptions) {
      console.log(`Found ${preapprovalSubscriptions.length} subscriptions with Preapprovals`);
      
      for (const sub of preapprovalSubscriptions) {
        try {
          // Verify preapproval status in Mercado Pago
          const preapprovalResponse = await fetch(
            `https://api.mercadopago.com/preapproval/${sub.mercadopago_subscription_id}`,
            {
              headers: {
                'Authorization': `Bearer ${mercadopagoToken}`,
              }
            }
          );

          if (preapprovalResponse.ok) {
            const preapproval = await preapprovalResponse.json();
            
            // If preapproval is cancelled, update our subscription
            if (preapproval.status === 'cancelled' || preapproval.status === 'paused') {
              console.log(`⚠️ Preapproval ${sub.mercadopago_subscription_id} is ${preapproval.status}`);
              
              await supabase
                .from('subscriptions')
                .update({
                  status: 'cancelled',
                  updated_at: new Date().toISOString()
                })
                .eq('id', sub.id);

              await supabase
                .from('tenants')
                .update({ plan: 'free' })
                .eq('id', sub.tenant_id);
            }
          }
        } catch (error) {
          console.error(`Error checking preapproval ${sub.mercadopago_subscription_id}:`, error);
        }
      }
    }

    // 2. Process legacy subscriptions (without preapproval_id) - manual billing
    const today = new Date();
    const { data: legacySubscriptions, error: legacyError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .is('mercadopago_subscription_id', null)
      .lte('next_billing_date', today.toISOString());

    if (legacyError) {
      console.error('Error fetching legacy subscriptions:', legacyError);
    } else {
      console.log(`Found ${legacySubscriptions?.length || 0} legacy subscriptions (manual billing needed)`);
      
      // For legacy subscriptions, mark them as past_due and notify admin
      for (const subscription of legacySubscriptions || []) {
        console.log(`⚠️ Legacy subscription ${subscription.id} needs manual billing`);
        
        await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        // TODO: Send notification to admin or user about manual payment needed
      }
    }

    // 3. Process cancellations after 72 hours
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 72);

    const { data: expiredCancellations, error: cancellationError } = await supabase
      .from('cancellation_requests')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_deletion_at', new Date().toISOString());

    if (cancellationError) {
      console.error('Error fetching expired cancellations:', cancellationError);
    } else {
      console.log(`Found ${expiredCancellations?.length || 0} cancellations to process`);

      for (const cancellation of expiredCancellations || []) {
        try {
          console.log(`Processing cancellation for tenant ${cancellation.tenant_id}`);

          // Cancel subscription
          await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('tenant_id', cancellation.tenant_id);

          // Update tenant to free plan
          await supabase
            .from('tenants')
            .update({
              plan: 'free',
              updated_at: new Date().toISOString()
            })
            .eq('id', cancellation.tenant_id);

          // Mark cancellation as completed
          await supabase
            .from('cancellation_requests')
            .update({
              status: 'completed',
              can_revert: false
            })
            .eq('id', cancellation.id);

          console.log(`Completed cancellation for tenant ${cancellation.tenant_id}`);

        } catch (error) {
          console.error(`Error processing cancellation ${cancellation.id}:`, error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkedPreapprovals: preapprovalSubscriptions?.length || 0,
        legacySubscriptions: legacySubscriptions?.length || 0,
        processedCancellations: expiredCancellations?.length || 0,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in subscription management:', error);
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