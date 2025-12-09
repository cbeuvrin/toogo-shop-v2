import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { subdomain } = await req.json()
    
    if (!subdomain || typeof subdomain !== 'string') {
      console.error('Invalid subdomain:', subdomain)
      return new Response(
        JSON.stringify({ error: 'Subdomain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedSubdomain = subdomain.toLowerCase().trim()
    const fullDomain = `${normalizedSubdomain}.toogo.store`

    console.log('Checking subdomain availability:', fullDomain)

    // Usar service role para bypass RLS de manera segura
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .or(`primary_host.eq.${fullDomain},extra_hosts.cs.{${fullDomain}}`)
      .maybeSingle()

    if (error) {
      console.error('Error checking subdomain:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to check availability' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const available = !data
    console.log(`Subdomain ${fullDomain} is ${available ? 'available' : 'taken'}`)

    // Solo retorna si está disponible o no, SIN exponer datos
    return new Response(
      JSON.stringify({ available }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in check-subdomain-availability:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
