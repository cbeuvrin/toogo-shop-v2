import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { takeDesignSnapshot, restoreDesignSnapshot } from '@/lib/designSnapshots';

// Diseñador IA "modo estudio": pestaña propia del dashboard con el chat a la
// izquierda y la TIENDA REAL a la derecha (iframe del primary_host, que lee la
// misma base que escriben las herramientas — refleja hasta cambios de
// plantilla). Sustituye al panel flotante como superficie principal del chat.

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME =
  'Hola 👋 Soy tu diseñador. Dime qué cambiar de tu tienda y lo aplico al instante — mira el resultado aquí al lado.';

// Sugerencias clicables para el arranque en frío. VALIDAR CON CARLOS.
const SUGGESTIONS = [
  'Pon la barra de anuncio con «Envío gratis desde $500» en fondo negro',
  'Cámbiame la plantilla a Caribe',
  'Pon el título de la portada en dorado con la fuente Playfair',
];

export const DesignStudio = () => {
  const { currentTenantId: tenantId, availableTenants } = useTenantContext();
  const { loadSettings } = useTenantSettings();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([{ role: 'assistant', content: WELCOME }]);
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);
  // Cambiar la key remonta el iframe → recarga la tienda tras cada cambio.
  const [previewKey, setPreviewKey] = useState(1);
  const endRef = useRef<HTMLDivElement>(null);

  const host = availableTenants.find((t) => t.id === tenantId)?.primary_host || null;
  const storeUrl = host ? `https://${host}` : null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  // Snapshots anunciados por otras superficies (wizard de Fase 2) también
  // habilitan el Deshacer de este estudio.
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
    setPreviewKey((k) => k + 1);
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
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
      console.error('DesignStudio:', e);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Algo falló al aplicar el cambio. Inténtalo de nuevo en un momento.' },
      ]);
      // El agente puede haber aplicado herramientas ANTES de fallar (p. ej.
      // rate limit a mitad del loop): conserva el Deshacer y refresca igual.
      if (snap) setLastSnapshot(snap);
      await notifyUpdated();
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
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Listo, deshice el último cambio. Tu tienda volvió a como estaba.' },
      ]);
      await notifyUpdated();
      toast({ title: 'Cambio deshecho' });
    } else {
      toast({ title: 'No se pudo deshacer', variant: 'destructive' });
    }
  };

  if (!tenantId) return null;

  const showSuggestions = messages.length === 1 && !busy;

  return (
    <div className="flex h-[calc(100vh-230px)] min-h-[560px] gap-4">
      {/* ── Chat ── */}
      <div className="flex w-[400px] min-w-[320px] flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b bg-violet-600 px-4 py-3 text-white">
          <span className="font-semibold">✨ Diseñador IA</span>
          {lastSnapshot && (
            <button
              onClick={undo}
              disabled={busy}
              className="rounded-md bg-white/15 px-2 py-1 text-xs hover:bg-white/25"
            >
              ↩︎ Deshacer último cambio
            </button>
          )}
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
          {busy && (
            <div className="mr-8 rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-500">Aplicando…</div>
          )}
          {showSuggestions && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Prueba con</p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-left text-sm text-violet-800 transition hover:bg-violet-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
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
          <Button onClick={() => send()} disabled={busy || !input.trim()}>
            Enviar
          </Button>
        </div>
      </div>

      {/* ── Tienda en vivo ── */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
          <span className="truncate text-sm text-gray-500">{host ?? 'Tu tienda'}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewKey((k) => k + 1)}
              className="rounded-md border px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              ⟳ Recargar
            </button>
            {storeUrl && (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                Abrir ↗
              </a>
            )}
          </div>
        </div>
        {storeUrl ? (
          // key remonta el iframe; el query param evita caché del documento.
          <iframe
            key={previewKey}
            src={`${storeUrl}?_ai=${previewKey}`}
            title="Vista previa de tu tienda"
            className="h-full w-full flex-1 border-0"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-gray-500">
            No encontré la dirección de tu tienda. Recarga la página o revisa tu dominio en Mi Perfil.
          </div>
        )}
      </div>
    </div>
  );
};
