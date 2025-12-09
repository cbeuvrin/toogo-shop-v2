import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BootstrapRequest {
  tenantName: string;
  primaryHost: string;
  flowType: 'subdomain' | 'domain';
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Bootstrap tenant process started');

    // Initialize Supabase with Service Role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ User authenticated:', user.email);

    // Parse request
    const { tenantName, primaryHost, flowType }: BootstrapRequest = await req.json();
    
    console.log('📝 Request data:', { tenantName, primaryHost, flowType, userId: user.id });

    // Step 1: Validate domain/subdomain availability
    console.log('🔍 Checking domain availability...');
    
    const { data: existingTenant, error: domainCheckError } = await supabaseAdmin
      .from('tenants')
      .select('id, name, owner_user_id')
      .eq('primary_host', primaryHost)
      .maybeSingle();

    if (domainCheckError) {
      console.error('❌ Domain check error:', domainCheckError);
      return new Response(
        JSON.stringify({ error: 'Error checking domain availability' }), 
        { status: 500, headers: corsHeaders }
      );
    }

    if (existingTenant) {
      console.log('❌ Domain already exists:', existingTenant);
      return new Response(
        JSON.stringify({ 
          error: 'Domain already exists',
          code: 'DOMAIN_EXISTS',
          details: { primaryHost, existingTenantName: existingTenant.name }
        }), 
        { status: 409, headers: corsHeaders }
      );
    }

    console.log('✅ Domain available');

    // Step 2: Create tenant
    console.log('🏢 Creating tenant...');
    
    const { data: newTenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert([{
        name: tenantName,
        primary_host: primaryHost,
        owner_user_id: user.id,
        plan: 'free',
        status: 'active'
      }])
      .select()
      .single();

    if (tenantError) {
      console.error('❌ Tenant creation failed:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Failed to create tenant', details: tenantError.message }), 
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Tenant created:', newTenant.id);

    // Step 3: Create tenant_admin role using Service Role (bypasses RLS)
    console.log('👤 Creating tenant_admin role...');
    
    const { data: newRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert([{
        user_id: user.id,
        tenant_id: newTenant.id,
        role: 'tenant_admin'
      }])
      .select()
      .single();

    if (roleError) {
      console.error('❌ Role creation failed:', roleError);
      // Try to cleanup tenant if role creation fails
      await supabaseAdmin.from('tenants').delete().eq('id', newTenant.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create admin role', details: roleError.message }), 
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Tenant admin role created:', newRole.id);

    // Step 4: Create tenant settings
    console.log('⚙️ Creating tenant settings...');
    
    const { error: settingsError } = await supabaseAdmin
      .from('tenant_settings')
      .insert([{
        tenant_id: newTenant.id,
        primary_color: '#000000',
        secondary_color: '#ffffff',
        shipping_enabled: false,
        exchange_rate_mode: 'manual',
        exchange_rate_value: 20.0
      }]);

    if (settingsError) {
      console.error('❌ Settings creation failed:', settingsError);
      // Continue anyway, settings can be created later
    } else {
      console.log('✅ Tenant settings created');
    }

    // Step 5: Create default category
    console.log('📂 Creating default category...');
    
    const { error: categoryError } = await supabaseAdmin
      .from('categories')
      .insert([{
        tenant_id: newTenant.id,
        name: 'General',
        slug: 'general',
        show_on_home: true,
        sort: 0
      }]);

    if (categoryError) {
      console.error('❌ Category creation failed:', categoryError);
      // Continue anyway, categories can be created later
    } else {
      console.log('✅ Default category created');
    }

    // Step 6: Initialize visual editor data
    console.log('🎨 Initializing visual editor...');
    
    const visualEditorData = [
      {
        tenant_id: newTenant.id,
        element_type: 'banner',
        element_id: 'banner_1',
        data: {
          imageUrl: '/assets/default-banner.jpg',
          sort: 0
        }
      },
      {
        tenant_id: newTenant.id,
        element_type: 'logo',
        element_id: 'main_logo',
        data: {
          url: '',
          alt: `Logo de ${tenantName}`
        }
      },
      {
        tenant_id: newTenant.id,
        element_type: 'contact',
        element_id: 'store_contact',
        data: {
          phone: '',
          email: user.email || '',
          address: '',
          hours: 'Lunes a Viernes: 9:00 AM - 6:00 PM'
        }
      }
    ];

    const { error: visualError } = await supabaseAdmin
      .from('visual_editor_data')
      .insert(visualEditorData);

    if (visualError) {
      console.error('❌ Visual editor initialization failed:', visualError);
      // Continue anyway, visual data can be created later
    } else {
      console.log('✅ Visual editor data initialized');
    }

    // Step 7: Create onboarding progress
    console.log('📋 Creating onboarding progress...');
    
    const { error: onboardingError } = await supabaseAdmin
      .from('user_onboarding_progress')
      .insert([{
        tenant_id: newTenant.id,
        step_1_logo: false,
        step_2_products: false,
        step_3_branding: false,
        step_4_payments: false,
        step_5_publish: false,
        total_progress: 0
      }]);

    if (onboardingError) {
      console.error('❌ Onboarding progress creation failed:', onboardingError);
      // Continue anyway
    } else {
      console.log('✅ Onboarding progress created');
    }

    console.log('🎉 Bootstrap process completed successfully!');

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        tenant: {
          id: newTenant.id,
          name: newTenant.name,
          primary_host: newTenant.primary_host,
          plan: newTenant.plan,
          status: newTenant.status
        },
        role: {
          id: newRole.id,
          role: newRole.role
        },
        message: 'Tenant created successfully with all required data'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Bootstrap process failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { status: 500, headers: corsHeaders }
    );
  }
});