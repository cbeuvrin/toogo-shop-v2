import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, ArrowRight, ImageIcon, Upload, X } from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIQuickSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

type Stage = 'logo' | 'input' | 'loading' | 'success' | 'error';

interface AISetupResult {
  template_id: string;
  store_name: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  hero_title: string;
  hero_message: string;
  categories: string[];
  products: Array<{ title: string; price_mxn: number; description: string }>;
  announcement: string;
}

interface AISetupResponse {
  success: boolean;
  result: AISetupResult;
  logo_url: string | null;
  banner_url: string | null;
  product_images_count: number;
  logo_was_uploaded: boolean;
  message: string;
}

const LOADING_STEPS = [
  '🎯 Analizando tu negocio...',
  '🎨 Eligiendo plantilla y paleta de colores...',
  '🖼️ Generando logo y banner principal con IA...',
  '📸 Creando fotos demo de tus productos...',
  '🏷️ Configurando categorías y productos...',
  '✨ Dejando todo listo en tu tienda...',
];

export const AIQuickSetupModal = ({ open, onOpenChange, onComplete }: AIQuickSetupModalProps) => {
  const { currentTenantId } = useTenantContext();
  const [stage, setStage] = useState<Stage>('logo');
  const [description, setDescription] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AISetupResult | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [productImagesCount, setProductImagesCount] = useState(0);
  const [logoWasUploaded, setLogoWasUploaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // Logo upload: si el usuario ya tiene logo, lo sube y se usa para derivar la paleta
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage('logo');
    setDescription('');
    setLoadingStep(0);
    setResult(null);
    setLogoUrl(null);
    setBannerUrl(null);
    setErrorMsg('');
    setUploadedLogoUrl(null);
    setUploadingLogo(false);
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTenantId) return;
    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El logo debe pesar menos de 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `user-uploaded/${currentTenantId}/logo_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('logos')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: publicData } = supabase.storage.from('logos').getPublicUrl(path);
      setUploadedLogoUrl(publicData.publicUrl);
      toast.success('Logo subido. Toogi lo usará para tu tienda.');
    } catch (err: any) {
      console.error('Logo upload error:', err);
      toast.error('No pudimos subir el logo: ' + (err.message || 'error desconocido'));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentTenantId) {
      toast.error('No se detectó tu tienda. Recarga la página.');
      return;
    }
    if (description.trim().length < 10) {
      toast.error('Cuéntanos un poco más sobre tu negocio (mínimo 10 caracteres).');
      return;
    }

    setStage('loading');
    setLoadingStep(0);

    // Con 4 imágenes (logo + banner + 3 productos) en paralelo, el proceso tarda ~45-60s.
    // 6 pasos × 8s = 48s aprox.
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 8000);

    try {
      const { data, error } = await supabase.functions.invoke('ai-quick-setup', {
        body: {
          tenantId: currentTenantId,
          description: description.trim(),
          uploadedLogoUrl: uploadedLogoUrl || undefined,
        },
      });

      clearInterval(stepInterval);

      if (error) throw new Error(error.message || 'Error al generar setup');
      if (data?.error) throw new Error(data.error);
      if (!data?.success) throw new Error('Respuesta inesperada del servidor');

      const payload = data as AISetupResponse;
      setResult(payload.result);
      setLogoUrl(payload.logo_url);
      setBannerUrl(payload.banner_url);
      setProductImagesCount(payload.product_images_count || 0);
      setLogoWasUploaded(payload.logo_was_uploaded || false);
      setStage('success');
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error('AI quick setup error:', err);
      setErrorMsg(err.message || 'Algo salió mal generando tu tienda con IA');
      setStage('error');
    }
  };

  const handleAccept = () => {
    toast.success('¡Tu tienda quedó lista!');
    onComplete?.();
    onOpenChange(false);
    setTimeout(reset, 300);
    // Recargar la página para que se vea la tienda configurada
    setTimeout(() => window.location.reload(), 500);
  };

  const handleClose = () => {
    if (stage === 'loading') return; // no permitir cerrar mientras carga
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Pídele a Toogi que arme tu tienda
          </DialogTitle>
        </DialogHeader>

        {/* STAGE: LOGO — primera pregunta antes de ir al input */}
        {stage === 'logo' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Primero, una pregunta rápida: <strong>¿ya tenés un logo</strong> para tu tienda?
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleLogoFileChange}
            />

            {!uploadedLogoUrl ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="text-left p-4 rounded-2xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-md transition-all flex flex-col gap-2 disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    {uploadingLogo ? (
                      <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-purple-600" />
                    )}
                    <span className="font-semibold text-sm">Sí, tengo logo</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Subo mi logo y Toogi lo usa + extrae la paleta de colores
                  </p>
                </button>

                <button
                  onClick={() => setStage('input')}
                  className="text-left p-4 rounded-2xl border-2 border-purple-300 bg-purple-50 hover:border-purple-500 hover:shadow-md transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-purple-700" />
                    <span className="font-semibold text-sm text-purple-900">No, que Toogi lo genere</span>
                  </div>
                  <p className="text-xs text-purple-800">
                    Toogi crea un logo con IA basado en tu negocio
                  </p>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border border-gray-200 flex-shrink-0">
                    <img src={uploadedLogoUrl} alt="Logo subido" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-green-900">Logo cargado</p>
                    <p className="text-xs text-green-700">Toogi extraerá la paleta de colores de tu logo</p>
                  </div>
                  <button
                    onClick={() => setUploadedLogoUrl(null)}
                    className="text-gray-400 hover:text-red-500 p-1"
                    aria-label="Quitar logo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={() => setStage('input')}
                className="bg-purple-600 hover:bg-purple-700"
                disabled={uploadingLogo}
              >
                Continuar <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STAGE: INPUT */}
        {stage === 'input' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Cuéntale a Toogi qué vendes en una frase. Toogi elige una plantilla, los colores, te genera
              categorías, productos de ejemplo y el texto del hero — todo en menos de 30 segundos.
            </p>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Vendo café de especialidad orgánico desde Oaxaca, también granos enteros, molido y accesorios para preparar."
              rows={5}
              className="resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 text-right">{description.length} / 500</p>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-900">
              <strong>💡 Tip:</strong> mientras más específico seas con el rubro, materiales o estilo,
              mejor quedará la sugerencia. Después podrás editar todo desde el editor visual.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handleSubmit}
                disabled={description.trim().length < 10}
                className="bg-purple-600 hover:bg-purple-700 gap-2"
              >
                <Sparkles className="w-4 h-4" /> Generar mi tienda
              </Button>
            </div>
          </div>
        )}

        {/* STAGE: LOADING */}
        {stage === 'loading' && (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
              <p className="font-semibold text-gray-900">Toogi está trabajando...</p>
            </div>
            <div className="space-y-2">
              {LOADING_STEPS.map((label, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-sm transition-all ${
                    i < loadingStep
                      ? 'text-green-700'
                      : i === loadingStep
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-400'
                  }`}
                >
                  {i < loadingStep ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : i === loadingStep ? (
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" />
                  )}
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-center text-gray-400">Esto suele tardar 45-60 segundos (generando 5 imágenes con IA)</p>
          </div>
        )}

        {/* STAGE: SUCCESS */}
        {stage === 'success' && result && (
          <div className="py-2 space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900">¡Listo!</p>
                <p className="text-sm text-green-700">Toogi configuró tu tienda. Esto es lo que generó:</p>
              </div>
            </div>

            {/* Banner generado */}
            {bannerUrl && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Banner principal</span>
                <div className="mt-1 aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                  <img src={bannerUrl} alt="Banner generado" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                {logoUrl && (
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                    <img src={logoUrl} alt="Logo generado" className="w-full h-full object-contain" />
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500">Nombre</div>
                  <strong className="text-base">{result.store_name}</strong>
                </div>
              </div>
              <div>
                <span className="text-gray-500">Plantilla:</span>{' '}
                <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                  {result.template_id}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Colores:</span>
                <div className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: result.primary_color }} />
                <div className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: result.secondary_color }} />
                <div className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: result.background_color }} />
              </div>
              <div>
                <span className="text-gray-500">Hero:</span>
                <div className="mt-1 p-3 bg-gray-50 rounded text-sm whitespace-pre-line">{result.hero_title}</div>
                <p className="mt-1 text-xs text-gray-600 italic">{result.hero_message}</p>
              </div>
              <div>
                <span className="text-gray-500">{result.categories.length} categorías:</span>{' '}
                {result.categories.map(c => (
                  <span key={c} className="inline-block mr-1 mb-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs">{c}</span>
                ))}
              </div>
              <div>
                <span className="text-gray-500">{result.products.length} productos sugeridos:</span>
                <ul className="mt-1 space-y-1 text-xs">
                  {result.products.slice(0, 3).map((p, i) => (
                    <li key={i} className="flex justify-between gap-3 items-center">
                      <span className="text-gray-800 flex items-center gap-1">
                        {i < productImagesCount && (
                          <span className="text-green-600" title="Foto generada con IA">📸</span>
                        )}
                        {p.title}
                      </span>
                      <span className="font-semibold text-gray-900">${p.price_mxn}</span>
                    </li>
                  ))}
                  {result.products.length > 3 && (
                    <li className="text-gray-400">+ {result.products.length - 3} más (sin foto)</li>
                  )}
                </ul>
                {productImagesCount > 0 && (
                  <p className="text-xs text-green-700 mt-1">✓ {productImagesCount} fotos de productos generadas con IA</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
              💡 Las fotos y nombres son <strong>placeholders</strong> generados con IA. Después podrás editar
              precios y reemplazar con tus fotos reales desde el dashboard.
              {logoWasUploaded && <span className="block mt-1">🎨 Tu logo fue subido y la paleta se extrajo de él.</span>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>Volver al manual</Button>
              <Button onClick={handleAccept} className="bg-green-600 hover:bg-green-700 gap-2">
                Aceptar y ver mi tienda <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STAGE: ERROR */}
        {stage === 'error' && (
          <div className="py-2 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">No pudimos generar tu tienda</p>
                <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cerrar</Button>
              <Button onClick={() => setStage('input')}>Intentar de nuevo</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
