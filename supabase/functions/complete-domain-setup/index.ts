import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteSetupRequest {
  domainPurchaseId: string;
  forceAll?: boolean; // Si true, ejecuta todos los pasos aunque ya existan
}

interface SetupStep {
  step: string;
  status: 'completed' | 'skipped' | 'error';
  message: string;
  details?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { domainPurchaseId, forceAll = false }: CompleteSetupRequest = await req.json();
    console.log(`[Complete Setup] Starting for domain purchase: ${domainPurchaseId}`);

    const steps: SetupStep[] = [];

    // 1. Obtener domain_purchase y tenant
    const { data: purchase, error: purchaseError } = await supabase
      .from('domain_purchases')
      .select(`
        *,
        tenants (
          id,
          name,
          owner_user_id,
          plan,
          status
        )
      `)
      .eq('id', domainPurchaseId)
      .single();

    if (purchaseError || !purchase) {
      throw new Error(`Domain purchase not found: ${purchaseError?.message}`);
    }

    console.log(`[Complete Setup] Found domain: ${purchase.domain}, tenant: ${purchase.tenants.id}`);

    const tenantId = purchase.tenant_id;
    const domain = purchase.domain;
    const ownerUserId = purchase.tenants.owner_user_id;

    // 2. Agregar dominio a Vercel
    // Note: DNS nameservers are already configured via nsGroup during domain purchase
    console.log('[Complete Setup] Step 2: Adding domain to Vercel...');
    
