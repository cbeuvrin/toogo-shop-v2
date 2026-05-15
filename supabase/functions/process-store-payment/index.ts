import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { MercadoPagoConfig, Payment } from "npm:mercadopago@2.0.15";

/**
 * Bricks-based store checkout processor.
 * Anonymous shoppers — no auth required.
 * Charges via tenant's OAuth MP credentials and applies 1% application_fee
 * that lands in Toogo's marketplace account.
 *
 * Frontend (EmbeddedStoreCheckoutDialog) captures a card token via MP Bricks
 * and posts here. We re-validate prices server-side, create the order, then
 * settle the charge.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const tail = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PROCESS-STORE-PAYMENT] ${step}${tail}`);
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// Per-IP rate limit, mirrors create-customer-checkout
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const WINDOW = 60 * 1000;
const MAX = 5;
function allow(ip: string): boolean {
  const now = Date.now();
  const r = rateLimit.get(ip);
  if (!r || now > r.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + WINDOW });
    return true;
  }
  if (r.count >= MAX) return false;
  r.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!allow(ip)) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const {
      tenant_id,
      items,
      customer,
      shipping_cost = 0,
      total_mxn,
      total_usd,
      payment_token,
      payment_method_id,
      issuer_id,
      installments = 1,
    } = body;

    log("Request parsed", { tenant_id, payment_method_id, total_mxn, customer_email: customer?.email });

    if (!tenant_id || typeof tenant_id !== "string") {
      throw new Error("tenant_id is required");
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("items array is required");
    }
    if (!customer?.email || !customer?.name) {
      throw new Error("customer.email and customer.name are required");
    }
    if (!payment_token || !payment_method_id) {
      throw new Error("payment_token and payment_method_id are required");
    }

    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("id, status")
      .eq("id", tenant_id)
      .eq("status", "active")
      .single();
    if (tenantErr || !tenant) throw new Error("Invalid or inactive tenant");

    const { data: mpIntegration } = await supabase
      .from("tenant_payment_integrations")
      .select("access_token, refresh_token, expires_at, application_fee_pct")
      .eq("tenant_id", tenant_id)
      .eq("provider", "mercadopago")
      .eq("status", "active")
      .maybeSingle();

    if (!mpIntegration?.access_token) {
      throw new Error("MercadoPago no está conectado para esta tienda");
    }

    // Server-side price re-validation. Never trust client totals.
    const validated: any[] = [];
    for (const it of items) {
      if (it.variation_id) {
        const { data: v } = await supabase
          .from("product_variations")
          .select("price_mxn, sale_price_mxn, stock")
          .eq("id", it.variation_id)
          .eq("product_id", it.product_id)
          .single();
        if (!v) throw new Error(`Variation ${it.variation_id} not found`);
        const real = v.sale_price_mxn || v.price_mxn;
        validated.push({ ...it, price_mxn: real });
      } else {
        const { data: p } = await supabase
          .from("products")
          .select("price_mxn, sale_price_mxn")
          .eq("id", it.product_id)
          .single();
        if (!p) throw new Error(`Product ${it.product_id} not found`);
        const real = p.sale_price_mxn || p.price_mxn;
        validated.push({ ...it, price_mxn: real });
      }
    }

    const serverTotal = round2(
      validated.reduce((s, it) => s + it.price_mxn * it.quantity, 0) + (shipping_cost || 0)
    );
    log("Price validation", { client_total: total_mxn, server_total: serverTotal });

    const feePct = Number(mpIntegration.application_fee_pct ?? 1.0);
    const feeAmount = round2(serverTotal * (feePct / 100));

    // Create order before charging so MP webhook can correlate via external_reference.
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        tenant_id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        total_mxn: serverTotal,
        total_usd,
        shipping_cost,
        status: "pending",
        payment_provider: "mercadopago",
        metadata: {
          platform_fee_pct: feePct,
          platform_fee_mxn: feeAmount,
          auth_method: "oauth",
          payment_flow: "bricks",
        },
      })
      .select()
      .single();
    if (orderErr) throw new Error(`Order creation error: ${orderErr.message}`);

    const orderItems = validated.map((it: any) => ({
      order_id: order.id,
      product_id: it.product_id,
      variation_id: it.variation_id || null,
      qty: it.quantity,
      price_mxn: it.price_mxn,
      sale_price_mxn: it.sale_price_mxn || 0,
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
    if (itemsErr) throw new Error(`Order items error: ${itemsErr.message}`);
    log("Order created", { order_id: order.id });

    const [firstName, ...rest] = (customer.name || "").trim().split(" ");
    const lastName = rest.join(" ") || firstName;

    const mp = new MercadoPagoConfig({
      accessToken: mpIntegration.access_token,
      options: { timeout: 8000 },
    });
    const paymentClient = new Payment(mp);

    const paymentBody: any = {
      transaction_amount: serverTotal,
      token: payment_token,
      description: `Compra TOOGO #${order.id.substring(0, 8)}`,
      payment_method_id,
      installments: Number(installments) || 1,
      payer: {
        email: customer.email,
        first_name: firstName,
        last_name: lastName,
      },
      external_reference: order.id,
      metadata: {
        order_id: order.id,
        tenant_id,
        platform_fee_mxn: feeAmount,
      },
      ...(feeAmount > 0 && { application_fee: feeAmount }),
      ...(issuer_id && { issuer_id }),
    };

    log("Creating MP payment", { amount: serverTotal, fee: feeAmount });

    let paymentResult: any;
    try {
      paymentResult = await paymentClient.create({
        body: paymentBody,
        requestOptions: { idempotencyKey: `${order.id}_${Date.now()}` },
      });
    } catch (err: any) {
      // Retry once with recalculated amount on MP code 4037 (invalid amount)
      if (err.cause?.[0]?.code === 4037) {
        log("Retrying with recalculated amount");
        paymentResult = await paymentClient.create({
          body: { ...paymentBody, transaction_amount: Number(serverTotal.toFixed(2)) },
          requestOptions: { idempotencyKey: `${order.id}_${Date.now()}_retry` },
        });
      } else {
        throw err;
      }
    }

    log("MP result", { status: paymentResult.status, id: paymentResult.id });

    const isApproved = paymentResult.status === "approved";
    const isPending = paymentResult.status === "pending" || paymentResult.status === "in_process";

    await supabase
      .from("orders")
      .update({
        status: isApproved ? "paid" : isPending ? "pending" : "failed",
        payment_provider_id: String(paymentResult.id),
      })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        payment: {
          id: paymentResult.id,
          status: paymentResult.status,
          status_detail: paymentResult.status_detail,
        },
        order_id: order.id,
        total_mxn: serverTotal,
        platform_fee_mxn: feeAmount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
