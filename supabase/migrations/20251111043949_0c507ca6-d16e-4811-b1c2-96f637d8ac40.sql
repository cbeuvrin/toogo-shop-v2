-- Tabla para la cola de temas de blog
CREATE TABLE IF NOT EXISTS blog_topics_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  tone TEXT DEFAULT 'professional',
  length TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  generated_post_id UUID REFERENCES blog_posts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_blog_topics_status ON blog_topics_queue(status);
CREATE INDEX IF NOT EXISTS idx_blog_topics_created_at ON blog_topics_queue(created_at DESC);

-- Tabla de configuración para auto-generación
CREATE TABLE IF NOT EXISTS blog_auto_generation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  frequency_hours INTEGER DEFAULT 24 CHECK (frequency_hours > 0),
  notification_email TEXT,
  auto_publish BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar configuración por defecto
INSERT INTO blog_auto_generation_settings (enabled, frequency_hours, auto_publish)
VALUES (false, 24, false)
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE blog_topics_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_auto_generation_settings ENABLE ROW LEVEL SECURITY;

-- Solo superadmins pueden ver/modificar la cola de temas
CREATE POLICY "Superadmins can manage blog topics queue"
  ON blog_topics_queue
  FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Solo superadmins pueden ver/modificar configuración
CREATE POLICY "Superadmins can manage auto generation settings"
  ON blog_auto_generation_settings
  FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_blog_auto_generation_settings_updated_at
  BEFORE UPDATE ON blog_auto_generation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();