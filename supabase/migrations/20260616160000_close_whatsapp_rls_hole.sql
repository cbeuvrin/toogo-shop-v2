-- SECURITY: close the anonymous read/write hole on the WhatsApp PII tables.
--
-- whatsapp_conversations and whatsapp_messages each had a "System can manage ..."
-- policy declared FOR ALL with USING(true) / WITH CHECK(true) and NO `TO` clause,
-- so it applied to EVERY role — including anon. That let anonymous visitors read
-- customers' phone numbers and message contents (and write rows).
--
-- These policies are unnecessary: the WhatsApp edge functions use the service_role
-- key, which BYPASSES RLS entirely, so they keep reading/writing without any policy.
-- The dashboard/admin keep their tenant-scoped SELECT policies ("Tenant users can
-- view their conversations/messages"), so legitimate access is unchanged.
--
-- Net effect: anonymous access removed; edge functions and dashboard unaffected.

DROP POLICY IF EXISTS "System can manage conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "System can manage messages" ON public.whatsapp_messages;
