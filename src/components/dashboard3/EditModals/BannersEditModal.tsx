import React, { useState, useEffect, useRef } from "react";
import { Upload, X, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { DEMO_STORE_ID } from "@/lib/constants";
import { ImageCropperModal } from "@/components/ui/ImageCropperModal";
import { fileToDataUrl } from "@/utils/cropImage";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FocalPointPicker } from "@/components/ui/FocalPointPicker";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/** Returns the correct crop aspect ratio per template and slot */
function getBannerAspectRatio(templateId: string | undefined, index: number): number {
  const t = (templateId || "default").toLowerCase();

  if (t.includes("fashion") && !t.includes("hero") && !t.includes("trendy")) {
    // FashionTemplate: [0] portrait 4:5, [1] cuadrado 1:1, [2] portrait 3:4
    const ratios = [4 / 5, 1, 3 / 4];
    return ratios[index] ?? 4 / 5;
  }
  if (t.includes("trendy") || t.includes("hero")) {
    // TrendyFashion y FashionHero: imagen portrait en el héroe
    return 3 / 4;
  }
  if (t.includes("minimal")) return 21 / 9;
  if (t.includes("premium_brand")) return 16 / 9;
  if (t.includes("nature")) {
    // Nature: [0] hero landscape 16:9, [1,2] portrait 3:4, [3] landscape 4:3
    if (index === 0) return 16 / 9;
    if (index === 3) return 4 / 3;
    return 3 / 4;
  }
  if (t.includes("bauhaus")) {
    // Bauhaus: [0] portrait hero 3:4, [1,2] portrait grandes 4:5
    if (index === 0) return 3 / 4;
    return 4 / 5;
  }
  if (t.includes("cyber")) return 16 / 9;
  // default / simple_live — carrusel landscape
  return 8 / 3;
}

interface BannerItem {
  id: string;
  imageUrl: string;
  sort: number;
  position?: string;
}

interface BannersEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BannerItem[], heroText: { title: string; description: string }) => void;
  initialData?: BannerItem[];
  initialHeroText?: {
    title: string;
    description: string;
  };
  templateId?: string;
}

