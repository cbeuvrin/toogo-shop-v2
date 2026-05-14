import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { couponId, userId, tenantId, discountApplied, appliedTo } = await req.json();

    if (!couponId || !userId || !discountApplied || !appliedTo) {
      return new Response(
        JSON.stringify({ success: false, error: 'Faltan parámetros requeridos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // SECURITY FIX: Use atomic SQL increment to avoid race condition.
    // Previously: read current_uses, add +1, write back → two concurrent calls
    // could both read the same value and both write the same result.
    // Now: the increment happens in a single atomic DB operation.
    const { error: updateError } = await supabaseClient
      .from('coupons')
      .update({ current_uses: supabaseClient.raw('current_uses + 1') } as any)
      .eq('id', couponId);

    if (updateError) {
      console.error('Error updating coupon uses:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error al actualizar usos del cupón' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 2. Registrar el uso del cupón
    const { error: usageError } = await supabaseClient
      .from('coupon_usage')
      .insert({
        coupon_id: couponId,
        user_id: userId,
        tenant_id: tenantId,
        discount_applied: discountApplied,
        applied_to: appliedTo,
      });

    if (usageError) {
      console.error('Error inserting coupon usage:', usageError);

      // Revertir el incremento atómicamente si falla el registro de uso
      await supabaseClient
        .from('coupons')
        .update({ current_uses: supabaseClient.raw('current_uses - 1') } as any)
        .eq('id', couponId);

      return new Response(
        JSON.stringify({ success: false, error: 'Error al registrar uso del cupón' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Coupon applied successfully:', { couponId, userId, discountApplied });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in apply-coupon function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
