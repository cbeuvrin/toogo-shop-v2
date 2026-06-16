import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-ORDER] ${step}${detailsStr}`);
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

    // SECURITY: Get authenticated user from request (if any)
    const authHeader = req.headers.get("Authorization");
    let authenticatedUserId: string | null = null;

    if (authHeader) {
      const supabaseAuthClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {
          auth: { persistSession: false },
          global: { headers: { Authorization: authHeader } }
        }
      );

      const { data: { user } } = await supabaseAuthClient.auth.getUser();
      authenticatedUserId = user?.id || null;
      logStep("Authenticated user", { user_id: authenticatedUserId });
    }

    const { tenant_id, items, customer, payment_method, total_mxn, total_usd, shipping_cost = 0, store_coupon_id, store_discount_amount = 0 } = await req.json();
    logStep("Request parsed", { tenant_id, payment_method, total_mxn, shipping_cost, coupon_id: store_coupon_id, discount: store_discount_amount, customer_email: customer?.email });

    // SECURITY: Validate required fields
    if (!tenant_id) {
      throw new Error("tenant_id is required");
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("items array is required and must not be empty");
    }
    if (!customer || !customer.email) {
      throw new Error("customer information with email is required");
    }
    if (!payment_method) {
      throw new Error("payment_method is required");
    }
    if (typeof total_mxn !== 'number' || total_mxn <= 0) {
      throw new Error("total_mxn must be a positive number");
    }

    // SECURITY: Verify tenant is active
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('id, status')
      .eq('id', tenant_id)
      .eq('status', 'active')
      .single();

    if (tenantError || !tenant) {
      throw new Error("Invalid or inactive tenant");
    }

    // VALIDATION: Check variation_id and server-side price validation
    const validatedItems: any[] = [];
    for (const item of items) {
      const { data: productData, error: productError } = await supabaseClient
        .from('products')
        .select('product_type, title, price_mxn, sale_price_mxn')
        .eq('id', item.product_id)
        .single();

      if (productError || !productData) {
        logStep("Product validation error", { product_id: item.product_id, error: productError?.message });
        return new Response(JSON.stringify({
          error: "Product validation failed",
          message: "No se pudo validar el producto"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Services are quote/contact-only and must never reach checkout.
      // The UI already routes service clicks to WhatsApp; this is a defensive guard.
      if (productData.product_type === 'service') {
        logStep("Validation error - service in order", { product_id: item.product_id, product_title: productData.title });
        return new Response(JSON.stringify({
          error: "Service product not orderable",
          message: `"${productData.title}" es un servicio: contáctanos por WhatsApp para coordinarlo.`,
          product_id: item.product_id,
          product_title: productData.title
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      if (productData.product_type === 'variable' && !item.variation_id) {
        logStep("Validation error - missing variation_id", { product_id: item.product_id, product_title: productData.title });
        return new Response(JSON.stringify({
          error: "Variation selection required",
          message: `Por favor selecciona todas las opciones de "${productData.title}" antes de continuar`,
          product_id: item.product_id,
          product_title: productData.title
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // SECURITY: Use server-side price — ignore client-provided price
      let realPrice: number;
      if (item.variation_id) {
        const { data: variation } = await supabaseClient
          .from('product_variations')
          .select('price_mxn, sale_price_mxn')
          .eq('id', item.variation_id)
          .eq('product_id', item.product_id)
          .single();
        realPrice = variation?.sale_price_mxn || variation?.price_mxn || productData.sale_price_mxn || productData.price_mxn;
      } else {
        realPrice = productData.sale_price_mxn || productData.price_mxn;
      }

      validatedItems.push({ ...item, price_mxn: realPrice });
    }

    // Recalculate total using real prices
    const validatedTotal = validatedItems.reduce(
      (sum: number, item: any) => sum + item.price_mxn * item.quantity, 0
    ) + shipping_cost - store_discount_amount;
    logStep("Price validation complete", { client_total: total_mxn, server_total: validatedTotal, diff: total_mxn - validatedTotal });

    // SECURITY: Create order with proper user_id for authenticated users
    const orderData: any = {
      tenant_id: tenant_id,
      user_id: authenticatedUserId,
      customer_name: customer?.name,
      customer_email: customer?.email,
      customer_phone: customer?.phone,
      total_mxn: validatedTotal, // Always use server-calculated total
      total_usd: total_usd,
      status: 'pending',
      payment_provider: payment_method
    };

    // Add shipping and address fields if they exist
    if (shipping_cost !== undefined) {
      orderData.shipping_cost = shipping_cost;
    }
    if (customer?.address) {
      orderData.customer_address = customer.address;
    }
    if (customer?.state) {
      orderData.customer_state = customer.state;
    }

    // Add coupon fields if a coupon was applied
    if (store_coupon_id) {
      orderData.store_coupon_id = store_coupon_id;
      orderData.store_discount_amount = store_discount_amount;
    }

    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) throw new Error(`Order creation error: ${orderError.message}`);
    logStep("Order created", { order_id: order.id });

    // Create order items using validated server-side prices
    const orderItems = validatedItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      variation_id: item.variation_id || null,
      qty: item.quantity,
      price_mxn: item.price_mxn, // ← server-validated price
      sale_price_mxn: item.sale_price_mxn || 0
    }));

    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw new Error(`Order items error: ${itemsError.message}`);
    logStep("Order items created", { count: orderItems.length });

    // Register coupon usage if a coupon was applied
    if (store_coupon_id) {
      try {
        // Increment coupon usage count
        const { error: couponUpdateError } = await supabaseClient
          .from('tenant_store_coupons')
          .update({ current_uses: supabaseClient.raw('current_uses + 1') })
          .eq('id', store_coupon_id);

        if (couponUpdateError) {
          logStep("Coupon update warning", { coupon_id: store_coupon_id, error: couponUpdateError.message });
        }

        // Record usage in coupon_usage table
        const { error: usageError } = await supabaseClient
          .from('tenant_coupon_usage')
          .insert({
            coupon_id: store_coupon_id,
            user_id: authenticatedUserId,
            order_id: order.id,
            tenant_id: tenant_id,
            discount_applied: store_discount_amount
          });

        if (usageError) {
          logStep("Coupon usage recording warning", { coupon_id: store_coupon_id, error: usageError.message });
        } else {
          logStep("Coupon usage recorded", { coupon_id: store_coupon_id, discount: store_discount_amount });
        }
      } catch (couponError) {
        logStep("Coupon processing error (non-critical)", { error: couponError instanceof Error ? couponError.message : String(couponError) });
        // Don't fail the order if coupon processing fails
      }
    }

    // SECURITY: stock is NOT decremented here. These are WhatsApp (manual-payment)
    // orders created as "pending" by anonymous buyers — decrementing on creation
    // let anyone deplete a store's inventory without ever paying. Stock is applied
    // when the store owner marks the order as "paid" (apply_order_stock RPC),
    // idempotently and only once.
    logStep("Stock not decremented (applied on payment confirmation)");

    logStep("Order completed successfully", { order_id: order.id });

    // Send email notifications (non-blocking)
    try {
      logStep("Sending email notifications", { order_id: order.id });
      await supabaseClient.functions.invoke('send-order-notifications', {
        body: {
          order_id: order.id,
          tenant_id: tenant_id,
          customer_name: customer?.name || 'Cliente',
          customer_email: customer?.email,
          customer_phone: customer?.phone,
          total_amount: total_mxn,
          order_items: items.map((item: any) => ({
            product_name: item.title || `Producto ID: ${item.product_id}`,
            quantity: item.quantity,
            price: item.price_mxn
          }))
        }
      });
      logStep("Email notifications sent successfully");
    } catch (emailError) {
      logStep("Failed to send email notifications (non-critical)", { error: emailError instanceof Error ? emailError.message : String(emailError) });
      // Don't fail the order if email fails
    }

    return new Response(JSON.stringify({
      order_id: order.id,
      status: 'created',
      message: 'Order created successfully'
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