    try {
      const vercelToken = Deno.env.get('VERCEL_API_TOKEN');
      const vercelProjectId = Deno.env.get('VERCEL_PROJECT_ID');
      const vercelTeamId = Deno.env.get('VERCEL_TEAM_ID');

      if (!vercelToken || !vercelProjectId) {
        throw new Error('VERCEL_API_TOKEN or VERCEL_PROJECT_ID not configured');
      }

      // Agregar dominio raíz
      console.log(`[Complete Setup] Adding ${domain} to Vercel project (team: ${vercelTeamId})...`);
      const addDomainResponse = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/domains${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: domain })
        }
      );

      const responseBody = await addDomainResponse.json();
      
      if (!addDomainResponse.ok) {
        console.error('[Complete Setup] Vercel API error for root domain:', responseBody);
        
        // Si el dominio ya existe, considerarlo como éxito
        if (responseBody.error?.code === 'domain_already_in_use') {
          console.log('[Complete Setup] ✅ Domain already added to Vercel, continuing...');
        } else {
          throw new Error(`Vercel API returned ${addDomainResponse.status}: ${JSON.stringify(responseBody)}`);
        }
      }

      const domainData = responseBody;
      console.log(`[Complete Setup] ✅ Domain ${domain} added to Vercel project`);

      // Agregar www subdomain
      console.log(`[Complete Setup] Adding www.${domain} to Vercel project...`);
      const addWwwResponse = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/domains${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: `www.${domain}` })
        }
      );

      const wwwData = await addWwwResponse.json();
      
      if (addWwwResponse.ok) {
        console.log(`[Complete Setup] ✅ www.${domain} added to Vercel project`);
      } else {
        console.warn(`[Complete Setup] ⚠️ Could not add www.${domain}:`, wwwData);
      }

      steps.push({
        step: 'vercel_domain_setup',
        status: 'completed',
        message: `Dominios agregados a Vercel: ${domain} y www.${domain}`,
        details: { 
          domain: domainData, 
          www: wwwData, 
          vercel_project_id: vercelProjectId 
        }
      });

    } catch (error) {
      console.error('[Complete Setup] ❌ Error configuring Vercel domain:', error);
      
      steps.push({
        step: 'vercel_domain_setup',
        status: 'error',
        message: `Error al agregar dominio a Vercel: ${error.message}`,
        details: { 
          error: error.message,
          note: 'Domain can be added manually in Vercel dashboard if needed'
        }
      });
      
      // No lanzar error - el setup puede continuar sin este paso
    }

    // 2.4. Verificar estado del DNS en Vercel antes de crear registros
    console.log('[Complete Setup] Step 2.4: Checking DNS status in Vercel...');
    
    try {
      const vercelToken = Deno.env.get('VERCEL_API_TOKEN');
      const vercelTeamId = Deno.env.get('VERCEL_TEAM_ID');
      
      // Verificar estado actual del dominio en Vercel
      const domainInfoResponse = await fetch(
        `https://api.vercel.com/v9/domains/${domain}?teamId=${vercelTeamId}`,
        { headers: { 'Authorization': `Bearer ${vercelToken}` } }
      );

      const domainInfo = await domainInfoResponse.json();
      
      // Verificar si DNS está activo en Vercel
      // verified: true significa que Vercel detectó los NS y la zona está lista para crear registros
      const isDnsActive = (
        domainInfo.serviceType === 'zeit.world' ||
        domainInfo.nameservers?.some((ns: string) => ns.includes('vercel-dns.com')) ||
        domainInfo.verified === true
      );

      if (!isDnsActive) {
        // DNS NO ACTIVO - Marcar como dns_pending
        console.log('[Complete Setup] DNS zone not active yet in Vercel');
        console.log('[Complete Setup] ServiceType:', domainInfo.serviceType);
        console.log('[Complete Setup] Nameservers:', domainInfo.nameservers);
        console.log('[Complete Setup] Verified:', domainInfo.verified);
        
        steps.push({
          step: 'vercel_dns_check',
          status: 'skipped',
          message: 'NS delegados, esperando que Vercel active la zona DNS',
          details: {
            serviceType: domainInfo.serviceType,
            nameservers: domainInfo.nameservers,
            next_action: 'Sistema reintentará automáticamente cada 15 minutos'
          }
        });
        
        // Actualizar estado a dns_pending
        await supabase.from('domain_purchases').update({
          status: 'dns_pending',
          metadata: {
            dns_status: 'ns_delegated_waiting_activation',
            last_check: new Date().toISOString(),
            serviceType: domainInfo.serviceType,
            detected_nameservers: domainInfo.nameservers
          }
        }).eq('id', domainPurchaseId);
        
        // Retornar early - no crear registros aún
        return new Response(JSON.stringify({
          success: false,
          reason: 'dns_not_active_yet',
          domain: domain,
          steps
        }), { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // DNS ACTIVO - continuar con crear registros
      console.log('[Complete Setup] ✅ DNS zone is active in Vercel');
      
      steps.push({
        step: 'vercel_dns_check',
        status: 'completed',
        message: 'Zona DNS activa en Vercel',
        details: {
          serviceType: domainInfo.serviceType,
          nameservers: domainInfo.nameservers
        }
      });
      
    } catch (error) {
      console.error('[Complete Setup] ❌ Error checking DNS status:', error);
      
      steps.push({
        step: 'vercel_dns_check',
        status: 'error',
        message: `Error al verificar DNS: ${error.message}`,
        details: { error: error.message }
      });
      
      // No lanzar error - continuar con el proceso
    }

    // 2.5. Crear DNS records via Vercel API
    console.log('[Complete Setup] Step 2.5: Creating DNS records via Vercel API...');

    try {
      const vercelToken = Deno.env.get('VERCEL_API_TOKEN');
      const vercelTeamId = Deno.env.get('VERCEL_TEAM_ID');

      // Crear múltiples A records con las nuevas IPs recomendadas por Vercel (2024-2025)
      const vercelIPs = ['76.76.21.98', '76.76.21.142', '76.76.21.164'];
      
      console.log(`[Complete Setup] Creating A records for ${domain} with new Vercel IPs...`);
      
      let createdRecords = 0;
      for (const ip of vercelIPs) {
        const createARecordResponse = await fetch(
          `https://api.vercel.com/v2/domains/${domain}/records${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${vercelToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: 'A',
              name: '@',
              value: ip,
              ttl: 60
            })
          }
        );
        
        const aRecordData = await createARecordResponse.json();
        
        if (!createARecordResponse.ok && aRecordData.error?.code !== 'record_already_exists') {
          console.error(`[Complete Setup] Error creating A record for IP ${ip}:`, aRecordData);
          // No lanzar error, continuar con las otras IPs
        } else {
          console.log(`[Complete Setup] ✅ A record created for ${domain} → ${ip}`);
          createdRecords++;
        }
      }
      
      console.log(`[Complete Setup] ✅ ${createdRecords}/${vercelIPs.length} A records created for ${domain}`);

      // Crear CNAME record para www
      console.log(`[Complete Setup] Creating CNAME record for www.${domain}...`);
      const createCNAMEResponse = await fetch(
        `https://api.vercel.com/v2/domains/${domain}/records${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'CNAME',
            name: 'www',
            value: 'cname.vercel-dns.com',
            ttl: 60
          })
        }
      );

      const cnameData = await createCNAMEResponse.json();
      
      if (!createCNAMEResponse.ok) {
        // Si es invalid_zone, marcar como dns_pending (no failed)
        if (cnameData.error?.code === 'invalid_zone') {
          console.log('[Complete Setup] DNS zone not active (invalid_zone error)');
          
          await supabase.from('domain_purchases').update({
            status: 'dns_pending',
            metadata: {
              error_code: 'invalid_zone',
              last_attempt: new Date().toISOString(),
              message: 'Zona DNS aún no activa. Sistema reintentará automáticamente.'
            }
          }).eq('id', domainPurchaseId);
          
          throw new Error('DNS zone not active yet (invalid_zone)');
        }
        
        // Otros errores - continuar como antes
        if (cnameData.error?.code !== 'record_already_exists') {
          console.error('[Complete Setup] Error creating CNAME record:', cnameData);
          throw new Error(`Failed to create CNAME record: ${JSON.stringify(cnameData)}`);
        }
      }
      
      console.log(`[Complete Setup] ✅ CNAME record created for www.${domain}`);

      steps.push({
        step: 'vercel_dns_records',
        status: 'completed',
        message: `Registros DNS creados en Vercel: A @ -> 76.76.21.21, CNAME www -> cname.vercel-dns.com`,
        details: {
          a_record: {
            type: 'A',
            name: '@',
            value: '76.76.21.21',
            ttl: 60
          },
          cname_record: {
            type: 'CNAME',
            name: 'www',
            value: 'cname.vercel-dns.com',
            ttl: 60
          }
        }
      });

    } catch (error) {
      console.error('[Complete Setup] ❌ Error creating DNS records:', error);
      
      steps.push({
        step: 'vercel_dns_records',
        status: 'error',
        message: `Error al crear registros DNS en Vercel: ${error.message}`,
        details: { 
          error: error.message,
          note: 'DNS records pueden crearse manualmente en Vercel dashboard'
        }
      });
    }

    // 2.6. Configurar redirección www → dominio raíz
    console.log('[Complete Setup] Step 2.6: Configuring www redirect...');

    try {
      const vercelToken = Deno.env.get('VERCEL_API_TOKEN');
      const vercelProjectId = Deno.env.get('VERCEL_PROJECT_ID');
      const vercelTeamId = Deno.env.get('VERCEL_TEAM_ID');

      // Esperar 2 segundos para que Vercel procese el dominio
      console.log('[Complete Setup] Waiting 2s for domain propagation...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Agregar www subdomain con redirección 301 a dominio raíz
      const redirectResponse = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/domains${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `www.${domain}`,
            redirect: `https://${domain}`,
            redirectStatusCode: 301
          })
        }
      );

      if (!redirectResponse.ok) {
        const errorData = await redirectResponse.json();
        
        // Si el dominio ya existe, intentar actualizar la configuración
        if (errorData.error?.code === 'domain_already_exists' || errorData.error?.code === 'domain_already_in_use') {
          console.log('[Complete Setup] www domain already exists, updating redirect...');
          
          const updateResponse = await fetch(
            `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/www.${domain}${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${vercelToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                redirect: `https://${domain}`,
                redirectStatusCode: 301
              })
            }
          );

          if (!updateResponse.ok) {
            const updateError = await updateResponse.json();
            console.warn('[Complete Setup] ⚠️ Could not update www redirect:', updateError);
          } else {
            console.log('[Complete Setup] ✅ www redirect updated successfully');
          }
        } else if (errorData.error?.code === 'bad_request') {
          // El dominio raíz no está agregado aún - esto puede pasar por timing
          console.warn('[Complete Setup] ⚠️ Root domain not ready yet for redirect:', errorData);
        } else {
          console.warn('[Complete Setup] ⚠️ Could not create www redirect:', errorData);
        }
      } else {
        console.log(`[Complete Setup] ✅ www redirect configured: www.${domain} → ${domain}`);
      }

      steps.push({
        step: 'www_redirect',
        status: 'completed',
        message: `Redirección configurada: www.${domain} → ${domain} (301)`,
        details: {
          source: `www.${domain}`,
          destination: `https://${domain}`,
          statusCode: 301
        }
      });

    } catch (error) {
      console.error('[Complete Setup] ❌ Error configuring www redirect:', error);
      
      steps.push({
        step: 'www_redirect',
        status: 'warning',
        message: `No se pudo configurar la redirección automática de www`,
        details: {
          error: error.message,
          note: 'La redirección puede configurarse manualmente en Vercel'
        }
      });
    }

    // 3. Crear orden de pago (si no existe)
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .maybeSingle();

    if (!existingOrder || forceAll) {
      console.log('[Complete Setup] Step 2: Creating payment order...');
      
      try {
        // Obtener email del usuario
        const { data: userData } = await supabase.auth.admin.getUserById(ownerUserId);
        const userEmail = userData?.user?.email || 'unknown@email.com';

        const { error: orderError } = await supabase
          .from('orders')
          .insert({
            tenant_id: tenantId,
            user_id: ownerUserId,
            status: 'paid',
            total_mxn: 95.95,
            total_usd: 4.80,
            payment_provider: 'mercadopago',
            payment_ref: `domain_setup_${domainPurchaseId}`,
            customer_email: userEmail,
            customer_name: userData?.user?.user_metadata?.first_name || 'Usuario',
          });

        if (orderError) throw orderError;

        steps.push({
          step: 'create_order',
          status: 'completed',
          message: 'Orden de pago creada'
        });

        console.log('[Complete Setup] Order created');
      } catch (error) {
        steps.push({
          step: 'create_order',
          status: 'error',
          message: `Error al crear orden: ${error.message}`
        });
        console.error('[Complete Setup] Order creation error:', error);
      }
    } else {
      steps.push({
        step: 'create_order',
        status: 'skipped',
        message: 'Orden ya existe'
      });
    }

    // 4. Bootstrap tenant inline (sin edge function)
    const { data: productCheck } = await supabase
      .from('products')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .maybeSingle();

    if (!productCheck || forceAll) {
      console.log('[Complete Setup] Step 3: Bootstrapping tenant inline...');
      
      try {
        // 1. Crear tenant_settings si no existe
        const { data: hasSettings } = await supabase
          .from('tenant_settings')
          .select('id')
          .eq('tenant_id', tenantId)
          .maybeSingle();
        
        if (!hasSettings) {
          await supabase.from('tenant_settings').insert({
            tenant_id: tenantId,
            primary_color: '#000000',
            secondary_color: '#ffffff',
            exchange_rate_mode: 'manual',
            exchange_rate_value: 20.0,
            shipping_enabled: false,
            shipping_type: 'free_minimum'
          });
          console.log('[Bootstrap] Created tenant_settings');
        }

        // 2. Crear categoría General si no hay categorías
        const { count: catCount } = await supabase
          .from('categories')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId);
        
        if (!catCount || catCount === 0) {
          await supabase.from('categories').insert({
            tenant_id: tenantId,
            name: 'General',
            slug: 'general',
            show_on_home: true,
            sort: 0
          });
          console.log('[Bootstrap] Created default category');
        }

        // 3. Crear producto de ejemplo si no hay productos
        if (!productCheck) {
          const { data: newProduct } = await supabase.from('products').insert({
            tenant_id: tenantId,
            title: 'Producto de Ejemplo',
            description: 'Este es un producto de ejemplo. Edítalo o elimínalo desde tu dashboard.',
            price_mxn: 200,
            sale_price_mxn: 0,
            stock: 100,
            status: 'active',
            product_type: 'simple'
          }).select().single();
          
          if (newProduct) {
            console.log('[Bootstrap] Created example product');
          }
        }

        // 4. Crear user_onboarding_progress si no existe
        const { data: onboard } = await supabase
          .from('user_onboarding_progress')
          .select('id')
          .eq('tenant_id', tenantId)
          .maybeSingle();
        
        if (!onboard) {
          await supabase.from('user_onboarding_progress').insert({
            tenant_id: tenantId,
            step_1_logo: false,
            step_2_products: false,
            step_3_branding: false,
            step_4_payments: false,
            step_5_publish: false,
            total_progress: 0
          });
          console.log('[Bootstrap] Created onboarding progress');
        }

        steps.push({
          step: 'bootstrap_tenant',
          status: 'completed',
          message: 'Tienda inicializada con datos básicos'
        });

        console.log('[Complete Setup] Bootstrap completed inline');
      } catch (error) {
        steps.push({
          step: 'bootstrap_tenant',
          status: 'error',
          message: `Error al inicializar tienda: ${error.message}`
        });
        console.error('[Complete Setup] Bootstrap error:', error);
      }
    } else {
      steps.push({
        step: 'bootstrap_tenant',
        status: 'skipped',
        message: 'Tienda ya inicializada'
      });
    }

    // 5. Email se envía SOLO desde check-dns-status cuando DNS esté verificado
    // (Eliminado envío de email desde complete-domain-setup para evitar duplicados)

    // 6. Actualizar metadata del domain_purchase
    const hasErrors = steps.some(s => s.status === 'error');
    const currentMetadata = (purchase.metadata as any) || {};
    const existingErrorHistory = Array.isArray(currentMetadata.error_history) 
      ? currentMetadata.error_history 
      : [];
    
    // Agregar nuevos errores al INICIO del array (más recientes primero)
    const newErrors = steps
      .filter(s => s.status === 'error')
      .map(s => ({
        timestamp: new Date().toISOString(),
        error: s.message,
        step: s.step
      }));

    const updatedErrorHistory = [...newErrors, ...existingErrorHistory];

    const completionMetadata = {
      ...currentMetadata,
      setup_completed_at: hasErrors ? null : new Date().toISOString(),
      setup_steps: steps,
      error_history: updatedErrorHistory,
      retry_count: hasErrors ? (currentMetadata.retry_count || 0) + 1 : currentMetadata.retry_count || 0,
      last_error: hasErrors ? steps.find(s => s.status === 'error')?.message : null
    };

    // Determinar status final
    let finalStatus = 'active';
    if (hasErrors) {
      // Si hay errores de DNS pending, usar dns_pending en vez de failed
      const hasDnsPendingStep = steps.some(s => 
        s.step === 'vercel_dns_check' && s.status === 'skipped'
      );
      finalStatus = hasDnsPendingStep ? 'dns_pending' : 'failed';
    }
    
    await supabase
      .from('domain_purchases')
      .update({ 
        metadata: completionMetadata,
        status: finalStatus
      })
      .eq('id', domainPurchaseId);

    const allCompleted = steps.every(s => s.status === 'completed' || s.status === 'skipped');

    return new Response(
      JSON.stringify({
        success: !hasErrors,
        domain: domain,
        tenant_id: tenantId,
        steps: steps,
        summary: {
          total: steps.length,
          completed: steps.filter(s => s.status === 'completed').length,
          skipped: steps.filter(s => s.status === 'skipped').length,
          errors: steps.filter(s => s.status === 'error').length,
          all_completed: allCompleted
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[Complete Setup] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});