/** Returns label info per slot index based on active template */
function getBannerSlotInfo(templateId: string | undefined, index: number): { label: string; hint: string } {
  const template = (templateId || "default").toLowerCase();

  if (template.includes("fashion") && !template.includes("hero") && !template.includes("trendy")) {
    // FashionTemplate uses banners[0] = big hero, [1] = top small, [2] = bottom small
    const labels = [
      { label: "Foto Grande – Héroe Izquierdo", hint: "Imagen principal grande a la izquierda (recomendado: 4:5)" },
      { label: "Foto Pequeña – Esquina Superior", hint: "Imagen pequeña en la parte superior derecha (recomendado: 1:1)" },
      { label: "Foto Pequeña – Esquina Inferior", hint: "Imagen pequeña en la parte inferior derecha (recomendado: 3:4)" },
      { label: "Banner 4 (no usado)", hint: "Esta plantilla no usa un cuarto banner" },
    ];
    return labels[index] || labels[3];
  }

  if (template.includes("nature")) {
    // NatureTemplate: [0] = hero principal, [1,2,3] = grid de fotos
    const labels = [
      { label: "Foto Héroe Principal", hint: "Imagen de fondo grande del héroe (recomendado: 16:9)" },
      { label: "Foto Grid 1 – Arriba Derecha", hint: "Primera imagen del grid de tres fotos (recomendado: portrait)" },
      { label: "Foto Grid 2 – Centro Derecha", hint: "Segunda imagen del grid de tres fotos (recomendado: portrait)" },
      { label: "Foto Grid 3 – Abajo Izquierda", hint: "Tercera imagen del grid de tres fotos (recomendado: landscape)" },
    ];
    return labels[index] || { label: `Imagen ${index + 1}`, hint: "" };
  }

  if (template.includes("trendy")) {
    const labels = [
      { label: "Foto Héroe – Forma Orgánica", hint: "Imagen principal en el héroe con forma orgánica (recomendado: portrait)" },
      { label: "Banner 2 (no usado en esta plantilla)", hint: "" },
      { label: "Banner 3 (no usado en esta plantilla)", hint: "" },
      { label: "Banner 4 (no usado en esta plantilla)", hint: "" },
    ];
    return labels[index] || labels[0];
  }

  if (template.includes("hero")) {
    const labels = [
      { label: "Foto Héroe – Lado Izquierdo", hint: "Foto principal grande al lado izquierdo (recomendado: 3:5)" },
      { label: "Banner 2 (no usado)", hint: "" },
      { label: "Banner 3 (no usado)", hint: "" },
      { label: "Banner 4 (no usado)", hint: "" },
    ];
    return labels[index] || labels[0];
  }

  if (template.includes("minimal")) {
    const labels = [
      { label: "Foto Héroe Principal", hint: "Imagen grande del héroe (recomendado: 21:9)" },
      { label: "Banner 2 (no usado)", hint: "" },
      { label: "Banner 3 (no usado)", hint: "" },
      { label: "Banner 4 (no usado)", hint: "" },
    ];
    return labels[index] || labels[0];
  }

  if (template.includes("premium_brand")) {
    return index === 0
      ? { label: "Foto Héroe Principal", hint: "Imagen de fondo del héroe (recomendado: 16:9)" }
      : { label: `Banner ${index + 1} (no usado)`, hint: "" };
  }

  if (template.includes("bauhaus")) {
    const labels = [
      { label: "Foto Héroe – Asimétrica", hint: "Imagen vertical del héroe con marco amarillo (recomendado: 3:4)" },
      { label: "Banner Manifiesto Izquierdo", hint: "Bloque vertical con texto sobreimpreso (recomendado: 4:5)" },
      { label: "Banner Manifiesto Derecho", hint: "Bloque vertical con texto sobreimpreso (recomendado: 4:5)" },
      { label: "Banner 4 (no usado)", hint: "Esta plantilla solo usa 3 banners" },
    ];
    return labels[index] || labels[3];
  }

  if (template.includes("cyber")) {
    return index === 0
      ? { label: "Foto Héroe – Glassmorphic", hint: "Imagen del héroe con marcos neón en las esquinas (recomendado: 16:9)" }
      : { label: `Banner ${index + 1} (no usado)`, hint: "Esta plantilla solo usa un banner principal" };
  }

  // Default / SimpleLive / generic
  const defaultLabels = [
    { label: index === 0 ? "Banner 1 – Principal (Obligatorio)" : `Banner ${index + 1}`, hint: index === 0 ? "Banner siempre visible (recomendado: 16:9)" : "Banners adicionales del carrusel" },
  ];
  return defaultLabels[0];
}



