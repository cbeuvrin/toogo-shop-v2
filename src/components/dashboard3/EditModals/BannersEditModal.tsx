import React, { useState, useEffect, useRef } from "react";
import { Upload, X, Trash2, Loader2, Crop } from "lucide-react";
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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

// Cap the preview box height so tall portrait crops (e.g. Indico 3:4) don't fill
// the whole modal. The box uses CSS aspect-ratio with maxHeight + maxWidth
// (= ratio * maxHeight), so it shrinks proportionally and never crops the image.
// Editor-only — does not affect how the photo renders in the live hero.
const MAX_PREVIEW_HEIGHT = 340; // px

/** Returns the correct crop aspect ratio per template and slot */
function getBannerAspectRatio(templateId: string | undefined, index: number): number {
  const t = (templateId || "default").toLowerCase();

  if (t.includes("fashion") && !t.includes("hero") && !t.includes("trendy")) {
    // FashionTemplate: [0] portrait 4:5, [1] cuadrado 1:1, [2] portrait 3:4,
    // [3] banner editorial panorámico 21:9 (tras "Recién Llegados")
    const ratios = [4 / 5, 1, 3 / 4, 21 / 9];
    return ratios[index] ?? 4 / 5;
  }
  if (t.includes("hero")) {
    // FashionHero (Indico): el hero se muestra horizontal (≈ 3/5 de ancho × 78vh).
    return 4 / 3;
  }
  if (t.includes("trendy")) {
    // TrendyFashion: imagen portrait con forma orgánica en el héroe.
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
  imageUrlTablet?: string;
  imageUrlMobile?: string;
  sort: number;
  position?: string;
  positionTablet?: string;
  positionMobile?: string;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

/** Field key on a banner for the image of a given device. */
const imgField = (d: DeviceMode) => d === 'mobile' ? 'imageUrlMobile' : d === 'tablet' ? 'imageUrlTablet' : 'imageUrl';
/** The effective image for a device (its own, else inherit desktop). */
const deviceImage = (b: BannerItem | undefined, d: DeviceMode): string => {
  if (!b) return "/placeholder.svg";
  if (d === 'mobile') return b.imageUrlMobile || b.imageUrl || "/placeholder.svg";
  if (d === 'tablet') return b.imageUrlTablet || b.imageUrl || "/placeholder.svg";
  return b.imageUrl || "/placeholder.svg";
};
/** Whether this device has its OWN image (not inherited). */
const deviceHasOwn = (b: BannerItem | undefined, d: DeviceMode): boolean => {
  if (!b) return false;
  if (d === 'mobile') return !!b.imageUrlMobile && b.imageUrlMobile !== "/placeholder.svg";
  if (d === 'tablet') return !!b.imageUrlTablet && b.imageUrlTablet !== "/placeholder.svg";
  return !!b.imageUrl && b.imageUrl !== "/placeholder.svg";
};
const DEVICE_LABEL: Record<DeviceMode, string> = { desktop: 'Escritorio', tablet: 'Tablet', mobile: 'Móvil' };

interface BannersEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: BannerItem[],
    heroText: { title: string; description: string; cta1Label?: string; cta2Label?: string }
  ) => void;
  initialData?: BannerItem[];
  initialHeroText?: {
    title: string;
    description: string;
    cta1Label?: string;
    cta2Label?: string;
  };
  templateId?: string;
  deviceMode?: DeviceMode;
  /** When set, the modal shows ONLY this slot (click-a-banner → edit just that one). */
  focusSlot?: number;
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
      { label: "Banner Editorial – Bajo Recién Llegados", hint: "Banner panorámico a lo ancho, después de la sección de productos (recomendado: 21:9)" },
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
    // Caribe: the hero shape is a real carousel — up to 3 photos cycled by the arrows.
    const labels = [
      { label: "Foto 1 del Carrusel del Héroe", hint: "Primera imagen del carrusel con forma orgánica (recomendado: portrait)" },
      { label: "Foto 2 del Carrusel (opcional)", hint: "Las flechas del héroe pasan de una foto a otra" },
      { label: "Foto 3 del Carrusel (opcional)", hint: "Las flechas del héroe pasan de una foto a otra" },
      { label: "Banner 4 (no usado en esta plantilla)", hint: "" },
    ];
    return labels[index] || labels[0];
  }

  if (template.includes("hero")) {
    const labels = [
      { label: "Foto Héroe – Lado Izquierdo", hint: "Foto principal grande al lado izquierdo (recomendado: horizontal 4:3)" },
      { label: "Banner 2 (no usado)", hint: "" },
      { label: "Banner 3 (no usado)", hint: "" },
      { label: "Banner 4 (no usado)", hint: "" },
    ];
    return labels[index] || labels[0];
  }

  if (template.includes("minimal")) {
    const labels = [
      { label: "Foto Héroe Principal", hint: "Imagen grande del héroe (recomendado: 21:9)" },
      { label: "Banner Editorial – Bajo el Catálogo", hint: "Banner panorámico después de los productos (recomendado: 21:9)" },
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
  deviceMode = 'desktop',
  focusSlot,
}: BannersEditModalProps) => {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [heroTitle, setHeroTitle] = useState("");
  const [heroDescription, setHeroDescription] = useState("");
  const [cta1Label, setCta1Label] = useState("");
  const [cta2Label, setCta2Label] = useState("");
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
      // Place each banner at its real slot index (`sort`) WITHOUT compressing —
      // empty middle slots must stay empty so slot N maps to the same image the
      // template reads as banners[N].
      const byIndex: BannerItem[] = [];
      initialData.forEach((b) => {
        const i = typeof b.sort === 'number' ? b.sort : byIndex.length;
        byIndex[i] = b;
      });
      setBanners(byIndex);
    } else {
      setBanners([]);
    }

    if (initialHeroText) {
      setHeroTitle(initialHeroText.title || "");
      setHeroDescription(initialHeroText.description || "");
      setCta1Label(initialHeroText.cta1Label || "");
      setCta2Label(initialHeroText.cta2Label || "");
    }
  }, [initialData, initialHeroText, isOpen]);

  const removeBanner = (index: number) => {
    const newBanners = [...banners];
    // On tablet/mobile, "remove" clears ONLY this device's override → inherits desktop.
    if (deviceMode !== 'desktop') {
      if (newBanners[index]) {
        const field = imgField(deviceMode);
        newBanners[index] = { ...newBanners[index], [field]: undefined };
        setBanners(newBanners);
      }
      return;
    }
    if (index === 0) {
      toast.error("El Banner 1 (Escritorio) es obligatorio y no se puede eliminar");
      return;
    }
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

  // Re-open the cropper on an ALREADY-SAVED image so the user can move/zoom/recrop
  // it again — same flow as a fresh upload. We fetch it to a data URL first so the
  // crop canvas stays same-origin (no CORS taint on the remote Supabase URL).
  const handleRecrop = async (bannerIndex: number) => {
    const url = deviceImage(banners[bannerIndex], deviceMode);
    if (!url || url === "/placeholder.svg") return;
    try {
      const resp = await fetch(url, { mode: "cors" });
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      setImageToCrop(dataUrl);
      setCurrentBannerIndex(bannerIndex);
      setCropperOpen(true);
    } catch (error) {
      console.error("Error loading image for recrop:", error);
      toast.error("No se pudo abrir la imagen para reencuadrar");
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const bannerIndex = currentBannerIndex;

    const newUploadingStates = [...uploadingStates];
    newUploadingStates[bannerIndex] = true;
    setUploadingStates(newUploadingStates);

    const field = imgField(deviceMode);
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
      // Only set the ACTIVE device's image; keep the other devices' images intact.
      newBanners[bannerIndex] = {
        ...newBanners[bannerIndex],
        id: newBanners[bannerIndex]?.id && !String(newBanners[bannerIndex].id).startsWith('placeholder') ? newBanners[bannerIndex].id : `banner_${Date.now()}`,
        sort: bannerIndex,
        [field]: previewUrl,
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
        [field]: publicUrl
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

    const cb = Date.now();
    // Build by REAL slot index so `sort` always matches the visible slot (e.g. the
    // editorial banner is slot 3). Each slot gets a stable id (`banner_slot_N`) so
    // empty middle slots never compress later slots into earlier positions.
    const validBanners: BannerItem[] = [];
    banners.forEach((b, index) => {
      if (!b || !b.imageUrl || b.imageUrl === "/placeholder.svg") return;
      validBanners.push({
        ...b,
        id: `banner_slot_${index}`,
        sort: index,
        imageUrl: `${b.imageUrl}?cb=${cb}`,
        imageUrlTablet: b.imageUrlTablet && b.imageUrlTablet !== "/placeholder.svg" ? `${b.imageUrlTablet}?cb=${cb}` : undefined,
        imageUrlMobile: b.imageUrlMobile && b.imageUrlMobile !== "/placeholder.svg" ? `${b.imageUrlMobile}?cb=${cb}` : undefined,
        position: b.position || "center center",
      });
    });

    onSave(validBanners, {
      title: heroTitle,
      description: heroDescription,
      cta1Label: cta1Label || undefined,
      cta2Label: cta2Label || undefined,
    });
    toast.success("Imágenes y textos guardados exitosamente");
  };

  // Determine how many slots to show based on template
  const getSlotCount = () => {
    const t = (templateId || "").toLowerCase();
    if (t.includes("nature")) return 4;
    if (t.includes("fashion") && !t.includes("hero") && !t.includes("trendy")) return 4;
    if (t.includes("bauhaus")) return 3;
    if (t.includes("cyber")) return 1;
    if (t.includes("trendy")) return 3; // Caribe: hero carousel, up to 3 photos
    if (t.includes("minimal")) return 2; // Mediterráneo: hero + banner editorial
    if (t.includes("hero") || t.includes("premium_brand")) return 1;
    return 4; // default / simple_live
  };

  const slotCount = getSlotCount();

  const bannerSlots = Array.from({ length: slotCount }, (_, index) => banners[index] || {
    id: `placeholder_${index}`,
    imageUrl: "/placeholder.svg",
    sort: index,
    position: "center center",
  });

  // When a single banner was clicked in the preview, show ONLY that slot — editing
  // each image separately is far clearer than one popup with every slot at once.
  const focused = typeof focusSlot === 'number' && focusSlot >= 0 && focusSlot < slotCount;
  const slotIndices = focused ? [focusSlot as number] : bannerSlots.map((_, i) => i);

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

          {/* Banner Text Config — hidden when editing a single image (less clutter) */}
          {!focused && (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
              <div>
                <Label htmlFor="hero-cta1">Botón principal</Label>
                <Input
                  id="hero-cta1"
                  value={cta1Label}
                  onChange={(e) => setCta1Label(e.target.value)}
                  placeholder="Ej. Ver Colección"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Si lo dejas vacío se usa el texto por defecto de la plantilla.</p>
              </div>
              <div>
                <Label htmlFor="hero-cta2">Botón secundario</Label>
                <Input
                  id="hero-cta2"
                  value={cta2Label}
                  onChange={(e) => setCta2Label(e.target.value)}
                  placeholder="Ej. Novedades"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Vacío para usar el texto por defecto.</p>
              </div>
            </div>
          </div>
          )}

          {/* Image Slots */}
          <div className="space-y-8">
            {slotIndices.map((index) => {
              const banner = bannerSlots[index] || { id: `placeholder_${index}`, imageUrl: "/placeholder.svg", sort: index, position: "center center" };
              const slotInfo = getBannerSlotInfo(templateId, index);
              const currentPosition = banner.position || "center center";
              const aspectRatio = getBannerAspectRatio(templateId, index);
              const shownImage = deviceImage(banner, deviceMode);
              const hasImage = shownImage !== "/placeholder.svg";
              const ownForDevice = deviceHasOwn(banner, deviceMode);
              const inherited = hasImage && !ownForDevice; // showing desktop image on tablet/mobile

              return <React.Fragment key={banner.id}>
                <div className="space-y-4 border rounded-xl p-4 bg-card">
                  {/* Slot header */}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">{slotInfo.label}</h4>
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">{DEVICE_LABEL[deviceMode]}</span>
                    </div>
                    {slotInfo.hint && (
                      <p className="text-xs text-muted-foreground mt-0.5">{slotInfo.hint}</p>
                    )}
                    {deviceMode !== 'desktop' && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {inherited ? 'Usando la imagen de Escritorio. Subí una aquí para que ' + DEVICE_LABEL[deviceMode] + ' tenga la suya.' : 'Imagen propia de ' + DEVICE_LABEL[deviceMode] + '.'}
                      </p>
                    )}
                  </div>

                  {/* Single preview = the real slot space (aspect-ratio of the slot,
                      height-capped). Click the photo to re-open the cropper and
                      move/zoom/recrop it, exactly like a fresh upload. */}
                  <div
                    className="group relative w-full mx-auto bg-muted rounded-lg overflow-hidden cursor-pointer flex items-center justify-center"
                    style={{
                      aspectRatio: String(aspectRatio),
                      minHeight: 80,
                      maxHeight: MAX_PREVIEW_HEIGHT,
                      maxWidth: Math.round(aspectRatio * MAX_PREVIEW_HEIGHT),
                    }}
                    onClick={() => {
                      if (uploadingStates[index]) return;
                      hasImage ? handleRecrop(index) : handleUploadClick(index);
                    }}
                  >
                    {hasImage ? (
                      <>
                        <img
                          src={shownImage}
                          alt={slotInfo.label}
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{ objectPosition: currentPosition }}
                        />
                        {/* Hover overlay: reframe/recrop affordance */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/45 transition-colors opacity-0 group-hover:opacity-100">
                          <div className="text-center text-white">
                            <Crop className="w-8 h-8 mx-auto mb-1" />
                            <p className="text-xs font-medium">Mover y recortar</p>
                          </div>
                        </div>
                        {/* Delete button — desktop: remove extra slots; tablet/mobile: clear this device's override */}
                        {(deviceMode !== 'desktop' ? ownForDevice : index > 0) && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full z-10"
                            title={deviceMode !== 'desktop' ? `Quitar imagen de ${DEVICE_LABEL[deviceMode]} (volver a heredar)` : 'Eliminar imagen'}
                            onClick={(e) => { e.stopPropagation(); removeBanner(index); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground font-medium">Haz clic para subir imagen</p>
                      </div>
                    )}
                    {uploadingStates[index] && (
                      <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
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
                    {deviceMode !== 'desktop'
                      ? (ownForDevice ? `Cambiar imagen de ${DEVICE_LABEL[deviceMode]}` : `Subir imagen para ${DEVICE_LABEL[deviceMode]}`)
                      : (hasImage ? "Cambiar Imagen" : "Subir Imagen")}
                  </Button>
                </div>

                {/* Info tip after first slot */}
                {!focused && index === 0 && slotCount > 1 && (
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