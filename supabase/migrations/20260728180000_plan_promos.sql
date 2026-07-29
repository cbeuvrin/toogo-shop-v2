-- Promo de PLAN (regalar el plan pagado gratis X tiempo a las primeras N tiendas).
-- Distinto de los cupones de checkout de las tiendas (coupons/*).

-- 1) Vencimiento del plan: registra cuándo termina el plan otorgado por promo.
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

-- 2) Config de la promo (una fila por código). Carlos controla `active` y ve `used_count`.
CREATE TABLE IF NOT EXISTS public.plan_promos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  active boolean NOT NULL DEFAULT false,
  plan_grant public.plan_type NOT NULL DEFAULT 'basic',
  duration_days int NOT NULL DEFAULT 365,
  max_uses int NOT NULL DEFAULT 100,
  used_count int NOT NULL DEFAULT 0,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plan_promos ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas: solo se accede vía RPC SECURITY DEFINER (lectura del estado
-- público) y edge functions con service_role (canje y toggle). Deny-all por defecto.

-- 3) Redenciones: evita doble uso por tenant + auditoría.
CREATE TABLE IF NOT EXISTS public.plan_promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL REFERENCES public.plan_promos(id),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promo_id, tenant_id)
);
ALTER TABLE public.plan_promo_redemptions ENABLE ROW LEVEL SECURITY;

-- 4) RPC pública: estado de la promo activa para el popup (sin exponer toda la tabla).
CREATE OR REPLACE FUNCTION public.get_active_plan_promo()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
       'active', true,
       'code', p.code,
       'title', p.title,
       'plan_grant', p.plan_grant,
       'duration_days', p.duration_days,
       'remaining', GREATEST(p.max_uses - p.used_count, 0)
     )
     FROM public.plan_promos p
     WHERE p.active = true AND p.used_count < p.max_uses
     ORDER BY p.created_at DESC
     LIMIT 1),
    jsonb_build_object('active', false)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_active_plan_promo() TO anon, authenticated;

-- 5) Semilla: promo inactiva (Carlos la prende cuando quiera). Basic, 1 año, 100 cupos.
INSERT INTO public.plan_promos (code, active, plan_grant, duration_days, max_uses, title)
VALUES ('TOOGO100', false, 'basic', 365, 100, 'Primeras 100 tiendas: plan Basic gratis 1 año')
ON CONFLICT (code) DO NOTHING;
