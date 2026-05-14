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

    const { tenant_id, items, customer, payment_method, total_mxn, total_usd, shipping_cost = 0 } = await req.json();
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

    // SECURITY: Fetch tenant payment settings (including access token) with service role
    const { data: tenantSettings, error: settingsError } = await supabaseClient
      .from('tenant_settings')
      .select('mercadopago_public_key, mercadopago_access_token, paypal_client_id, exchange_rate_value')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (settingsError) {
      throw new Error(`Settings error: ${settingsError.message}`);
    }

    logStep("Settings loaded", {
      has_mp_key: !!tenantSettings?.mercadopago_public_key,
      has_mp_token: !!tenantSettings?.mercadopago_access_token,
      has_paypal: !!tenantSettings?.paypal_client_id,
    });

    // SECURITY: Server-side price validation — re-fetch real prices from DB
    logStep("Validating item prices server-side");
    const validatedItems = [];
    for (const item of items) {
      if (item.variation_id) {
        // Variable product: get variation price
        const { data: variation } = await supabaseClient
          .from('product_variations')
          .select('price_mxn, sale_price_mxn, stock')
          .eq('id', item.variation_id)
          .eq('product_id', item.product_id)
          .single();

        if (!variation) {
          throw new Error(`Variation ${item.variation_id} not found for product ${item.product_id}`);
        }
        const realPrice = variation.sale_price_mxn || variation.price_mxn;
        validatedItems.push({ ...item, price_mxn: realPrice });
      } else {
        // Simple product: get product price
        const { data: product } = await supabaseClient
          .from('products')
          .select('price_mxn, sale_price_mxn')
          .eq('id', item.product_id)
          .single();

        if (!product) {
          throw new Error(`Product ${item.product_id} not found`);
        }
        const realPrice = product.sale_price_mxn || product.price_mxn;
        validatedItems.push({ ...item, price_mxn: realPrice });
      }
    }

    // Recalculate total from validated prices
    const validatedTotal = validatedItems.reduce(
      (sum, item) => sum + item.price_mxn * item.quantity, 0
    ) + (shipping_cost || 0);

    logStep("Price validation complete", { client_total: total_mxn, server_total: validatedTotal });

    // Create order first
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        tenant_id: tenant_id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        total_mxn: validatedTotal,
        total_usd: total_usd,
        shipping_cost: shipping_cost,
        status: 'pending',
        payment_provider: payment_method
      })
      .select()
      .single();

    if (orderError) throw new Error(`Order creation error: ${orderError.message}`);
    logStep("Order created", { order_id: order.id });

    // Create order items using validated prices
    const orderItems = validatedItems.map((item: any) => ({
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
    const siteUrl = Deno.env.get("SITE_URL") || "https://toogo.store";

    if (payment_method === 'mercadopago') {
      if (!tenantSettings?.mercadopago_access_token) {
        throw new Error('MercadoPago no está configurado para esta tienda. El tenant debe configurar su Access Token.');
      }
      checkoutUrl = await createMercadoPagoCheckout(
        tenantSettings.mercadopago_access_token,
        validatedItems,
        customer,
        order.id,
        validatedTotal,
        siteUrl
      );
    } else if (payment_method === 'paypal') {
      if (!tenantSettings?.paypal_client_id) {
        throw new Error('PayPal no está configurado para esta tienda.');
      }
      // Use actual exchange rate from tenant settings (fallback 18 MXN = 1 USD)
      const exchangeRate = tenantSettings?.exchange_rate_value || 18;
      checkoutUrl = await createPayPalCheckout(
        tenantSettings.paypal_client_id,
        validatedItems,
        customer,
        order.id,
        exchangeRate,
        siteUrl
      );
    } else if (payment_method === 'stripe') {
      throw new Error('Stripe no está implementado aún. Usa MercadoPago o PayPal.');
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

async function createMercadoPagoCheckout(
  accessToken: string,
  items: any[],
  customer: any,
  orderId: string,
  totalMxn: number,
  siteUrl: string
): Promise<string> {
  logStep("Creating real MercadoPago preference");

  const preferenceBody = {
    items: items.map(item => ({
      id: item.product_id,
      title: item.title || `Producto ${item.product_id}`,
      quantity: item.quantity,
      unit_price: item.price_mxn,
      currency_id: "MXN"
    })),
    payer: {
      name: customer.name,
      email: customer.email,
      phone: {
        number: customer.phone || ''
      }
    },
    external_reference: orderId,
    back_urls: {
      success: `${siteUrl}/payment-success?order_id=${orderId}`,
      failure: `${siteUrl}/payment-error?order_id=${orderId}`,
      pending: `${siteUrl}/payment-success?order_id=${orderId}&status=pending`
    },
    auto_return: "approved",
    statement_descriptor: "TOOGO STORE"
  };

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(preferenceBody)
  });

  if (!response.ok) {
    const errorData = await response.text();
    logStep("MercadoPago API error", { status: response.status, body: errorData });
    throw new Error(`MercadoPago error: ${response.status} - ${errorData}`);
  }

  const preference = await response.json();
  logStep("MercadoPago preference created", { preference_id: preference.id });

  // Use sandbox URL in dev, production URL in prod
  return preference.init_point || preference.sandbox_init_point;
}

async function createPayPalCheckout(
  clientId: string,
  items: any[],
  customer: any,
  orderId: string,
  exchangeRate: number,
  siteUrl: string
): Promise<string> {
  logStep("Creating PayPal checkout URL", { clientId: clientId.substring(0, 10) + '...', exchangeRate });

  // Build PayPal checkout URL (client-side redirect — no server-to-server call yet)
  // For a full PayPal server integration, use PayPal Orders v2 API with client secret
  const itemsUsd = items
    .map(item => `${item.title} x${item.quantity}: $${(item.price_mxn / exchangeRate * item.quantity).toFixed(2)} USD`)
    .join(' | ');

  const totalUsd = (items.reduce((sum, item) => sum + item.price_mxn * item.quantity, 0) / exchangeRate).toFixed(2);

  // PayPal.me — requires client secret for full Orders API integration
  // For now, redirect to PayPal with amount so the customer can set payer email
  const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(clientId)}&amount=${totalUsd}&currency_code=USD&item_name=${encodeURIComponent(`Orden TOOGO #${orderId.substring(0, 8)}`)}&return=${encodeURIComponent(`${siteUrl}/payment-success?order_id=${orderId}`)}&cancel_return=${encodeURIComponent(`${siteUrl}/payment-error?order_id=${orderId}`)}`;

  logStep("PayPal URL generated", { total_usd: totalUsd, exchange_rate: exchangeRate });
  return paypalUrl;
}