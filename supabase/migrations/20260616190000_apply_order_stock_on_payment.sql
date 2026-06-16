-- SECURITY / correctness: WhatsApp (manual-payment) orders no longer decrement
-- stock at creation (that let anonymous buyers deplete inventory without paying,
-- and unconfirmed inquiries reduced stock). Instead, the store owner applies stock
-- when they mark the order as "paid", via apply_order_stock() — atomic + idempotent.

-- Idempotency flag so stock is applied at most once per order.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_applied boolean NOT NULL DEFAULT false;

-- Pre-existing orders already had their stock decremented at creation (old
-- behavior), so mark them as applied to avoid decrementing them again on confirm.
UPDATE public.orders SET stock_applied = true WHERE stock_applied = false;

-- Applies an order's stock exactly once. Verifies the caller owns the order's
-- tenant (tenant_admin / superadmin). Safe to call repeatedly (no-op if applied).
CREATE OR REPLACE FUNCTION public.apply_order_stock(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  o RECORD;
  it RECORD;
BEGIN
  SELECT id, tenant_id, stock_applied INTO o FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF NOT (
    has_role(auth.uid(), 'tenant_admin'::app_role, o.tenant_id)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF o.stock_applied THEN
    RETURN jsonb_build_object('ok', true, 'already_applied', true);
  END IF;

  FOR it IN SELECT product_id, qty FROM public.order_items WHERE order_id = p_order_id LOOP
    PERFORM public.decrement_product_stock_safe(p_product_id := it.product_id, p_quantity := it.qty);
  END LOOP;

  UPDATE public.orders SET stock_applied = true WHERE id = p_order_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$;
