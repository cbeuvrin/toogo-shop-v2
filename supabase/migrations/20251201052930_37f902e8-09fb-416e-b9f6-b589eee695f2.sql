-- Tabla para usuarios de WhatsApp (vendedores)
CREATE TABLE IF NOT EXISTS public.whatsapp_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, phone_number)
);

-- Tabla para conversaciones de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_user_id UUID NOT NULL REFERENCES public.whatsapp_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  UNIQUE(whatsapp_user_id, customer_phone, status)
);

-- Tabla para mensajes de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'audio')),
  content TEXT,
  audio_url TEXT,
  meta_message_id TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla para logs de eventos de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_tenant ON public.whatsapp_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_phone ON public.whatsapp_users(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user ON public.whatsapp_conversations(whatsapp_user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON public.whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON public.whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_tenant ON public.whatsapp_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created ON public.whatsapp_logs(created_at DESC);

-- RLS Policies para whatsapp_users
ALTER TABLE public.whatsapp_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage their whatsapp users"
  ON public.whatsapp_users
  FOR ALL
  USING (
    has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) 
    OR has_role(auth.uid(), 'superadmin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) 
    OR has_role(auth.uid(), 'superadmin'::app_role)
  );

-- RLS Policies para whatsapp_conversations
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their conversations"
  ON public.whatsapp_conversations
  FOR SELECT
  USING (
    has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) 
    OR has_role(auth.uid(), 'tenant_staff'::app_role, tenant_id)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "System can manage conversations"
  ON public.whatsapp_conversations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies para whatsapp_messages
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view messages"
  ON public.whatsapp_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_conversations wc
      WHERE wc.id = conversation_id
      AND (
        has_role(auth.uid(), 'tenant_admin'::app_role, wc.tenant_id)
        OR has_role(auth.uid(), 'tenant_staff'::app_role, wc.tenant_id)
        OR has_role(auth.uid(), 'superadmin'::app_role)
      )
    )
  );

CREATE POLICY "System can manage messages"
  ON public.whatsapp_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies para whatsapp_logs
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can view their logs"
  ON public.whatsapp_logs
  FOR SELECT
  USING (
    has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "System can insert logs"
  ON public.whatsapp_logs
  FOR INSERT
  WITH CHECK (true);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whatsapp_users_updated_at
  BEFORE UPDATE ON public.whatsapp_users
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_users_updated_at();