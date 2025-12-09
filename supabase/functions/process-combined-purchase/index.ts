import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MercadoPagoConfig, Preference } from "npm:mercadopago@2.0.15";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CombinedPurchaseRequest {
  domain: string;
  tenantName: string;
  planType?: 'monthly' | 'annual'; // New field for plan selection
  autoRenewDomain?: boolean;
  returnUrlBase?: string; // Optional base URL for return URLs
  userInfo: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { domain, tenantName, planType = 'monthly', autoRenewDomain = false, userInfo, returnUrlBase }: CombinedPurchaseRequest = await req.json();

    console.log('Processing combined purchase:', { domain, tenantName, planType, autoRenewDomain });

    // 1. Check domain availability and get pricing
    const domainResponse = await supabase.functions.invoke('openprovider-domains', {
      body: {
        action: 'check-availability',
        domain: domain
      }
    });

    if (domainResponse.error || !domainResponse.data?.available) {
      throw new Error('Domain not available or error checking availability');
    }

    let domainPriceMXN = domainResponse.data.price_mxn;
    
    // Apply free domain for annual plans
    if (planType === 'annual') {
      domainPriceMXN = 0;
    }
    
    // 2. Get plan pricing from system settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'membership_pricing')
      .single();

    let proPlanPriceMXN = 299; // Default monthly price
    if (!settingsError && settingsData?.setting_value?.plans) {
      const plans = settingsData.setting_value.plans;
      if (planType === 'annual' && plans.pro_annual) {
        proPlanPriceMXN = plans.pro_annual.price_mxn;
      } else if (planType === 'monthly' && plans.pro_monthly) {
        proPlanPriceMXN = plans.pro_monthly.price_mxn;
      }
    }

    const totalPriceMXN = domainPriceMXN + proPlanPriceMXN;

    console.log('Pricing breakdown:', {
      domainPriceMXN,
      proPlanPriceMXN,
      planType,
      totalPriceMXN
    });

    // 3. Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // 4. Get MercadoPago credentials from environment only
    const mercadopagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!mercadopagoToken) {
      throw new Error('MercadoPago credentials not configured');
    }

    // 5. Resolve return URLs and create MercadoPago preference for combined payment
    const originHeader = req.headers.get('origin') || undefined;
    const returnBase = (returnUrlBase && returnUrlBase.trim()) || originHeader || 'http://localhost:3000';

    const planTitle = planType === 'annual' 
      ? 'Plan Pro - Primer año (2 meses gratis)' 
      : 'Plan Pro - Primer mes';

    // Create MercadoPago preference using SDK
    const client = new MercadoPagoConfig({ 
      accessToken: mercadopagoToken,
      options: { timeout: 5000 }
    });
    const preferenceClient = new Preference(client);

    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            title: `Dominio ${domain}`,
            quantity: 1,
            unit_price: domainPriceMXN,
            currency_id: 'MXN'
          },
          {
            title: planTitle,
            quantity: 1,
            unit_price: proPlanPriceMXN,
            currency_id: 'MXN'
          }
        ],
        payer: {
          email: userInfo.email,
          name: userInfo.firstName,
          surname: userInfo.lastName,
          phone: userInfo.phone ? { number: userInfo.phone } : undefined
        },
        external_reference: `combined_${user.id}_${Date.now()}`,
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
        back_urls: {
          success: `${returnBase}/payment-success`,
          failure: `${returnBase}/payment-error`,
          pending: `${returnBase}/payment-pending`
        },
        auto_return: 'approved',
        metadata: {
          domain,
          tenantName,
          planType,
          autoRenewDomain: autoRenewDomain.toString(),
          userId: user.id,
          userEmail: userInfo.email,
          type: 'combined_purchase'
        }
      }
    });

    console.log('MercadoPago preference created:', preference.id);

    // 6. Create detailed breakdown for frontend
    const breakdown = {
      domain: {
        name: domain,
        price: domainPriceMXN,
        description: domainPriceMXN === 0 
          ? `Dominio ${domain} (primer año - GRATIS con plan anual)` 
          : `Dominio ${domain} (primer año)`
      },
      plan: {
        name: planType === 'annual' ? 'Plan Pro Anual' : 'Plan Pro Mensual',
        price: proPlanPriceMXN,
        description: planType === 'annual' 
          ? 'Plan Pro Anual - 2 meses gratis (facturación automática con Mercado Pago)' 
          : 'Plan Pro Mensual (facturación automática con Mercado Pago)',
        billing_cycle: planType,
        auto_billing: true
      },
      total: {
        price: totalPriceMXN,
        description: 'Total a pagar hoy'
      },
      savings: planType === 'annual' ? {
        monthly_equivalent: Math.round(proPlanPriceMXN / 12),
        savings_amount: (299 * 12) - proPlanPriceMXN,
        savings_description: '2 meses gratis'
      } : null
    };

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: preference.init_point,
        preferenceId: preference.id,
        breakdown: breakdown
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in combined purchase:', error);
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
