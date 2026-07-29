-- Canje de la promo de plan (atómico) + toggle superadmin.

-- Canje: valida propiedad del tenant, promo activa, cupos, no-doble-uso; otorga plan + expiry.
CREATE OR REPLACE FUNCTION public.redeem_plan_promo(p_code text, p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_promo public.plan_promos;
  v_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- El usuario debe pertenecer al tenant (dueño/admin).
  IF NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_uid AND ur.tenant_id = p_tenant_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_owner');
  END IF;

  -- Bloquea la fila de la promo para que el tope de cupos sea atómico.
  SELECT * INTO v_promo FROM public.plan_promos
    WHERE upper(code) = upper(trim(p_code)) AND active = true
    FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_inactive');
  END IF;
  IF v_promo.used_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sold_out');
  END IF;
  IF EXISTS (SELECT 1 FROM public.plan_promo_redemptions WHERE promo_id = v_promo.id AND tenant_id = p_tenant_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_redeemed');
  END IF;

  v_expires := now() + (v_promo.duration_days || ' days')::interval;

  UPDATE public.tenants
    SET plan = v_promo.plan_grant, plan_expires_at = v_expires
    WHERE id = p_tenant_id;

  INSERT INTO public.plan_promo_redemptions (promo_id, tenant_id) VALUES (v_promo.id, p_tenant_id);
  UPDATE public.plan_promos SET used_count = used_count + 1, updated_at = now() WHERE id = v_promo.id;

  RETURN jsonb_build_object('ok', true, 'plan', v_promo.plan_grant, 'expires_at', v_expires);
END;
$$;
GRANT EXECUTE ON FUNCTION public.redeem_plan_promo(text, uuid) TO authenticated;

-- Toggle (solo superadmin): prende/apaga la promo. Devuelve estado + contador.
CREATE OR REPLACE FUNCTION public.set_plan_promo_active(p_code text, p_active boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_promo public.plan_promos;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'superadmin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_superadmin');
  END IF;
  UPDATE public.plan_promos SET active = p_active, updated_at = now()
    WHERE upper(code) = upper(trim(p_code)) RETURNING * INTO v_promo;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  RETURN jsonb_build_object('ok', true, 'active', v_promo.active, 'used_count', v_promo.used_count, 'max_uses', v_promo.max_uses);
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_plan_promo_active(text, boolean) TO authenticated;

-- Estado completo para el panel del superadmin (contador, etc.).
CREATE OR REPLACE FUNCTION public.get_plan_promo_admin(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_promo public.plan_promos;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'superadmin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_superadmin');
  END IF;
  SELECT * INTO v_promo FROM public.plan_promos WHERE upper(code) = upper(trim(p_code));
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  RETURN jsonb_build_object('ok', true, 'code', v_promo.code, 'active', v_promo.active,
    'used_count', v_promo.used_count, 'max_uses', v_promo.max_uses, 'plan_grant', v_promo.plan_grant,
    'duration_days', v_promo.duration_days, 'title', v_promo.title);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_plan_promo_admin(text) TO authenticated;
