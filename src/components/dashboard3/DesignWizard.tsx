import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { TEMPLATES } from '@/lib/templatesCatalog';
import { applyThemeProposal, type ThemeProposal } from '@/lib/applyThemeProposal';
import { takeDesignSnapshot, setPendingSnapshot } from '@/lib/designSnapshots';

interface DesignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export const DesignWizard = ({ open, onOpenChange }: DesignWizardProps) => {
  const { currentTenantId: tenantId } = useTenantContext();
  const { loadSettings } = useTenantSettings();
  const { toast } = useToast();
  const [description, setDescription] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<number | null>(null);
  const [proposals, setProposals] = useState<ThemeProposal[]>([]);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: 'Usa una imagen JPG, PNG o WebP', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: 'La imagen es muy pesada (máximo 4 MB)', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setImageBase64(dataUrl.split(',')[1] ?? null);
      setMimeType(file.type);
      setPreviewUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!tenantId || loading) return;
    if (!imageBase64 && !description.trim()) {
      toast({ title: 'Sube una captura o describe tu estilo', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setProposals([]);
    try {
      const { data, error } = await supabase.functions.invoke('design-from-inspiration', {
        body: { tenantId, imageBase64, mimeType, description: description.trim() || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setProposals(data?.proposals ?? []);
    } catch (e: any) {
      console.error('DesignWizard analyze:', e);
      // FunctionsHttpError: el mensaje en español del servidor viaja en el
      // body del non-2xx (error.context); sin esto el usuario ve el genérico
      // "Edge Function returned a non-2xx status code" en inglés.
      let msg = (e as Error).message;
      try {
        const body = await e?.context?.json?.();
        if (body?.error) msg = body.error;
      } catch { /* body no-JSON: se queda el mensaje genérico */ }
      toast({ title: 'No pude analizar la inspiración', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const apply = async (p: ThemeProposal, idx: number) => {
    if (!tenantId || applying !== null) return;
    setApplying(idx);
    // Snapshot ANTES de aplicar. Se anuncia por evento para que el botón
    // "Deshacer" del DesignChat (columna del Editor Visual IA) cubra este cambio —
    // si no, el toast de abajo prometería algo falso.
    const snapId = await takeDesignSnapshot(tenantId, `antes del tema "${p.name}"`);
    if (snapId) {
      setPendingSnapshot(snapId);
      window.dispatchEvent(new CustomEvent('toogo:design-snapshot', { detail: { id: snapId } }));
    }
    const ok = await applyThemeProposal(tenantId, p);
    setApplying(null);
    if (ok) {
      await loadSettings();
      window.dispatchEvent(new CustomEvent('toogo:design-updated'));
      toast({
        title: 'Tema aplicado',
        description: snapId
          ? 'Puedes deshacerlo desde el Diseñador IA.'
          : 'No pude guardar el punto de restauración: este cambio no se podrá deshacer con un click.',
      });
      onOpenChange(false);
    } else {
      toast({ title: 'No se pudo aplicar el tema', variant: 'destructive' });
    }
  };

  const thumbFor = (templateId: string) => TEMPLATES.find((t) => t.id === templateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>✨ Diséñala con IA</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="captura">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="captura">Sube una captura</TabsTrigger>
            <TabsTrigger value="describe">Descríbela</TabsTrigger>
          </TabsList>

          <TabsContent value="captura" className="space-y-3">
            <label className="block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center text-sm text-gray-500 hover:border-violet-400">
              {previewUrl ? (
                <img src={previewUrl} alt="Inspiración" className="mx-auto max-h-48 rounded-lg" />
              ) : (
                <>Sube la captura de una tienda que te guste (JPG/PNG/WebP, máx 4 MB)</>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
            <p className="text-xs text-gray-500">
              Úsala como inspiración: crearemos un tema propio para tu marca, no una copia.
            </p>
          </TabsContent>

          <TabsContent value="describe" />
        </Tabs>

        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder='Cuéntame de tu negocio y el estilo que buscas. Ej: "vendo velas artesanales, quiero algo cálido y minimalista"'
          rows={3}
        />

        <Button onClick={analyze} disabled={loading} className="w-full">
          {loading ? 'Analizando…' : 'Proponme temas'}
        </Button>

        {proposals.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {proposals.map((p, i) => {
              const tpl = thumbFor(p.templateId);
              return (
                <div key={i} className="rounded-xl border p-3">
                  {tpl?.thumbnail && (
                    <img src={tpl.thumbnail} alt={tpl.name} className="mb-2 h-24 w-full rounded-lg object-cover object-top" />
                  )}
                  <p className="font-semibold">{p.name}</p>
                  <p className="mb-2 text-xs text-gray-500">
                    Plantilla {tpl?.name ?? p.templateId} · {p.rationale}
                  </p>
                  <div className="mb-3 flex gap-1.5">
                    {[p.colors.primary, p.colors.secondary, p.colors.background, p.colors.navbar].map((c, j) => (
                      <span key={j} className="h-6 w-6 rounded-full border" style={{ backgroundColor: c }} title={c} />
                    ))}
                  </div>
                  {(p.announcementText || p.tickerText) && (
                    <div className="mb-3 space-y-1 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                      {p.announcementText && <p>📢 {p.announcementText}</p>}
                      {p.tickerText && <p>〰️ {p.tickerText}</p>}
                    </div>
                  )}
                  <Button size="sm" className="w-full" disabled={applying !== null} onClick={() => apply(p, i)}>
                    {applying === i ? 'Aplicando…' : 'Aplicar este tema'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
