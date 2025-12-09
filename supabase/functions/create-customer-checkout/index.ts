import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CUSTOMER-CHECKOUT] ${step}${detailsStr}`);
};

// Simple rate limiting using in-memory store
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute per IP

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(clientIp);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // SECURITY: Rate limiting
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(clientIp)) {
      logStep("Rate limit exceeded", { ip: clientIp });
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { tenant_id, items, customer, payment_method, total_mxn, total_usd } = await req.json();
    logStep("Request parsed", { tenant_id, payment_method, total_mxn, customer_email: customer?.email });

    // SECURITY: Validate required fields and input types
    if (!tenant_id || typeof tenant_id !== 'string') {
      throw new Error("tenant_id is required and must be a valid UUID");
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("items array is required and must not be empty");
    }
    if (!customer || !customer.email || !customer.name) {
      throw new Error("customer information with email and name is required");
    }
    if (!payment_method || !['mercadopago', 'paypal', 'stripe'].includes(payment_method)) {
      throw new Error("valid payment_method is required (mercadopago, paypal, or stripe)");
    }
    if (typeof total_mxn !== 'number' || total_mxn <= 0) {
      throw new Error("total_mxn must be a positive number");
    }
    if (typeof total_usd !== 'number' || total_usd <= 0) {
      throw new Error("total_usd must be a positive number");
    }

    // SECURITY: Verify tenant exists and is active
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('id, status')
      .eq('id', tenant_id)
      .eq('status', 'active')
      .single();

    if (tenantError || !tenant) {
      throw new Error("Invalid or inactive tenant");
    }

    // SECURITY: Use security definer function to get payment settings
    const { data: settingsResult, error: settingsError } = await supabaseClient
      .rpc('get_tenant_payment_settings', { p_tenant_id: tenant_id });

    if (settingsError) {
      logStep("Settings error", { error: settingsError.message });
      throw new Error(`Settings error: ${settingsError.message}`);
    }
    
    const settings = settingsResult;
    logStep("Settings loaded", { has_mp: !!settings?.mercadopago_public_key, has_paypal: !!settings?.paypal_client_id });

    // Create order first
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        tenant_id: tenant_id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        total_mxn: total_mxn,
        total_usd: total_usd,
        status: 'pending',
        payment_provider: payment_method
      })
      .select()
      .single();

    if (orderError) throw new Error(`Order creation error: ${orderError.message}`);
    logStep("Order created", { order_id: order.id });

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      variation_id: item.variation_id || null,
      qty: item.quantity,
      price_mxn: item.price_mxn,
      sale_price_mxn: item.sale_price_mxn || 0
    }));

    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw new Error(`Order items error: ${itemsError.message}`);
    logStep("Order items created", { count: orderItems.length });

    // Process payment based on method
    let checkoutUrl = '';

    if (payment_method === 'mercadopago') {
      checkoutUrl = await createMercadoPagoCheckout(settings.mercadopago_public_key, items, customer, order.id);
    } else if (payment_method === 'paypal') {
      checkoutUrl = await createPayPalCheckout(settings.paypal_client_id, items, customer, order.id);
    } else if (payment_method === 'stripe') {
      throw new Error('Stripe integration not implemented yet');
    } else {
      throw new Error(`Unsupported payment method: ${payment_method}`);
    }

    logStep("Checkout URL created", { url: checkoutUrl });

    return new Response(JSON.stringify({ 
      url: checkoutUrl,
      order_id: order.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function createMercadoPagoCheckout(publicKey: string, items: any[], customer: any, orderId: string): Promise<string> {
  const preference = {
    items: items.map(item => ({
      title: item.title,
      quantity: item.quantity,
      unit_price: item.price_mxn,
      currency_id: "MXN"
    })),
    payer: {
      name: customer.name,
      email: customer.email,
      phone: {
        number: customer.phone
      }
    },
    external_reference: orderId,
    back_urls: {
      success: `${Deno.env.get("SITE_URL") || "http://localhost:3000"}/payment-success`,
      failure: `${Deno.env.get("SITE_URL") || "http://localhost:3000"}/payment-error`,
      pending: `${Deno.env.get("SITE_URL") || "http://localhost:3000"}/payment-pending`
    },
    auto_return: "approved"
  };

  console.log("MercadoPago preference would be created:", preference);
  return `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=demo-${orderId}`;
}

async function createPayPalCheckout(clientId: string, items: any[], customer: any, orderId: string): Promise<string> {
  // CRITICAL FIX: Convert MXN to USD for PayPal (approximate rate: 20 MXN = 1 USD)
  const exchangeRate = 20;
  
  const order = {
    intent: "CAPTURE",
    purchase_units: [{
      reference_id: orderId,
      amount: {
        currency_code: "USD",
        value: items.reduce((sum, item) => sum + ((item.price_mxn / exchangeRate) * item.quantity), 0).toFixed(2)
      },
      items: items.map(item => ({
        name: item.title,
        quantity: item.quantity.toString(),
        unit_amount: {
          currency_code: "USD",
          value: (item.price_mxn / exchangeRate).toFixed(2)
        }
      }))
    }],
    application_context: {
      return_url: `${Deno.env.get("SITE_URL") || "http://localhost:3000"}/payment-success`,
      cancel_url: `${Deno.env.get("SITE_URL") || "http://localhost:3000"}/payment-error`
    }
  };

  console.log("PayPal order would be created:", order);
  return `https://www.paypal.com/checkoutnow?token=demo-${orderId}`;
}