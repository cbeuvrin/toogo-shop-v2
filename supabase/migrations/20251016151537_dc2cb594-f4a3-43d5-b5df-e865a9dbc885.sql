-- Primero agregar constraint único en tenant_id si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subscriptions_tenant_id_key'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_tenant_id_key UNIQUE (tenant_id);
  END IF;
END $$;

-- Ahora crear las suscripciones retroactivas con ON CONFLICT funcionando
INSERT INTO subscriptions (
  tenant_id,
  status,
  next_billing_date,
  amount_mxn,
  created_at,
  updated_at
) VALUES (
  '8142575f-b30d-4691-8bd5-1b632efeef35',
  'active',
  NOW() + INTERVAL '1 month',
  299,
  NOW(),
  NOW()
) ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO subscriptions (
  tenant_id,
  status,
  next_billing_date,
  amount_mxn,
  created_at,
  updated_at
) VALUES (
  'ad1e084f-c4f1-4610-8805-ea533c75b6bd',
  'active',
  NOW() + INTERVAL '1 month',
  299,
  NOW(),
  NOW()
) ON CONFLICT (tenant_id) DO NOTHING;