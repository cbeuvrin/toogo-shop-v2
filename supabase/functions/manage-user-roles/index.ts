import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      throw new Error('Unauthorized')
    }

    // Verify user is superadmin
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'superadmin')
      .single()

    if (!userRole) {
      throw new Error('Access denied. Superadmin role required.')
    }

    const { action, targetUserId, targetTenantId, newRole, reason } = await req.json()

    console.log(`Admin action: ${action} by ${user.email} on user ${targetUserId}`)

    switch (action) {
      case 'change_role':
        // Prevent superadmins from degrading themselves
        if (targetUserId === user.id && newRole !== 'superadmin') {
          throw new Error('Cannot change your own superadmin role')
        }

        // Update user role
        const { error: roleError } = await supabaseClient
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', targetUserId)

        if (roleError) throw roleError

        // Log the action
        await supabaseClient.rpc('log_admin_activity', {
          p_action_type: 'role_change',
          p_target_user_id: targetUserId,
          p_target_tenant_id: targetTenantId,
          p_description: `Role changed to ${newRole}`,
          p_metadata: { newRole, previousAction: 'role_change' }
        })

        break

      case 'suspend_user':
        if (!targetTenantId) {
          throw new Error('Cannot suspend user without tenant')
        }
        
        // Update tenant status to suspended
        const { error: suspendError } = await supabaseClient
          .from('tenants')
          .update({ status: 'suspended' })
          .eq('id', targetTenantId)

        if (suspendError) throw suspendError

        // Log the action
        await supabaseClient.rpc('log_admin_activity', {
          p_action_type: 'user_suspension',
          p_target_user_id: targetUserId,
          p_target_tenant_id: targetTenantId,
          p_description: `User suspended. Reason: ${reason || 'No reason provided'}`,
          p_metadata: { reason, action: 'suspend' }
        })

        break

      case 'reactivate_user':
        if (!targetTenantId) {
          throw new Error('Cannot reactivate user without tenant')
        }
        
        // Update tenant status to active
        const { error: reactivateError } = await supabaseClient
          .from('tenants')
          .update({ status: 'active' })
          .eq('id', targetTenantId)

        if (reactivateError) throw reactivateError

        // Log the action
        await supabaseClient.rpc('log_admin_activity', {
          p_action_type: 'user_reactivation',
          p_target_user_id: targetUserId,
          p_target_tenant_id: targetTenantId,
          p_description: 'User reactivated',
          p_metadata: { action: 'reactivate' }
        })

        break

      case 'delete_user':
        // HARD DELETE - Actually remove the user from auth.users
        console.log(`Hard deleting user: ${targetUserId}`)
        
        if (targetTenantId) {
          // If user has a tenant, soft delete the tenant first
          console.log(`Marking tenant ${targetTenantId} as cancelled`)
          const { error: deleteError } = await supabaseClient
            .from('tenants')
            .update({ status: 'cancelled' })
            .eq('id', targetTenantId)

          if (deleteError) {
            console.error('Error deleting tenant:', deleteError)
            throw deleteError
          }

          // Remove user roles for this tenant
          const { error: roleDeleteError } = await supabaseClient
            .from('user_roles')
            .delete()
            .eq('user_id', targetUserId)
            .eq('tenant_id', targetTenantId)

          if (roleDeleteError) {
            console.error('Error deleting user roles for tenant:', roleDeleteError)
            throw roleDeleteError
          }
        } else {
          // If user has no tenant (e.g., global admin), just remove their roles
          console.log(`Removing all roles for user without tenant: ${targetUserId}`)
          const { error: roleDeleteError } = await supabaseClient
            .from('user_roles')
            .delete()
            .eq('user_id', targetUserId)

          if (roleDeleteError) {
            console.error('Error deleting user roles:', roleDeleteError)
            throw roleDeleteError
          }
        }

        // HARD DELETE: Remove user from auth.users table
        console.log(`Deleting user from auth.users: ${targetUserId}`)
        const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(targetUserId)
        
        if (authDeleteError) {
          console.error('Error deleting user from auth:', authDeleteError)
          throw new Error(`Failed to delete user from authentication: ${authDeleteError.message}`)
        }

        console.log(`User ${targetUserId} successfully deleted from auth.users`)

        // Log the action
        await supabaseClient.rpc('log_admin_activity', {
          p_action_type: 'user_deletion',
          p_target_user_id: targetUserId,
          p_target_tenant_id: targetTenantId,
          p_description: `User permanently deleted. Reason: ${reason || 'No reason provided'}`,
          p_metadata: { reason, action: 'hard_delete', deletedFromAuth: true }
        })

        break

      default:
        throw new Error('Invalid action')
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Action completed successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in manage-user-roles:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})