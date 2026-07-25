-- Correos capturados en la landing (hero / exit-intent). Insert vía edge
-- function capture-lead (service role). RLS bloquea acceso anon/authenticated;
-- se leen con service role o un RPC futuro para el admin.
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS leads_created_idx ON public.leads(created_at DESC);
