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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const BANNER_ASPECT_RATIO = 8 / 3;

interface BannerItem {
  id: string;
  imageUrl: string;
  sort: number;
}
interface BannersEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BannerItem[]) => void;
  initialData?: BannerItem[];
}
export const BannersEditModal = ({
  isOpen,
  onClose,
  onSave,
  initialData
}: BannersEditModalProps) => {
  const [banners, setBanners] = useState<BannerItem[]>([]);
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
  }, [initialData]);
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
        sort: index
      };
    }
    setBanners(newBanners);
  };
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      return "Solo se permiten archivos JPG, PNG y WebP";
    }

    // Check file size
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

    // Convert file to data URL and open cropper
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageToCrop(dataUrl);
      setCurrentBannerIndex(bannerIndex);
      setCropperOpen(true);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error("Error al leer la imagen");
    }

    // Reset input value
    event.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const bannerIndex = currentBannerIndex;
    
    const newUploadingStates = [...uploadingStates];
    newUploadingStates[bannerIndex] = true;
    setUploadingStates(newUploadingStates);

    try {
      // Show immediate preview using object URL
      const previewUrl = URL.createObjectURL(croppedBlob);
      const newBanners = [...banners];

      // Ensure we have enough slots
      while (newBanners.length <= bannerIndex) {
        newBanners.push({
          id: `placeholder_${newBanners.length}`,
          imageUrl: "/placeholder.svg",
          sort: newBanners.length
        });
      }
      newBanners[bannerIndex] = {
        id: `banner_${Date.now()}`,
        imageUrl: previewUrl,
        sort: bannerIndex
      };
      setBanners(newBanners);

      // Upload to Supabase
      const fileName = `banner_${Date.now()}.jpg`;
      const filePath = `${tenantId}/${fileName}`;
      console.log('Upload path:', filePath);
      const {
        data,
        error
      } = await supabase.storage.from('banners').upload(filePath, croppedBlob, {
        contentType: 'image/jpeg'
      });
      if (error) {
        throw error;
      }

      // Get public URL
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('banners').getPublicUrl(filePath);
      console.log('Public URL:', publicUrl);

      // Update with real URL
      newBanners[bannerIndex] = {
        ...newBanners[bannerIndex],
        imageUrl: publicUrl
      };
      setBanners([...newBanners]);

      // Clean up preview URL
      URL.revokeObjectURL(previewUrl);
      toast.success(`Banner ${bannerIndex + 1} subido exitosamente`);
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error("Error al subir el banner");

      // Reset banner on error
      const resetBanners = [...banners];
      while (resetBanners.length <= bannerIndex) {
        resetBanners.push({
          id: `placeholder_${resetBanners.length}`,
          imageUrl: "/placeholder.svg",
          sort: resetBanners.length
        });
      }
      resetBanners[bannerIndex] = {
        id: `placeholder_${bannerIndex}`,
        imageUrl: "/placeholder.svg",
        sort: bannerIndex
      };
      setBanners(resetBanners);
    } finally {
      const resetUploadingStates = [...uploadingStates];
      resetUploadingStates[bannerIndex] = false;
      setUploadingStates(resetUploadingStates);
    }
  };
  const handleSave = () => {
    // Validate that Banner 1 exists
    if (!banners[0] || banners[0].imageUrl === "/placeholder.svg") {
      toast.error("El Banner 1 es obligatorio");
      return;
    }

    // Filter out placeholder banners and apply cache-busting
    const validBanners = banners.filter(banner => banner.imageUrl !== "/placeholder.svg").map(b => ({
      ...b,
      imageUrl: `${b.imageUrl}?cb=${Date.now()}`
    }));
    onSave(validBanners);
    toast.success("Banners guardados exitosamente");
    // Don't close modal - let user close manually
  };

  // Create array of 4 slots (existing banners + empty placeholders)
  const bannerSlots = Array.from({
    length: 4
  }, (_, index) => banners[index] || {
    id: `placeholder_${index}`,
    imageUrl: "/placeholder.svg",
    sort: index
  });
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl rounded-[30px] h-[90vh] overflow-hidden flex flex-col" aria-describedby="banners-edit-description">
        <DialogHeader className="relative shrink-0">
          <DialogTitle>Editar Banners</DialogTitle>
          <p id="banners-edit-description" className="sr-only">
            Modal para editar y subir hasta 4 banners para la tienda
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
              Solo JPG, PNG y WebP - Máximo 5MB por banner
            </p>
            <p className="text-xs text-muted-foreground">
              Dimensiones recomendadas: 1920x720px (proporción 8:3 para escritorio)
            </p>
          </div>

          {/* Banner Rows (Full width preview) */}
          <div className="space-y-6">
            {bannerSlots.map((banner, index) => <React.Fragment key={banner.id}>
                <div className="space-y-3">
                  {/* Banner Preview - Full width with banner aspect ratio */}
                  <div className="relative w-full aspect-[8/3] bg-muted rounded-lg overflow-hidden">
                    <img src={banner.imageUrl} alt={`Banner ${index + 1}`} className="w-full h-full object-cover object-center" />
                    
                    {/* Delete button - Only for banners 2, 3, 4 */}
                    {index > 0 && banner.imageUrl !== "/placeholder.svg" && <Button variant="destructive" size="sm" className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full" onClick={() => removeBanner(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>}
                    
                    {/* Upload overlay for empty banners */}
                    {banner.imageUrl === "/placeholder.svg" && <div className="absolute inset-0 bg-muted/80 flex items-center justify-center">
                        <div className="text-center">
                          <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-sm font-medium text-muted-foreground">
                            {index === 0 ? "Banner 1 (Obligatorio)" : `Banner ${index + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Haz clic en "Subir Imagen" para añadir un banner
                          </p>
                        </div>
                      </div>}
                  </div>
                  
                  {/* Banner Info and Upload Button */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        {index === 0 ? "Banner 1 (Obligatorio)" : `Banner ${index + 1}`}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {banner.imageUrl === "/placeholder.svg" ? "Sin imagen" : "Imagen cargada"}
                      </p>
                    </div>
                    
                    <Button onClick={() => handleUploadClick(index)} disabled={uploadingStates[index]} size="sm" variant={index === 0 ? "default" : "outline"}>
                      {uploadingStates[index] ? <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Subiendo...
                        </> : <>
                          <Upload className="w-4 h-4 mr-2" />
                          Subir Imagen
                        </>}
                    </Button>
                  </div>
                </div>

                {/* Informative message after Banner 1 */}
                {index === 0 && <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-blue-800 dark:text-blue-200">💡 Si abajo añades más imágenes (banners), las imágenes pasarán una tras otra, como en un carrusel. Puedes colocar 3 adicionales</p>
                      </div>
                    </div>
                  </div>}
              </React.Fragment>)}
          </div>

          {/* Hidden File Inputs */}
          {Array.from({
            length: 4
          }, (_, index) => <input key={index} ref={el => fileInputRefs.current[index] = el} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={e => handleFileUpload(e, index)} className="hidden" />)}

          {/* Save Button */}
          <Button onClick={handleSave} disabled={uploadingStates.some(state => state)} variant="default" className="w-full rounded-[30px]" size="lg">
            Guardar Banners
          </Button>

          {/* Close Button */}
          <Button onClick={onClose} variant="outline" className="w-full rounded-[30px]" size="lg">
            Cerrar
          </Button>
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropperOpen}
        onClose={() => setCropperOpen(false)}
        imageSrc={imageToCrop}
        aspectRatio={BANNER_ASPECT_RATIO}
        onCropComplete={handleCropComplete}
        title="Recortar Banner"
      />
    </Dialog>;
};