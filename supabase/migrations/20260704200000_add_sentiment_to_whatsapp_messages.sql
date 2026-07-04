-- El bot de WhatsApp analiza el sentimiento de cada mensaje y lo guarda en
-- whatsapp_messages.sentiment, pero la columna nunca existió (error PGRST204
-- logueado en cada mensaje). Valores que escribe el agente:
-- positive | neutral | negative | angry | purchase_intent
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS sentiment text
  CHECK (sentiment IN ('positive', 'neutral', 'negative', 'angry', 'purchase_intent'));

COMMENT ON COLUMN public.whatsapp_messages.sentiment IS
  'Sentimiento del mensaje detectado por el agente IA de WhatsApp';
