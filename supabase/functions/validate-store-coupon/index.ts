import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CartItem {
  product_id: string;
  category_ids?: string[];
  quantity: number;
  price: number;
}

interface ValidateRequest {
  code: string;
  tenant_id: string;
  cart_items: CartItem[];
  user_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { code, tenant_id, cart_items, user_id }: ValidateRequest = await req.json();

    if (!code || !tenant_id || !cart_items) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Faltan parámetros requeridos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Validating coupon:', { code, tenant_id, cart_items_count: cart_items.length });

    // 1. Buscar cupón
    const { data: coupon, error: couponError } = await supabase
      .from('tenant_store_coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('tenant_id', tenant_id)
      .single();

    if (couponError || !coupon) {
      console.log('Coupon not found:', couponError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Cupón no encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validar estado del cupón
    if (!coupon.is_active) {
      return new Response(
        JSON.stringify({ valid: false, error: 'El cupón no está activo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    if (new Date(coupon.starts_at) > now) {
      return new Response(
        JSON.stringify({ valid: false, error: 'El cupón aún no es válido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(coupon.expires_at) < now) {
      return new Response(
        JSON.stringify({ valid: false, error: 'El cupón ha expirado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validar límites de uso
    if (coupon.max_total_uses && coupon.current_uses >= coupon.max_total_uses) {
      return new Response(
        JSON.stringify({ valid: false, error: 'El cupón ha alcanzado su límite de usos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Validar usos por usuario (si está autenticado)
    if (user_id && coupon.max_uses_per_user) {
      const { count } = await supabase
        .from('tenant_coupon_usage')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_id', user_id);

      if (count && count >= coupon.max_uses_per_user) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Ya has usado este cupón el número máximo de veces' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 5. Calcular subtotal del carrito
    const subtotal = cart_items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 6. Validar monto mínimo de compra
    if (coupon.minimum_purchase_amount && subtotal < coupon.minimum_purchase_amount) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: `El monto mínimo de compra es $${coupon.minimum_purchase_amount} MXN`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Validar productos/categorías aplicables
    let applicableAmount = 0;

    if (coupon.applies_to_all_products) {
      applicableAmount = subtotal;
    } else {
      const applicableProducts = coupon.applies_to_products || [];
      const applicableCategories = coupon.applies_to_categories || [];

      for (const item of cart_items) {
        // Check if product is directly applicable
        if (applicableProducts.includes(item.product_id)) {
          applicableAmount += item.price * item.quantity;
        }
        // Check if any category matches
        else if (item.category_ids?.some((catId: string) => applicableCategories.includes(catId))) {
          applicableAmount += item.price * item.quantity;
        }
      }
    }

    if (applicableAmount === 0) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Este cupón no aplica a los productos en tu carrito' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Calcular descuento
    let discountAmount = 0;

    if (coupon.discount_type === 'percentage') {
      discountAmount = (applicableAmount * coupon.discount_value) / 100;
      
      // Aplicar límite máximo si existe
      if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
        discountAmount = coupon.max_discount_amount;
      }
    } else {
      // fixed_amount
      discountAmount = Math.min(coupon.discount_value, applicableAmount);
    }

    // El descuento no puede ser mayor al subtotal
    discountAmount = Math.min(discountAmount, subtotal);

    console.log('Coupon validated successfully:', {
      coupon_id: coupon.id,
      discount_amount: discountAmount
    });

    return new Response(
      JSON.stringify({
        valid: true,
        coupon_id: coupon.id,
        discount_amount: Math.round(discountAmount * 100) / 100,
        coupon_code: coupon.code,
        coupon_name: coupon.name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating store coupon:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Error al validar el cupón' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
