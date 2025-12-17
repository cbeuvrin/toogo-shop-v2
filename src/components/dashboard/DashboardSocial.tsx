import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { useTenantContext } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { Share2, Upload, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
export const DashboardSocial = () => {
  const {
    currentTenantId
  } = useTenantContext();
  const {
    settings,
    uploadShareImage,
    updateSettings,
    isLoading
  } = useTenantSettings();
  const {
    toast
  } = useToast();
  const [shareTitle, setShareTitle] = useState("");
  const [shareDescription, setShareDescription] = useState("");
  const [shareImageUrl, setShareImageUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  useEffect(() => {
    if (settings) {
      setShareTitle(settings.share_title || "");
      setShareDescription(settings.share_description || "");
      setShareImageUrl(settings.share_image_url || settings.logo_url || "");
    }
  }, [settings]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño de imagen
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      if (img.width < 600 || img.height < 315) {
        toast({
          title: "Advertencia",
          description: "Se recomienda una imagen de al menos 1200x630px para mejor calidad en redes sociales.",
          variant: "destructive"
        });
      }

      // Save directly to live share_image_url
      const url = await uploadShareImage(file, 'share_image_url');
      if (url) {
        setShareImageUrl(url);
        setPreviewImage(url);
      }
    };
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateSettings({
      share_title: shareTitle || null,
      share_description: shareDescription || null,
      share_image_url: shareImageUrl || null,
      share_approval_status: 'approved' // Auto-approve
    });
    setIsSaving(false);
    if (success) {
      toast({
        title: "✓ Cambios publicados",
        description: "Tu información se ha actualizado y está en vivo."
      });
    }
  };

  const titleLength = shareTitle.length;
  const descriptionLength = shareDescription.length;
  return <div className="space-y-6 p-6">
    <div>
      <h2 className="font-bold mb-2 flex items-center gap-2 text-xl">
        <Share2 className="w-8 h-8" />
        Compartir en Redes Sociales
      </h2>
      <p className="text-muted-foreground">
        Personaliza cómo se ve tu tienda cuando la compartes en WhatsApp, Facebook y otras redes sociales.
      </p>
    </div>

    {/* Technical Note */}
    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription>
        💡 <strong>Si no se actualiza la foto de tus enlaces en Facebook...</strong>
        <br /><br />
        Los cambios que haces se ven de inmediato en tu tienda. Pero piensa en las redes sociales como una Oficina de Identificación. La primera vez que compartes un enlace, ellas le toman una "foto" (la caché) para mostrar el título y la imagen.
        <br /><br />
        Si luego cambias esa foto, la red social sigue mostrando la vieja.
        <br /><br />
        <strong>Para forzar que vean tu nueva "foto":</strong>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>Copia el enlace de la página actualizada.</li>
          <li>Ve al "Depurador de Facebook" (es una herramienta oficial): 👉 <a href="https://developers.facebook.com/tools/debug/" target="_blank" rel="noopener noreferrer" className="underline">facebook.com/tools/debug</a></li>
          <li>Pega tu enlace, haz clic en "Depurar" y luego en "Volver a Extraer".</li>
        </ol>
        <br />
        Esto le dice a Facebook: "¡Olvida la foto vieja y toma una nueva!"
      </AlertDescription>
    </Alert>

    <div className="grid gap-6 md:grid-cols-2">
      {/* Left Column - Configuration */}
      <div className="space-y-6">
        {/* Title Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Título para compartir</CardTitle>
            <CardDescription>
              Aparecerá como encabezado principal (máx. 70 caracteres recomendado)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="share-title">Título</Label>
              <Input id="share-title" placeholder="Ej: Mi Tienda - Los mejores productos" value={shareTitle} onChange={e => setShareTitle(e.target.value)} maxLength={100} />
              <p className={`text-sm mt-1 ${titleLength > 70 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {titleLength}/70 caracteres {titleLength > 70 && "(Se recomienda menos de 70)"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Description Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Descripción para redes sociales</CardTitle>
            <CardDescription>
              Texto que aparecerá debajo del título (máx. 160 caracteres recomendado)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="share-description">Descripción</Label>
              <Textarea id="share-description" placeholder="Ej: Tienda online con envíos gratis en compras mayores a $500. ¡Descubre nuestros productos!" value={shareDescription} onChange={e => setShareDescription(e.target.value)} maxLength={300} rows={4} />
              <p className={`text-sm mt-1 ${descriptionLength > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {descriptionLength}/160 caracteres {descriptionLength > 160 && "(Se recomienda menos de 160)"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Image Card */}
        <Card>
          <CardHeader>
            <CardTitle>Imagen para compartir</CardTitle>
            <CardDescription>
              Imagen que se mostrará al compartir tu tienda (1200x630px recomendado)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(shareImageUrl || previewImage) && <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
              <img src={previewImage || shareImageUrl} alt="Preview" className="object-cover w-full h-full" />
            </div>}

            <div className="flex flex-col gap-2">
              <Label htmlFor="share-image" className="cursor-pointer">
                <Button type="button" variant="outline" className="w-full" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir nueva imagen
                  </span>
                </Button>
              </Label>
              <input id="share-image" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <p className="text-xs text-muted-foreground">
                Tamaño recomendado: 1200x630px. Si no subes una imagen, se usará tu logo.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isSaving || isLoading} className="w-full" size="lg">
          {isSaving ? "Guardando..." : <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Guardar cambios
          </>}
        </Button>
      </div>

      {/* Right Column - Preview */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Vista previa</CardTitle>
            <CardDescription>
              Así se verá tu tienda al compartir en redes sociales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* WhatsApp/Facebook Preview */}
            <div>
              <p className="text-sm font-medium mb-2">WhatsApp / Facebook</p>
              <div className="border rounded-lg overflow-hidden bg-card">
                {(shareImageUrl || previewImage) && <div className="aspect-video w-full overflow-hidden bg-muted">
                  <img src={previewImage || shareImageUrl} alt="Preview" className="object-cover w-full h-full" />
                </div>}
                <div className="p-4 space-y-1">
                  <p className="text-sm font-semibold line-clamp-2">
                    {shareTitle || settings?.share_title || "Título de tu tienda"}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {shareDescription || settings?.share_description || "Descripción de tu tienda online"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {window.location.hostname}
                  </p>
                </div>
              </div>
            </div>

            {/* Twitter Preview */}
            <div>
              <p className="text-sm font-medium mb-2">Twitter (X)</p>
              <div className="border rounded-lg overflow-hidden bg-card">
                {(shareImageUrl || previewImage) && <div className="aspect-video w-full overflow-hidden bg-muted">
                  <img src={previewImage || shareImageUrl} alt="Preview" className="object-cover w-full h-full" />
                </div>}
                <div className="p-3 space-y-1 border-t">
                  <p className="text-xs text-muted-foreground">
                    {window.location.hostname}
                  </p>
                  <p className="text-sm font-semibold line-clamp-1">
                    {shareTitle || settings?.share_title || "Título de tu tienda"}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {shareDescription || settings?.share_description || "Descripción de tu tienda online"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Consejos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span>Usa una imagen de 1200x630px para mejor calidad</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span>Mantén el título bajo 70 caracteres</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span>Mantén la descripción bajo 160 caracteres</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span>Incluye palabras clave importantes en la descripción</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span>Usa una imagen con texto legible y buen contraste</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>;
};