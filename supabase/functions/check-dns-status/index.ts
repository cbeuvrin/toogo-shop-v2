import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting DNS verification check...");
    console.log("Production mode: All domains require real DNS verification");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all domains that haven't been verified yet (active or dns_pending)
    const { data: pendingDomains, error: fetchError } = await supabase
      .from("domain_purchases")
      .select("*")
      .eq("dns_verified_bool", false)
      .in("status", ["active", "dns_pending"]);

    if (fetchError) {
      console.error("Error fetching pending domains:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch pending domains" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!pendingDomains || pendingDomains.length === 0) {
      console.log("No pending domains to verify");
      return new Response(
        JSON.stringify({ message: "No pending domains", verified: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Found ${pendingDomains.length} pending domains to verify`);

    let verifiedCount = 0;
    const results = [];

    // Check each domain
    for (const domainRecord of pendingDomains) {
      const domain = domainRecord.domain;
      console.log(`Checking DNS for: ${domain}`);

      try {
        // Production mode: All domains must pass real DNS verification
        const isDnsReady = await checkDnsStatus(domain);
        
        if (domainRecord.sandbox_bool) {
          console.log(`[TEST PURCHASE] Verifying DNS for test domain: ${domain}`);
        }

        if (isDnsReady) {
          console.log(`✅ DNS verified for ${domain}`);
          
          // Verificar si ya se envió email antes
          const metadata = domainRecord.metadata as any || {};
          const emailAlreadySent = metadata.email_sent === true;
          const wasNotVerifiedBefore = !domainRecord.dns_verified_bool;
          
          // Actualizar domain_purchases
          const { error: updateError } = await supabase
            .from("domain_purchases")
            .update({
              dns_verified_bool: true,
              status: 'active',
              dns_verified_at: new Date().toISOString(),
              metadata: {
                ...metadata,
                dns_verified_at: new Date().toISOString(),
                verification_method: 'dns_check_cron'
              }
            })
            .eq("id", domainRecord.id);

          if (updateError) {
            console.error(`Error updating domain ${domain}:`, updateError);
            results.push({ domain, success: false, error: updateError.message });
            continue;
          }

          verifiedCount++;

          // Get tenant info
          const { data: tenantData } = await supabase
            .from("tenants")
            .select("primary_host, owner_user_id, id")
            .eq("id", domainRecord.tenant_id)
            .single();

          // If primary_host is null (external domain flow), assign it now
          if (tenantData && !tenantData.primary_host) {
            console.log(`[DNS-Only] Asignando primary_host ${domain} al tenant ${domainRecord.tenant_id}`);
            await supabase
              .from("tenants")
              .update({ primary_host: domain })
              .eq("id", domainRecord.tenant_id);
          }

          // ENVIAR EMAIL SOLO SI:
          // 1. Primera vez que se verifica (wasNotVerifiedBefore)
          // 2. Email NO enviado previamente (emailAlreadySent)
          // 3. Tenant tiene owner con email
          const shouldSendEmail = wasNotVerifiedBefore && !emailAlreadySent && tenantData?.owner_user_id;
          
          if (shouldSendEmail) {
            const { data: userData } = await supabase.auth.admin.getUserById(tenantData.owner_user_id);

            if (userData?.user?.email) {
              try {
                console.log(`📧 Sending store ready email for ${domain} to ${userData.user.email}`);
                
                const notificationResponse = await supabase.functions.invoke(
                  "send-store-ready-notification",
                  {
                    body: {
                      domain: domain,
                      email: userData.user.email,
                      tenantId: domainRecord.tenant_id,
                    },
                  }
                );

                if (notificationResponse.error) {
                  console.error(`Email error for ${domain}:`, notificationResponse.error);
                } else {
                  console.log(`✅ Email sent successfully for ${domain}`);
                  
                  // MARCAR email como enviado en metadata
                  await supabase
                    .from("domain_purchases")
                    .update({
                      metadata: {
                        ...metadata,
                        email_sent: true,
                        email_sent_at: new Date().toISOString()
                      }
                    })
                    .eq("id", domainRecord.id);
                }

                results.push({ domain, success: true, emailSent: true });
              } catch (emailError) {
                console.error(`Failed to send email for ${domain}:`, emailError);
                results.push({ domain, success: true, emailSent: false, emailError: emailError.message });
              }
            }
          } else {
            const reason = emailAlreadySent ? 'Email already sent' : 
                           !wasNotVerifiedBefore ? 'DNS was already verified' : 
                           'No owner email';
            console.log(`⏭️ Skipping email for ${domain}: ${reason}`);
            results.push({ domain, success: true, emailSent: false, reason });
          }
        } else {
          console.log(`DNS not ready yet for ${domain}`);
          results.push({ domain, success: false, reason: "DNS not propagated" });
        }
      } catch (error) {
        console.error(`Error checking ${domain}:`, error);
        results.push({ domain, success: false, error: error.message });
      }
    }

    console.log(`DNS verification complete. Verified: ${verifiedCount}/${pendingDomains.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "DNS verification check completed",
        totalChecked: pendingDomains.length,
        verified: verifiedCount,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-dns-status:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

/**
 * Check if DNS is properly configured for a domain
 * This performs a real DNS lookup to verify propagation
 */
async function checkDnsStatus(domain: string): Promise<boolean> {
  try {
    // Use a public DNS resolver (Google DNS)
    const dnsUrl = `https://dns.google/resolve?name=${domain}&type=A`;
    
    const response = await fetch(dnsUrl, {
      headers: {
        "Accept": "application/dns-json",
      },
    });

    if (!response.ok) {
      console.error(`DNS lookup failed for ${domain}: ${response.statusText}`);
      return false;
    }

    const dnsData = await response.json();

    // Check if we got valid A records
    if (dnsData.Answer && dnsData.Answer.length > 0) {
      // Look for any valid Vercel IP
      const VALID_VERCEL_IPS = [
        "76.76.21.21",      // IP clásica de Vercel
        "216.198.79.1",     // Nuevo rango de Vercel
        "216.198.79.65",    // Nuevo rango de Vercel
        "64.29.17.1",       // Nuevo rango de Vercel
        "64.29.17.65"       // Nuevo rango de Vercel
      ];
      
      const hasCorrectIp = dnsData.Answer.some(
        (record: any) => record.type === 1 && VALID_VERCEL_IPS.includes(record.data)
      );

      if (hasCorrectIp) {
        const matchedIp = dnsData.Answer.find((r: any) => r.type === 1 && VALID_VERCEL_IPS.includes(r.data))?.data;
        console.log(`DNS correctly configured for ${domain} -> ${matchedIp}`);
        return true;
      } else {
        console.log(`DNS points to wrong IP for ${domain}:`, dnsData.Answer);
        return false;
      }
    }

    console.log(`No A records found for ${domain}`);
    return false;
  } catch (error) {
    console.error(`Error checking DNS for ${domain}:`, error);
    return false;
  }
}

serve(handler);
