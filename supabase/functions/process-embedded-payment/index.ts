import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { MercadoPagoConfig, Payment } from "npm:mercadopago@2.0.15";

interface EmbeddedPaymentRequest {
  domain: string;
  tenantName: string;
  planType: 'monthly' | 'annual';
  domainOption?: 'keep' | 'buy' | 'transfer';
  authCode?: string;
  couponCode?: string;
  discountAmount?: number;
  appliedTo?: 'membership' | 'domain' | 'both';
  userInfo: {
    email: string;
    firstName: string;
    lastName: string;
  };
  paymentData: {
    token: string;
    payment_method_id: string;
    issuer_id?: string;
    transaction_amount: number;
    description: string;
    payer: {
      email: string;
      first_name: string;
      last_name: string;
    };
  };
}

// Utility function to round to 2 decimal places
const round2 = (n: number): number => Math.round(n * 100) / 100;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const requestData: EmbeddedPaymentRequest = await req.json();
    console.log('Processing embedded payment:', requestData);

    // Get MercadoPago access token
    const mercadopagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mercadopagoToken) {
      throw new Error('MercadoPago credentials not configured');
    }

    // Get domain and plan pricing
  const domainResponse = await supabase.functions.invoke('openprovider-domains', {
    body: { 
      action: 'check-availability',
      domain: requestData.domain 
    }
  });

    if (domainResponse.error || !domainResponse.data?.available) {
      throw new Error('Domain not available or error checking availability');
    }

    const domainPriceMXN = domainResponse.data.price_mxn || 222;

    // Get plan pricing
    const { data: pricingData, error: pricingError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'membership_pricing')
      .single();

    if (pricingError) {
      throw new Error('Failed to get pricing information');
    }

    const basicPlanPriceMXN = requestData.planType === 'annual' 
      ? (pricingData.setting_value?.plans?.basic_annual?.price_mxn || 2990)
      : (pricingData.setting_value?.plans?.basic_monthly?.price_mxn || 299);

    // Re-validate coupon on backend if provided
    let finalDiscount = 0;
    let validatedCoupon = null;
    
    if (requestData.couponCode && requestData.discountAmount && requestData.discountAmount > 0) {
      console.log('Re-validating coupon on backend:', requestData.couponCode);
      
      const couponValidation = await supabase.functions.invoke('validate-coupon', {
        body: {
          code: requestData.couponCode,
          userId: user.id,
          applicableTo: requestData.appliedTo || 'membership',
          amount: basicPlanPriceMXN
        }
      });

      if (!couponValidation.error && couponValidation.data?.isValid) {
        validatedCoupon = couponValidation.data.coupon;
        finalDiscount = round2(couponValidation.data.discountAmount);
        console.log('Coupon validated successfully on backend:', { 
          code: requestData.couponCode, 
          discount: finalDiscount 
        });
      } else {
        console.warn('Coupon validation failed on backend:', couponValidation.error);
        // Continue without discount if validation fails
      }
    }

    // Calculate final amounts with discount applied only to membership - ROUND ALL VALUES
    const planAfterDiscount = round2(Math.max(0, basicPlanPriceMXN - finalDiscount));
    const totalPriceMXN = round2(domainPriceMXN + planAfterDiscount);

    console.log('Payment breakdown (rounded):', { 
      domainPriceMXN, 
      basicPlanPriceMXN, 
      finalDiscount,
      planAfterDiscount,
      totalPriceMXN,
      transaction_amount_type: typeof totalPriceMXN
    });

    // Create payment with MercadoPago - ensure 2 decimal precision
    const paymentPayload: any = {
      transaction_amount: Number(totalPriceMXN.toFixed(2)), // Strict 2 decimals
      token: requestData.paymentData.token,
      description: requestData.paymentData.description,
      payment_method_id: requestData.paymentData.payment_method_id,
      installments: 1,
      payer: requestData.paymentData.payer,
      external_reference: `embedded_${user.id}_${Date.now()}`,
      metadata: {
        domain: requestData.domain,
        tenant_name: requestData.tenantName,
        plan_type: requestData.planType,
        user_id: user.id,
        payment_type: 'combined_purchase',
        coupon_code: requestData.couponCode || null,
        discount_applied: finalDiscount
      }
    };

    // Add issuer_id only if it exists
    if (requestData.paymentData.issuer_id) {
      paymentPayload.issuer_id = requestData.paymentData.issuer_id;
    }

    console.log('Creating MercadoPago payment:', paymentPayload);

    // Create MercadoPago payment using SDK
    const client = new MercadoPagoConfig({ 
      accessToken: mercadopagoToken,
      options: { timeout: 5000 }
    });
    const paymentClient = new Payment(client);

    let paymentResult;
    try {
      paymentResult = await paymentClient.create({
        body: {
          transaction_amount: paymentPayload.transaction_amount,
          token: paymentPayload.token,
          description: paymentPayload.description,
          payment_method_id: paymentPayload.payment_method_id,
          installments: paymentPayload.installments,
          payer: paymentPayload.payer,
          external_reference: paymentPayload.external_reference,
          metadata: paymentPayload.metadata,
          ...(paymentPayload.issuer_id && { issuer_id: paymentPayload.issuer_id })
        },
        requestOptions: {
          idempotencyKey: `${user.id}_${Date.now()}`
        }
      });
      console.log('MercadoPago payment result:', paymentResult);
    } catch (error: any) {
      // Intelligent retry for code 4037 (Invalid transaction_amount)
      if (error.cause?.[0]?.code === 4037) {
        console.log('Retrying payment with recalculated transaction_amount...');
        
        // Retry with recalculated amount
        paymentResult = await paymentClient.create({
          body: {
            transaction_amount: Number(totalPriceMXN.toFixed(2)),
            token: paymentPayload.token,
            description: paymentPayload.description,
            payment_method_id: paymentPayload.payment_method_id,
            installments: paymentPayload.installments,
            payer: paymentPayload.payer,
            external_reference: paymentPayload.external_reference,
            metadata: paymentPayload.metadata,
            ...(paymentPayload.issuer_id && { issuer_id: paymentPayload.issuer_id })
          },
          requestOptions: {
            idempotencyKey: `${user.id}_${Date.now()}_retry`
          }
        });
        console.log('MercadoPago retry result:', paymentResult);
      } else {
        throw error;
      }
    }

    // If payment is approved, create the tenant and domain
    if (paymentResult.status === 'approved') {
      console.log('Payment approved, creating tenant and domain...');

      // Create tenant with purchased domain as primary_host
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: requestData.tenantName,
          primary_host: requestData.domain,
          extra_hosts: [`${requestData.tenantName}.toogo.store`],
          plan: 'basic',
          status: 'active',
          owner_user_id: user.id
        })
        .select()
        .single();

      if (tenantError) {
        console.error('Error creating tenant:', tenantError);
        throw new Error('Failed to create tenant');
      }

      // Create user role
      await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          tenant_id: newTenant.id,
          role: 'tenant_admin'
        });

      // Initialize visual_editor_data with contact info from purchase
      console.log('Initializing visual_editor_data for basic plan tenant');
      const visualEditorData = [
        {
          tenant_id: newTenant.id,
          element_type: 'contact',
          element_id: 'store_contact',
          data: {
            phone: '',
            email: requestData.userInfo.email || user.email || '',
            address: '',
            hours: 'Lunes a Viernes: 9:00 AM - 6:00 PM',
            whatsapp: '',
            facebook: '',
            instagram: ''
          }
        },
        {
          tenant_id: newTenant.id,
          element_type: 'logo',
          element_id: 'main_logo',
          data: {
            url: '',
            alt: `Logo de ${requestData.tenantName}`
          }
        },
        {
          tenant_id: newTenant.id,
          element_type: 'banner',
          element_id: 'banner_1',
          data: {
            imageUrl: '/assets/default-banner.jpg',
            sort: 0
          }
        }
      ];

      const { error: visualError } = await supabase
        .from('visual_editor_data')
        .insert(visualEditorData);

      if (visualError) {
        console.error('Error initializing visual_editor_data:', visualError);
        // Don't fail the transaction, just log the error
      } else {
        console.log('Visual editor data initialized successfully');
      }

      // Handle domain based on option
      if (requestData.domainOption === 'dns-only') {
        // User is bringing their own domain - set up DNS instructions
        console.log(`[DNS-Only] Usuario traerá su propio dominio: ${requestData.domain}`);
        
        // 1. Update tenant with dominio pendiente (no asignarlo aún)
        await supabase
          .from('tenants')
          .update({ 
            primary_host: null, // No asignarlo hasta verificar DNS
            status: 'active'
          })
          .eq('id', newTenant.id);
        
        // 2. Crear registro en domain_purchases con status 'dns_pending'
        await supabase
          .from('domain_purchases')
          .insert({
            tenant_id: newTenant.id,
            domain: requestData.domain,
            status: 'dns_pending',
            provider: 'external',
            dns_verified_bool: false,
            metadata: {
              domain_option: 'dns-only',
              user_email: requestData.userInfo.email,
              created_via: 'onboarding'
            }
          });
        
        // 3. Llamar a complete-domain-setup para agregar el dominio a Vercel
        console.log(`[DNS-Only] Configurando dominio en Vercel: ${requestData.domain}`);
        const setupResponse = await supabase.functions.invoke('complete-domain-setup', {
          body: {
            domain: requestData.domain,
            tenant_id: newTenant.id
          }
        });
        
        if (setupResponse.error) {
          console.error('[DNS-Only] Error en complete-domain-setup:', setupResponse.error);
        } else {
          console.log('[DNS-Only] Dominio agregado a Vercel:', setupResponse.data);
        }
        
        // 4. Enviar email con instrucciones DNS
        await supabase.functions.invoke('send-dns-instructions', {
          body: {
            email: requestData.userInfo.email,
            domain: requestData.domain,
            tenant_id: newTenant.id,
            tenant_name: requestData.tenantName
          }
        });
        
        console.log(`[DNS-Only] Instrucciones DNS enviadas a ${requestData.userInfo.email}`);
        
      } else if (domainPriceMXN > 0) {
        // Register or transfer domain via Openprovider
        const domainAction = requestData.domainOption === 'transfer' ? 'transfer' : 'purchase';
        
        const domainPayload: any = {
          action: domainAction,
          domain: requestData.domain,
          tenantId: newTenant.id
        };

        // Include authCode for transfers
        if (domainAction === 'transfer' && requestData.authCode) {
          domainPayload.authCode = requestData.authCode;
        }

        console.log(`Invoking openprovider-domains with action: ${domainAction}`);
        const domainResponse = await supabase.functions.invoke('openprovider-domains', {
          body: domainPayload
        });

        if (domainResponse.error) {
          console.error(`Error ${domainAction}ing domain:`, domainResponse.error);
          // Don't fail the whole transaction, just log the error
        } else {
          console.log(`Domain ${domainAction} successful:`, domainResponse.data);
        }
      }

      // Create platform order (Toogo infrastructure purchase)
      await supabase
        .from('platform_orders')
        .insert({
          tenant_id: newTenant.id,
          user_id: user.id,
          order_type: 'combined',
          total_mxn: totalPriceMXN,
          total_usd: totalPriceMXN / 20, // Approximate USD conversion
          payment_provider: 'mercadopago',
          payment_ref: paymentResult.id.toString(),
          status: 'paid',
          metadata: {
            customer_email: user.email,
            domain: requestData.domain,
            plan_type: requestData.planType,
            payment_type: 'combined_purchase',
            coupon_code: requestData.couponCode || null,
            discount_applied: finalDiscount,
            domain_price: domainPriceMXN,
            plan_price: basicPlanPriceMXN,
            plan_price_after_discount: planAfterDiscount
          }
        });

      // Apply coupon if validated successfully
      if (validatedCoupon && finalDiscount > 0) {
        console.log('Recording coupon usage:', {
          couponId: validatedCoupon.id,
          userId: user.id,
          tenantId: newTenant.id,
          discountAmount: finalDiscount,
          appliedTo: requestData.appliedTo || 'membership'
        });

        const couponResult = await supabase.functions.invoke('apply-coupon', {
          body: {
            couponId: validatedCoupon.id,
            userId: user.id,
            tenantId: newTenant.id,
            discountApplied: finalDiscount,
            appliedTo: requestData.appliedTo || 'membership'
          }
        });

        if (couponResult.error) {
          console.error('Error recording coupon usage (non-critical):', couponResult.error);
          // Don't fail the payment, just log the error
        } else {
          console.log('Coupon usage recorded successfully');
        }
      }

      console.log('Tenant and domain created successfully');
    }

    return new Response(JSON.stringify({
      payment: paymentResult,
      success: paymentResult.status === 'approved',
      breakdown: {
        domain: {
          name: requestData.domain,
          price: domainPriceMXN,
          description: domainPriceMXN === 0 ? 'Dominio incluido gratis' : 'Registro de dominio por 1 año'
        },
        plan: {
          name: requestData.planType === 'annual' ? 'Plan Básico Anual' : 'Plan Básico Mensual',
          price: basicPlanPriceMXN,
          description: requestData.planType === 'annual' ? 'Plan Básico - 12 meses (2 meses gratis)' : 'Plan Básico - 1 mes',
          billing_cycle: requestData.planType,
          auto_billing: true
        },
        total: {
          price: totalPriceMXN,
          description: 'Total a pagar'
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in embedded payment:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});