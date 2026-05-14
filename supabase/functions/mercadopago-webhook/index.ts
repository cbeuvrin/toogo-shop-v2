import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { MercadoPagoConfig, PreApproval, Payment } from 'npm:mercadopago@2.0.15';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id, x-id',
};

// SECURITY: Verify MercadoPago webhook signature using official manifest format
async function verifyWebhookSignature(
  body: any,
  signatureHeader: string | null,
  requestId: string | null,
  resourceId: string,
  secret: string
): Promise<boolean> {
  if (!signatureHeader) {
    console.log("Missing x-signature header");
    return false;
  }

  if (!requestId) {
    console.log("Missing x-request-id or x-id header");
    return false;
  }

  try {
    // Parse x-signature header (format: "ts=XXX,v1=YYY")
    const parts = signatureHeader.split(',').map(p => p.trim());
    let ts = '';
    let v1 = '';
    
    for (const part of parts) {
      const trimmedPart = part.trim();
      if (trimmedPart.startsWith('ts')) {
        ts = trimmedPart.split('=')[1]?.trim() || '';
      }
      if (trimmedPart.startsWith('v1')) {
        v1 = trimmedPart.split('=')[1]?.trim() || '';
      }
    }
    
    if (!ts || !v1) {
      console.log("Invalid signature format - expected ts=X,v1=Y");
      return false;
    }

    // Official MercadoPago manifest format
    const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`;
    
    console.log("Signature verification details:", {
      ts,
      requestId,
      resourceId_preview: resourceId.substring(0, 15) + "...",
      v1_received: v1.substring(0, 8) + "...",
      manifest_preview: manifest.substring(0, 50) + "..."
    });

    // Generate HMAC-SHA256 signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(manifest)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Constant-time comparison (case-insensitive)
    const expectedLower = expectedSignature.toLowerCase();
    const receivedLower = v1.toLowerCase();
    
    if (expectedLower === receivedLower) {
      console.log(`✅ Signature verification: PASSED`);
      console.log(`   Manifest: ${manifest}`);
      return true;
    }
    
    // Verification failed
    console.log("❌ Signature verification: FAILED");
    console.log("   Manifest used:", manifest.substring(0, 80) + "...");
    
    return false;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
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

    // SECURITY: Get raw body for signature verification
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    
    console.log('MercadoPago webhook received:', body);

    // SECURITY: Verify webhook signature
    const signature = req.headers.get('x-signature');
    const hasXId = !!req.headers.get('x-id');
    const hasXRequestId = !!req.headers.get('x-request-id');
    const requestId = req.headers.get('x-request-id') || req.headers.get('x-id') || '';
    const requestIdSource = req.headers.get('x-request-id') ? 'x-request-id' : req.headers.get('x-id') ? 'x-id' : 'none';
    const resourceId = body?.data?.id || body?.id || '';
    const webhookSecret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
    
    // Log headers for debugging (before verification)
    console.log("Webhook headers check:", {
      has_x_id: hasXId,
      has_x_request_id: hasXRequestId,
      has_x_signature: !!signature,
      requestId_source: requestIdSource,
      resourceId_preview: resourceId ? resourceId.toString().substring(0, 15) + "..." : 'none'
    });
    
    // Only verify signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = await verifyWebhookSignature(body, signature, requestId, resourceId, webhookSecret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 401
        });
      }
    } else if (webhookSecret && !signature) {
      console.warn('Webhook secret configured but no signature received');
    }

    // Handle preapproval notifications (recurring subscriptions)
    if (body.type === 'subscription_preapproval' || body.type === 'preapproval') {
      const preapprovalId = body.data?.id;
      
      if (!preapprovalId) {
        console.log('No preapproval ID in webhook');
        return new Response(JSON.stringify({ received: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        });
      }
      
      console.log('Processing preapproval notification:', preapprovalId);

      // Get preapproval details from MercadoPago using SDK
      const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
      if (!mpAccessToken) {
        console.error('MERCADOPAGO_ACCESS_TOKEN not configured');
        return new Response(JSON.stringify({ received: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        });
      }

      const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
      const preapprovalClient = new PreApproval(client);
      
      let preapproval;
      try {
        preapproval = await preapprovalClient.get({ id: preapprovalId });
      } catch (error) {
        console.error('Failed to fetch preapproval details:', error);
        return new Response(JSON.stringify({ received: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        });
      }
      console.log('Preapproval details:', {
        id: preapproval.id,
        status: preapproval.status,
        payer_email: preapproval.payer_email
      });

      // Find subscription in our database
      const { data: dbSubscription, error: subError } = await supabase
        .from('subscriptions')
        .select('id, tenant_id, status')
        .eq('mercadopago_subscription_id', preapprovalId)
        .single();

      if (subError) {
        // Si no es una suscripción de plan, puede ser una auto-renovación de dominio.
        // Buscamos el preapproval en domain_renewals.
        const { data: domainRenewal } = await supabase
          .from('domain_renewals')
          .select('id, tenant_id, domain, auto_renew')
          .eq('mercadopago_preapproval_id', preapprovalId)
          .maybeSingle();

        if (domainRenewal) {
          if (preapproval.status === 'authorized') {
            console.log('✅ Domain auto-renewal authorized for:', domainRenewal.domain);
            await supabase
              .from('domain_renewals')
              .update({ auto_renew: true, updated_at: new Date().toISOString() })
              .eq('id', domainRenewal.id);
          } else if (preapproval.status === 'cancelled' || preapproval.status === 'paused') {
            console.log('⚠️ Domain auto-renewal cancelled for:', domainRenewal.domain);
            await supabase
              .from('domain_renewals')
              .update({ auto_renew: false, mercadopago_preapproval_id: null, updated_at: new Date().toISOString() })
              .eq('id', domainRenewal.id);
          }

          return new Response(JSON.stringify({ received: true, action: 'domain_renewal_preapproval_updated' }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200,
          });
        }

        // No está en subscriptions ni en domain_renewals — preapproval huérfano
        console.warn('Preapproval not found in subscriptions or domain_renewals:', preapprovalId);
        return new Response(JSON.stringify({ received: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        });
      }

      // Update subscription based on preapproval status
      if (preapproval.status === 'authorized') {
        console.log('✅ Preapproval authorized, activating subscription');
        
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', dbSubscription.id);

        // Ensure tenant plan is basic or premium
        await supabase
          .from('tenants')
          .update({ plan: 'basic' })
          .eq('id', dbSubscription.tenant_id);

        console.log('✅ Subscription activated for tenant:', dbSubscription.tenant_id);
        
      } else if (preapproval.status === 'cancelled' || preapproval.status === 'paused') {
        console.log('⚠️ Preapproval cancelled/paused, marking subscription as cancelled');
        
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', dbSubscription.id);

        // Downgrade tenant to free plan
        await supabase
          .from('tenants')
          .update({ plan: 'free' })
          .eq('id', dbSubscription.tenant_id);

        console.log('⚠️ Tenant downgraded to free plan:', dbSubscription.tenant_id);
      }
    }

    // Handle payment notifications (including recurring payments from preapprovals)
    if (body.type === 'payment') {
      const paymentId = body.data.id;
      
      // Get payment details from MercadoPago using SDK
      const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
      if (!mpAccessToken) {
        console.error('MERCADOPAGO_ACCESS_TOKEN not configured');
        return new Response(JSON.stringify({ received: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        });
      }

      const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
      const paymentClient = new Payment(client);
      
      let payment;
      try {
        payment = await paymentClient.get({ id: paymentId });
      } catch (error) {
        console.error('Failed to fetch payment details:', error);
        throw new Error('Failed to fetch payment details');
      }
      console.log('Payment details:', {
        id: payment.id,
        status: payment.status,
        metadata: payment.metadata
      });

      // Handle FAILED recurring subscription payment (preapproval con cobro rechazado).
      // MP intenta cobrar varias veces antes de pausar el preapproval; queremos detectar
      // el primer fallo para notificar al cliente, e ir contando para suspender tras 3 intentos.
      if (
        payment.preapproval_id &&
        payment.status &&
        ['rejected', 'cancelled', 'refunded', 'charged_back'].includes(payment.status)
      ) {
        console.log('⚠️ Recurring payment FAILED:', {
          payment_id: payment.id,
          preapproval_id: payment.preapproval_id,
          status: payment.status,
          status_detail: payment.status_detail,
        });

        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('id, tenant_id, amount_mxn, failed_payment_attempts')
          .eq('mercadopago_subscription_id', payment.preapproval_id)
          .single();

        if (subscription) {
          const newAttempts = (subscription.failed_payment_attempts || 0) + 1;
          const shouldSuspend = newAttempts >= 3;

          await supabase
            .from('subscriptions')
            .update({
              failed_payment_attempts: newAttempts,
              last_payment_failure_at: new Date().toISOString(),
              status: shouldSuspend ? 'payment_failed' : 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscription.id);

          if (shouldSuspend) {
            console.log(`🚫 3+ failed attempts, downgrading tenant ${subscription.tenant_id} to free`);
            await supabase
              .from('tenants')
              .update({ plan: 'free' })
              .eq('id', subscription.tenant_id);
          }

          // Notificar al cliente
          try {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('name, owner_user_id')
              .eq('id', subscription.tenant_id)
              .single();

            if (tenant?.owner_user_id) {
              const { data: userData } = await supabase.auth.admin.getUserById(tenant.owner_user_id);
              const email = userData?.user?.email;

              if (email) {
                const resendApiKey = Deno.env.get('RESEND_API_KEY');
                const subject = shouldSuspend
                  ? `Tu suscripción de Toogo fue suspendida — Actualiza tu método de pago`
                  : `No pudimos cobrar tu suscripción de Toogo (intento ${newAttempts}/3)`;

                const reason = shouldSuspend
                  ? 'Tras 3 intentos fallidos, tu plan fue bajado a Free temporalmente. Tu tienda sigue activa pero algunas funciones premium están limitadas. Actualiza tu método de pago para reactivar tu plan.'
                  : `MercadoPago no pudo cobrar tu suscripción mensual. Esto suele pasar por tarjeta vencida o fondos insuficientes. Te quedan ${3 - newAttempts} intento(s) antes de que tu plan se suspenda.`;

                await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    from: 'Toogo Store <hola@mail.toogo.store>',
                    to: [email],
                    subject,
                    html: `<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                      <h2 style="color: #9333ea;">${subject}</h2>
                      <p>Hola,</p>
                      <p>${reason}</p>
                      <p style="margin-top: 24px;">
                        <a href="https://www.toogo.store/dashboard?tab=mi-perfil"
                           style="background: #9333ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                          Actualizar método de pago
                        </a>
                      </p>
                      <p style="color: #666; font-size: 14px; margin-top: 24px;">
                        Si tienes preguntas, escríbenos a <a href="mailto:soporte@toogo.store">soporte@toogo.store</a>
                      </p>
                    </body></html>`,
                  }),
                });
                console.log(`📧 Failed payment email sent to ${email}`);
              }
            }
          } catch (emailErr) {
            console.error('Failed to send payment failure email:', emailErr);
          }
        }

        return new Response(JSON.stringify({ received: true, action: 'payment_failed_processed' }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }

      // Handle recurring subscription payment (from preapproval)
      if (payment.status === 'approved' && payment.preapproval_id) {
        console.log('💰 Recurring subscription payment received:', {
          payment_id: payment.id,
          preapproval_id: payment.preapproval_id,
          amount: payment.transaction_amount
        });

        // Find subscription by preapproval_id
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('id, tenant_id, amount_mxn, next_billing_date')
          .eq('mercadopago_subscription_id', payment.preapproval_id)
          .single();

        if (!subError && subscription) {
          // Update next billing date + reset contador de fallos (cobro recuperado)
          const nextBilling = new Date(subscription.next_billing_date);
          const isAnnual = subscription.amount_mxn >= 3000;

          if (isAnnual) {
            nextBilling.setFullYear(nextBilling.getFullYear() + 1);
          } else {
            nextBilling.setMonth(nextBilling.getMonth() + 1);
          }

          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              next_billing_date: nextBilling.toISOString(),
              failed_payment_attempts: 0, // reset al recibir cobro exitoso
              last_payment_failure_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id);

          console.log('✅ Subscription renewed successfully until:', nextBilling.toISOString());
        } else {
          // No es suscripción de plan — chequear si es cobro recurrente de renovación de dominio
          const { data: domainRenewal } = await supabase
            .from('domain_renewals')
            .select('id, domain')
            .eq('mercadopago_preapproval_id', payment.preapproval_id)
            .eq('status', 'scheduled')
            .maybeSingle();

          if (domainRenewal) {
            console.log('🔄 Auto-renewal payment received for domain:', domainRenewal.domain);
            try {
              const { error: renewError } = await supabase.functions.invoke('renew-domain-manually', {
                body: {
                  renewalId: domainRenewal.id,
                  paymentRef: payment.id?.toString(),
                  source: 'mp_preapproval_recurring',
                },
              });
              if (renewError) {
                console.error('❌ Auto-renewal trigger failed:', renewError);
              } else {
                console.log('✅ Domain auto-renewal triggered successfully for:', domainRenewal.domain);
              }
            } catch (err) {
              console.error('❌ Error invoking renew-domain-manually for auto-renewal:', err);
            }
          }
        }
      }

      // Handle DOMAIN RENEWAL payment: cuando es renovación, disparar renew-domain-manually
      // que ejecuta la renovación en Openprovider y actualiza fechas.
      if (payment.status === 'approved' && payment.metadata?.type === 'domain_renewal') {
        const renewalId = payment.metadata?.renewal_id;
        console.log('🔄 Domain renewal payment approved:', { payment_id: payment.id, renewal_id: renewalId });

        if (renewalId) {
          try {
            const { data: renewResult, error: renewError } = await supabase.functions.invoke(
              'renew-domain-manually',
              {
                body: {
                  renewalId,
                  paymentRef: payment.id.toString(),
                  source: 'mercadopago_webhook'
                }
              }
            );

            if (renewError) {
              console.error('❌ Failed to trigger renewal:', renewError);
            } else {
              console.log('✅ Renewal triggered successfully:', renewResult);
            }
          } catch (renewErr) {
            console.error('❌ Error invoking renew-domain-manually:', renewErr);
          }
        } else {
          console.error('❌ Payment has type=domain_renewal but no renewal_id in metadata');
        }

        return new Response(JSON.stringify({ received: true, action: 'domain_renewal_processed' }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }

      // Handle regular order payment (not combined purchase)
      if (payment.status === 'approved' && !payment.metadata?.type) {
        console.log('💰 Order payment approved:', {
          payment_id: payment.id,
          external_reference: payment.external_reference
        });

        // Try to find order by payment reference
        if (payment.external_reference) {
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, tenant_id, customer_name, customer_email, customer_phone, total_mxn')
            .eq('id', payment.external_reference)
            .single();

          if (!orderError && order) {
            // Update order status to paid
            await supabase
              .from('orders')
              .update({ 
                status: 'paid',
                payment_ref: payment.id.toString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', order.id);

            console.log('✅ Order marked as paid:', order.id);

            // Send email notifications (non-blocking)
            try {
              // Get order items
              const { data: orderItems } = await supabase
                .from('order_items')
                .select('product_id, qty, price_mxn')
                .eq('order_id', order.id);

              // Get product details for email
              const itemsWithDetails = [];
              if (orderItems) {
                for (const item of orderItems) {
                  const { data: product } = await supabase
                    .from('products')
                    .select('title')
                    .eq('id', item.product_id)
                    .single();
                  
                  itemsWithDetails.push({
                    product_name: product?.title || `Producto ID: ${item.product_id}`,
                    quantity: item.qty,
                    price: item.price_mxn
                  });
                }
              }

              await supabase.functions.invoke('send-order-notifications', {
                body: {
                  order_id: order.id,
                  tenant_id: order.tenant_id,
                  customer_name: order.customer_name || 'Cliente',
                  customer_email: order.customer_email,
                  customer_phone: order.customer_phone,
                  total_amount: order.total_mxn,
                  order_items: itemsWithDetails
                }
              });

              console.log('✅ Email notifications sent for order:', order.id);
            } catch (emailError) {
              console.error('Failed to send email notifications (non-critical):', emailError);
            }
          }
        }
      }

      // Check if payment is approved and it's a combined purchase
      if (payment.status === 'approved' && payment.metadata?.type === 'combined_purchase') {
        const { domain, tenantName, autoRenewDomain, userId, planType } = payment.metadata;

        // Determine subscription details based on plan type
        const isAnnual = planType === 'annual';
        const subscriptionAmount = isAnnual ? 3120 : 299;
        const monthsToAdd = isAnnual ? 12 : 1;

        console.log('Processing approved combined purchase:', {
          domain,
          tenantName,
          autoRenewDomain,
          userId,
          planType,
          isAnnual,
          subscriptionAmount,
          monthsToAdd
        });

        try {
          // 1. Create the tenant
          const { data: newTenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({
              name: tenantName,
              primary_host: domain,
              owner_user_id: userId,
              plan: 'basic',
              status: 'active'
            })
            .select()
            .single();

          if (tenantError) {
            throw new Error(`Failed to create tenant: ${tenantError.message}`);
          }

          console.log('Tenant created:', newTenant.id);

          // 2. Create user role
          await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              tenant_id: newTenant.id,
              role: 'tenant_admin'
            });

          // 3. Purchase domain via Openprovider (PRODUCTION MODE - Real purchase)
          console.log(`[PRODUCTION] Calling openprovider-domains to purchase domain: ${domain} for tenant: ${newTenant.id}`);
          const { data: domainResult, error: domainError } = await supabase.functions.invoke('openprovider-domains', {
            body: {
              action: 'purchase',
              domain: domain,
              tenantId: newTenant.id
            }
          });
          
          console.log(`[PRODUCTION] Openprovider-domains response for ${domain}:`, {
            success: !domainError,
            data: domainResult,
            error: domainError
          });

          // 3.5. Complete domain setup (Vercel + DNS + Bootstrap)
          if (domainResult?.purchase_id) {
            console.log(`[Webhook] Invoking complete-domain-setup for domain: ${domain}`);
            
            try {
              const setupResult = await supabase.functions.invoke('complete-domain-setup', {
                body: {
                  domainPurchaseId: domainResult.purchase_id,
                  forceAll: false
                }
              });

              if (setupResult.error) {
                console.error('[Webhook] Error in complete-domain-setup:', setupResult.error);
              } else {
                console.log('[Webhook] Complete-domain-setup executed successfully:', setupResult.data);
              }
            } catch (setupError) {
              console.error('[Webhook] Failed to invoke complete-domain-setup:', setupError);
              // No lanzar error - continuar con el proceso
            }
          }

          // 4. Create subscription for monthly or annual billing
          const nextBillingDate = new Date();
          nextBillingDate.setMonth(nextBillingDate.getMonth() + monthsToAdd);

          await supabase
            .from('subscriptions')
            .insert({
              tenant_id: newTenant.id,
              status: 'active',
              next_billing_date: nextBillingDate.toISOString(),
              amount_mxn: subscriptionAmount
            });

          // 5. Set up domain auto-renewal if requested
          if (autoRenewDomain === 'true') {
            const nextRenewalDate = new Date();
            nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1);

            await supabase
              .from('domain_renewals')
              .insert({
                tenant_id: newTenant.id,
                domain: domain,
                auto_renew: true,
                next_renewal_date: nextRenewalDate.toISOString(),
                amount_mxn: Math.round(payment.transaction_details.net_received_amount / 2)
              });
          }

          // 6. Create default category
          await supabase
            .from('categories')
            .insert({
              tenant_id: newTenant.id,
              name: 'General',
              slug: 'general'
            });

          // 7. Initialize tenant settings
          await supabase
            .from('tenant_settings')
            .insert({
              tenant_id: newTenant.id,
              primary_color: '#000000',
              secondary_color: '#ffffff'
            });

          console.log('Combined purchase completed successfully');

        } catch (processingError) {
          console.error('Error processing combined purchase:', processingError);
          // Log the error but don't throw - webhook should return 200 to avoid retries
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200 // Return 200 to avoid webhook retries
    });
  }
});