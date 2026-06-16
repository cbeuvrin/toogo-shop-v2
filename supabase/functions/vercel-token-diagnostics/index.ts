import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: this is an admin diagnostic that leaks infra info (Vercel team/
  // project IDs, token validity). Require the caller to be a super-admin.
  // It is only invoked from the admin panel (AdminDomainPurchases).
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false }, global: { headers: { Authorization: authHeader } }
  });
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: isSuperAdmin } = await adminClient.rpc('has_role', {
    _user_id: user.id, _role: 'superadmin'
  });
  if (!isSuperAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const vercelToken = Deno.env.get('VERCEL_API_TOKEN');
    const vercelProjectId = Deno.env.get('VERCEL_PROJECT_ID');
    const vercelTeamId = Deno.env.get('VERCEL_TEAM_ID');

    console.log('[Vercel Diagnostics] Checking configuration...');
    console.log(`VERCEL_API_TOKEN: ${vercelToken ? '✅ Present' : '❌ Missing'}`);
    console.log(`VERCEL_PROJECT_ID: ${vercelProjectId ? '✅ Present' : '❌ Missing'}`);
    console.log(`VERCEL_TEAM_ID: ${vercelTeamId ? '✅ Present' : '❌ Missing'}`);

    if (!vercelToken) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: 'VERCEL_API_TOKEN no configurado',
          details: 'Configura el token en Supabase Secrets'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!vercelProjectId) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: 'VERCEL_PROJECT_ID no configurado',
          details: 'Configura el Project ID en Supabase Secrets'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!vercelTeamId) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: 'VERCEL_TEAM_ID no configurado',
          details: 'Configura el Team ID en Supabase Secrets (carlos-projects-ec6fced7)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hacer una llamada de prueba a la API de Vercel
    console.log('[Vercel Diagnostics] Testing API call...');
    const testResponse = await fetch(
      `https://api.vercel.com/v2/domains?limit=1&teamId=${vercelTeamId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const testData = await testResponse.json();

    if (!testResponse.ok) {
      console.error('[Vercel Diagnostics] API call failed:', testData);
      
      // Detectar error de scope/SAML
      if (testData.error?.code === 'forbidden' && testData.error?.saml) {
        return new Response(
          JSON.stringify({
            valid: false,
            message: 'Error de autenticación con Vercel',
            details: `El token no tiene acceso al scope "${testData.error.scope}". Verifica que el token esté asociado al team correcto.`,
            errorCode: 'forbidden',
            scope: testData.error.scope,
            teamId: vercelTeamId,
            suggestion: 'Re-genera el token en Vercel asegurándote de seleccionar el team "Carlos\' projects"'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403
          }
        );
      }

      return new Response(
        JSON.stringify({
          valid: false,
          message: 'Error al validar credenciales de Vercel',
          details: testData.error?.message || JSON.stringify(testData),
          errorCode: testData.error?.code
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: testResponse.status
        }
      );
    }

    console.log('[Vercel Diagnostics] ✅ Validation successful');

    return new Response(
      JSON.stringify({
        valid: true,
        message: 'Todas las credenciales de Vercel son válidas',
        details: {
          teamId: vercelTeamId,
          projectId: vercelProjectId,
          apiCallSuccessful: true,
          domainsFound: testData.domains?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Vercel Diagnostics] Fatal error:', error);
    
    return new Response(
      JSON.stringify({
        valid: false,
        message: 'Error fatal durante el diagnóstico',
        details: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
