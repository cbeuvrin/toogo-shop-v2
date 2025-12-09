import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log('[Retry Pending DNS] Starting cron job');

  // Buscar dominios pendientes con menos de 10 intentos
  const { data: pendingDomains, error } = await supabase
    .from('domain_purchases')
    .select('*')
    .eq('status', 'dns_pending')
    .lt('dns_check_attempts', 10);

  if (error) {
    console.error('[Retry] Error fetching pending domains:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  console.log(`[Retry] Found ${pendingDomains?.length || 0} pending domains`);

  const results = [];

  for (const domain of pendingDomains || []) {
    console.log(`[Retry] Attempting ${domain.domain} (attempt ${(domain.dns_check_attempts || 0) + 1})`);
    
    try {
      // Invocar complete-domain-setup
      const { data: setupResult, error: setupError } = await supabase.functions.invoke(
        'complete-domain-setup',
        { body: { domainPurchaseId: domain.id } }
      );

      // Incrementar contador de intentos
      await supabase
        .from('domain_purchases')
        .update({ 
          dns_check_attempts: (domain.dns_check_attempts || 0) + 1,
          metadata: {
            ...(domain.metadata as any || {}),
            last_retry_at: new Date().toISOString()
          }
        })
        .eq('id', domain.id);

      results.push({
        domain: domain.domain,
        success: !setupError,
        attempt: (domain.dns_check_attempts || 0) + 1
      });
    } catch (err) {
      console.error(`[Retry] Failed for ${domain.domain}:`, err);
      results.push({ domain: domain.domain, success: false, error: err.message });
    }
  }

  return new Response(
    JSON.stringify({ 
      checked: pendingDomains?.length || 0, 
      results 
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
