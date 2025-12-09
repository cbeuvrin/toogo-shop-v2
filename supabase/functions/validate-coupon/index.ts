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
    const { code, userId, applicableTo, amount } = await req.json();

    if (!code || !userId || !applicableTo || !amount) {
      return new Response(
        JSON.stringify({ isValid: false, error: 'Faltan parámetros requeridos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Verificar que el cupón existe
    const { data: coupon, error: couponError } = await supabaseClient
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (couponError || !coupon) {
      return new Response(
        JSON.stringify({ isValid: false, error: 'Cupón no válido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verificar que está activo
    if (!coupon.is_active) {
      return new Response(
        JSON.stringify({ isValid: false, error: 'Cupón inactivo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verificar que no ha expirado
    const now = new Date();
    const expiresAt = new Date(coupon.expires_at);
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ isValid: false, error: 'Cupón expirado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Verificar que no ha alcanzado el límite total de usos
    if (coupon.current_uses >= coupon.max_total_uses) {
      return new Response(
        JSON.stringify({ isValid: false, error: 'Cupón agotado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Verificar que el usuario no ha alcanzado su límite de usos
    const { data: userUsage, error: usageError } = await supabaseClient
      .from('coupon_usage')
      .select('*')
      .eq('coupon_id', coupon.id)
      .eq('user_id', userId);

    if (usageError) {
      console.error('Error checking user usage:', usageError);
      return new Response(
        JSON.stringify({ isValid: false, error: 'Error al verificar usos del cupón' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (userUsage && userUsage.length >= coupon.max_uses_per_user) {
      return new Response(
        JSON.stringify({ isValid: false, error: 'Ya has usado este cupón el máximo de veces permitidas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Verificar que aplica al tipo de compra
    if (coupon.applicable_to !== 'both' && coupon.applicable_to !== applicableTo) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: `Este cupón solo aplica a ${coupon.applicable_to === 'membership' ? 'membresías' : 'dominios'}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Calcular descuento
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (amount * coupon.discount_value) / 100;
      
      // Aplicar máximo descuento si está configurado
      if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
        discountAmount = coupon.max_discount_amount;
      }
    } else {
      // Fixed amount
      discountAmount = coupon.discount_value;
    }

    // No permitir que el descuento sea mayor al monto
    if (discountAmount > amount) {
      discountAmount = amount;
    }

    return new Response(
      JSON.stringify({
        isValid: true,
        coupon,
        discountAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-coupon function:', error);
    return new Response(
      JSON.stringify({ isValid: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