export const BannersEditModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  initialHeroText,
  templateId,
}: BannersEditModalProps) => {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [heroTitle, setHeroTitle] = useState("");
  const [heroDescription, setHeroDescription] = useState("");
  const [uploadingStates, setUploadingStates] = useState<boolean[]>([false, false, false, false]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  const {
    currentTenantId,
    isSuperAdmin
  } = useTenantContext();

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const [currentBannerIndex, setCurrentBannerIndex] = useState<number>(0);

  // For superadmins, use Demo Store tenant ID as fallback
  const tenantId = currentTenantId || (isSuperAdmin ? DEMO_STORE_ID : null);

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setBanners(initialData.sort((a, b) => a.sort - b.sort));
    } else {
      setBanners([]);
    }

    if (initialHeroText) {
      setHeroTitle(initialHeroText.title || "");
      setHeroDescription(initialHeroText.description || "");
    }
  }, [initialData, initialHeroText, isOpen]);

  const removeBanner = (index: number) => {
    if (index === 0) {
      toast.error("El Banner 1 es obligatorio y no se puede eliminar");
      return;
    }
    const newBanners = [...banners];
    if (newBanners[index]) {
      newBanners[index] = {
        id: `placeholder_${index}`,
        imageUrl: "/placeholder.svg",
        sort: index,
        position: "center center",
      };
    }
    setBanners(newBanners);
  };

  const updatePosition = (index: number, position: string) => {
    const newBanners = [...banners];
    if (newBanners[index]) {
      newBanners[index] = { ...newBanners[index], position };
    } else {
      // ensure slot exists
      while (newBanners.length <= index) {
        newBanners.push({ id: `placeholder_${newBanners.length}`, imageUrl: "/placeholder.svg", sort: newBanners.length, position: "center center" });
      }
      newBanners[index] = { ...newBanners[index], position };
    }
    setBanners(newBanners);
  };

  const validateFile = (file: File): string | null => {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      return "Solo se permiten archivos JPG, PNG y WebP";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "El archivo debe ser menor a 5MB";
    }
    return null;
  };

  const handleUploadClick = (bannerIndex: number) => {
    fileInputRefs.current[bannerIndex]?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, bannerIndex: number) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      event.target.value = '';
      return;
    }
    if (!tenantId) {
      console.error('No tenant ID available for banner upload');
      toast.error('No se pudo determinar el tenant');
      event.target.value = '';
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setImageToCrop(dataUrl);
      setCurrentBannerIndex(bannerIndex);
      setCropperOpen(true);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error("Error al leer la imagen");
    }

    event.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const bannerIndex = currentBannerIndex;

    const newUploadingStates = [...uploadingStates];
    newUploadingStates[bannerIndex] = true;
    setUploadingStates(newUploadingStates);

    try {
      const previewUrl = URL.createObjectURL(croppedBlob);
      const newBanners = [...banners];

      while (newBanners.length <= bannerIndex) {
        newBanners.push({
          id: `placeholder_${newBanners.length}`,
          imageUrl: "/placeholder.svg",
          sort: newBanners.length,
          position: "center center",
        });
      }
      newBanners[bannerIndex] = {
        id: `banner_${Date.now()}`,
        imageUrl: previewUrl,
        sort: bannerIndex,
        position: newBanners[bannerIndex]?.position || "center center",
      };
      setBanners(newBanners);

      const fileName = `banner_${Date.now()}.jpg`;
      const filePath = `${tenantId}/${fileName}`;
      const { data, error } = await supabase.storage.from('banners').upload(filePath, croppedBlob, {
        contentType: 'image/jpeg'
      });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(filePath);

      newBanners[bannerIndex] = {
        ...newBanners[bannerIndex],
        imageUrl: publicUrl
      };
      setBanners([...newBanners]);

      URL.revokeObjectURL(previewUrl);
      toast.success(`Imagen ${bannerIndex + 1} subida exitosamente`);
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error("Error al subir la imagen");

      const resetBanners = [...banners];
      while (resetBanners.length <= bannerIndex) {
        resetBanners.push({ id: `placeholder_${resetBanners.length}`, imageUrl: "/placeholder.svg", sort: resetBanners.length, position: "center center" });
      }
      resetBanners[bannerIndex] = { id: `placeholder_${bannerIndex}`, imageUrl: "/placeholder.svg", sort: bannerIndex, position: "center center" };
      setBanners(resetBanners);
    } finally {
      const resetUploadingStates = [...uploadingStates];
      resetUploadingStates[bannerIndex] = false;
      setUploadingStates(resetUploadingStates);
    }
  };

  const handleSave = () => {
    if (!banners[0] || banners[0].imageUrl === "/placeholder.svg") {
      toast.error("La primera imagen es obligatoria");
      return;
    }

    const validBanners = banners
      .filter(banner => banner.imageUrl !== "/placeholder.svg")
      .map(b => ({
        ...b,
        imageUrl: `${b.imageUrl}?cb=${Date.now()}`,
        position: b.position || "center center",
      }));

    onSave(validBanners, { title: heroTitle, description: heroDescription });
    toast.success("Imágenes y textos guardados exitosamente");
  };

  // Determine how many slots to show based on template
  const getSlotCount = () => {
    const t = (templateId || "").toLowerCase();
    if (t.includes("nature")) return 4;
    if (t.includes("fashion") && !t.includes("hero") && !t.includes("trendy")) return 3;
    if (t.includes("bauhaus")) return 3;
    if (t.includes("cyber")) return 1;
    if (t.includes("hero") || t.includes("trendy") || t.includes("minimal") || t.includes("premium_brand")) return 1;
    return 4; // default / simple_live
  };

  const slotCount = getSlotCount();

  const bannerSlots = Array.from({ length: slotCount }, (_, index) => banners[index] || {
    id: `placeholder_${index}`,
    imageUrl: "/placeholder.svg",
    sort: index,
    position: "center center",
  });

  return <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-4xl rounded-[30px] h-[90vh] overflow-hidden flex flex-col" aria-describedby="banners-edit-description">
      <DialogHeader className="relative shrink-0">
        <DialogTitle>Editar Imágenes de la Plantilla</DialogTitle>
        <p id="banners-edit-description" className="sr-only">
          Modal para editar imágenes y su posicionamiento
        </p>
        <DialogClose className="absolute right-0 top-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogHeader>

      <ScrollArea className="flex-1 min-h-0 pr-4">
        <div className="space-y-6">
          {/* Info Text */}
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              Solo JPG, PNG y WebP — Máximo 5MB por imagen
            </p>
          </div>

          {/* Banner Text Config */}
          <div className="space-y-4 bg-muted/30 p-4 rounded-lg border">
            <div>
              <Label htmlFor="hero-title">Título del Héroe</Label>
              <Input
                id="hero-title"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="Ej. Para Nuestros Atletas Híbridos"
              />
            </div>
            <div>
              <Label htmlFor="hero-description">Mensaje del Héroe</Label>
              <Textarea
                id="hero-description"
                value={heroDescription}
                onChange={(e) => setHeroDescription(e.target.value)}
                placeholder="Ej. Cuando lo das todo, tu equipo también debería hacerlo."
              />
            </div>
          </div>

          {/* Image Slots */}
          <div className="space-y-8">
            {bannerSlots.map((banner, index) => {
              const slotInfo = getBannerSlotInfo(templateId, index);
              const currentPosition = banner.position || "center center";
              const aspectRatio = getBannerAspectRatio(templateId, index);
              // Convert ratio number to CSS paddingBottom for aspect-ratio box
              const paddingBottom = `${(1 / aspectRatio) * 100}%`;
              const hasImage = banner.imageUrl !== "/placeholder.svg";

              return <React.Fragment key={banner.id}>
                <div className="space-y-4 border rounded-xl p-4 bg-card">
                  {/* Slot header */}
                  <div>
                    <h4 className="font-semibold text-sm">{slotInfo.label}</h4>
                    {slotInfo.hint && (
                      <p className="text-xs text-muted-foreground mt-0.5">{slotInfo.hint}</p>
                    )}
                  </div>

                  {/* Image Preview — dynamic aspect ratio */}
                  <div
                    className="relative w-full bg-muted rounded-lg overflow-hidden cursor-pointer"
                    style={{ paddingBottom, minHeight: 80 }}
                    onClick={() => !uploadingStates[index] && handleUploadClick(index)}
                  >
                    <div className="absolute inset-0">
                      <img
                        src={banner.imageUrl}
                        alt={slotInfo.label}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: currentPosition }}
                      />

                      {/* Delete button */}
                      {index > 0 && hasImage && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full"
                          onClick={(e) => { e.stopPropagation(); removeBanner(index); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Empty state overlay */}
                      {!hasImage && (
                        <div className="absolute inset-0 bg-muted/80 flex items-center justify-center">
                          <div className="text-center">
                            <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground font-medium">Haz clic para subir imagen</p>
                          </div>
                        </div>
                      )}

                      {uploadingStates[index] && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload / Change button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleUploadClick(index)}
                    disabled={uploadingStates[index]}
                  >
                    <Upload className="w-4 h-4" />
                    {hasImage ? "Cambiar Imagen" : "Subir Imagen"}
                  </Button>

                  {/* Focal Point Picker — shown when image is loaded */}
                  {hasImage && (
                    <FocalPointPicker
                      imageUrl={banner.imageUrl}
                      value={currentPosition}
                      onChange={(pos) => updatePosition(index, pos)}
                    />
                  )}
                </div>

                {/* Info tip after first slot */}
                {index === 0 && slotCount > 1 && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      💡 Esta plantilla usa {slotCount} espacios de imagen. Súbelas todas para el mejor resultado.
                    </p>
                  </div>
                )}
              </React.Fragment>;
            })}
          </div>

          {/* Hidden File Inputs */}
          {Array.from({ length: slotCount }, (_, index) => (
            <input
              key={index}
              ref={el => fileInputRefs.current[index] = el}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={e => handleFileUpload(e, index)}
              className="hidden"
            />
          ))}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={uploadingStates.some(state => state)}
            variant="default"
            className="w-full rounded-[30px]"
            size="lg"
          >
            Guardar Imágenes
          </Button>

          {/* Close Button */}
          <Button onClick={onClose} variant="outline" className="w-full rounded-[30px]" size="lg">
            Cerrar
          </Button>
        </div>
      </ScrollArea>
    </DialogContent>

    {/* Image Cropper Modal — aspect ratio adapts per template/slot */}
    <ImageCropperModal
      isOpen={cropperOpen}
      onClose={() => setCropperOpen(false)}
      imageSrc={imageToCrop}
      aspectRatio={getBannerAspectRatio(templateId, currentBannerIndex)}
      onCropComplete={handleCropComplete}
      title="Recortar Imagen"
    />
  </Dialog>;
};