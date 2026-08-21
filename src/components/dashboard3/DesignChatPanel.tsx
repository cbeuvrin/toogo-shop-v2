import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { takeDesignSnapshot, restoreDesignSnapshot } from '@/lib/designSnapshots';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME =
  'Hola 👋 Soy tu diseñador. Dime qué cambiar de tu tienda: colores, textos de la portada, el anuncio, el ticker, la plantilla… Ejemplo: "pon la barra de anuncio con Envío gratis desde $500 en fondo negro".';

export const DesignChatPanel = () => {
  const { currentTenantId: tenantId } = useTenantContext();
  const { loadSettings } = useTenantSettings();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([{ role: 'assistant', content: WELCOME }]);
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  // Otras superficies (p. ej. el wizard "Diséñala con IA") anuncian sus
  // snapshots por evento; así el botón "Deshacer" de este panel también
  // cubre los cambios que ellas apliquen.
  useEffect(() => {
    const onSnapshot = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) setLastSnapshot(id);
    };
    window.addEventListener('toogo:design-snapshot', onSnapshot);
    return () => window.removeEventListener('toogo:design-snapshot', onSnapshot);
  }, []);

  const notifyUpdated = async () => {
    await loadSettings();
    window.dispatchEvent(new CustomEvent('toogo:design-updated'));
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !tenantId || busy) return;
    setBusy(true);
    setInput('');
    // El historial NO incluye el mensaje de bienvenida ni el mensaje actual.
    const history = messages
      .filter((m) => m.content !== WELCOME)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    // Snapshot ANTES de que la IA toque nada → habilita "Deshacer".
    const snap = await takeDesignSnapshot(tenantId, text.slice(0, 60));

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-ai-agent', {
        body: { tenantId, message: text, history },
      });
      if (error) throw error;
      setMessages((prev) => [...prev, { role: 'assistant', content: data?.response || 'Listo.' }]);
      if (snap) setLastSnapshot(snap);
      await notifyUpdated();
    } catch (e) {
      console.error('DesignChatPanel:', e);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Algo falló al aplicar el cambio. Inténtalo de nuevo en un momento.' },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    if (!tenantId || !lastSnapshot || busy) return;
    setBusy(true);
    const ok = await restoreDesignSnapshot(tenantId, lastSnapshot);
    setBusy(false);
    if (ok) {
      setLastSnapshot(null);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Listo, deshice el último cambio. Tu tienda volvió a como estaba.' }]);
      await notifyUpdated();
      toast({ title: 'Cambio deshecho' });
    } else {
      toast({ title: 'No se pudo deshacer', variant: 'destructive' });
    }
  };

  if (!tenantId) return null;

  return (
    <>
      {/* Botón flotante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-violet-700"
        >
          ✨ Diseñador IA
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 flex h-[560px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b bg-violet-600 px-4 py-3 text-white">
            <span className="font-semibold">✨ Diseñador IA</span>
            <div className="flex items-center gap-2">
              {lastSnapshot && (
                <button onClick={undo} disabled={busy} className="rounded-md bg-white/15 px-2 py-1 text-xs hover:bg-white/25">
                  ↩︎ Deshacer último cambio
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-xl leading-none" aria-label="Cerrar">×</button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === 'user'
                    ? 'ml-8 rounded-2xl rounded-br-sm bg-violet-600 px-3 py-2 text-sm text-white'
                    : 'mr-8 whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-gray-100 px-3 py-2 text-sm text-gray-900'
                }
              >
                {m.content}
              </div>
            ))}
            {busy && <div className="mr-8 rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-500">Aplicando…</div>}
            <div ref={endRef} />
          </div>

          <div className="flex items-end gap-2 border-t p-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Dime qué cambiar de tu tienda…"
              rows={2}
              className="min-h-0 flex-1 resize-none"
              disabled={busy}
            />
            <Button onClick={send} disabled={busy || !input.trim()}>Enviar</Button>
          </div>
        </div>
      )}
    </>
  );
};
