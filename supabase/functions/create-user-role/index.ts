import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRoleRequest {
  userId: string;
  tenantId: string;
  role: 'tenant_admin' | 'tenant_staff' | 'store_manager';
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, tenantId, role }: CreateUserRoleRequest = await req.json();

    if (!userId || !tenantId || !role) {
      return new Response(
        JSON.stringify({ success: false, error: "userId, tenantId y role son requeridos" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[create-user-role] Creating role ${role} for user ${userId} in tenant ${tenantId}`);

    // Verify tenant exists and user is the owner
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, owner_user_id')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant verification error:', tenantError);
      return new Response(
        JSON.stringify({ success: false, error: "Tenant no encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (tenant.owner_user_id !== userId) {
      console.error('User is not tenant owner:', { userId, ownerId: tenant.owner_user_id });
      return new Response(
        JSON.stringify({ success: false, error: "Usuario no autorizado para este tenant" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user already has a role for this tenant
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id, role')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existingRole) {
      console.log('User already has role:', existingRole);
      return new Response(
        JSON.stringify({ 
          success: true, 
          role: existingRole,
          message: "Usuario ya tiene un rol asignado"
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create user role using Service Role (bypasses RLS)
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        role: role
      })
      .select()
      .single();

    if (roleError) {
      console.error('Role creation error:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: "Error al crear el rol de usuario" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('✅ User role created successfully:', userRole);

    return new Response(
      JSON.stringify({ success: true, role: userRole }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (e: any) {
    console.error("[create-user-role] Unexpected error", e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message || "Error interno" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});