// Logo Edit Modal - Updated with 30px borders and simplified UI
import React, { useState, useRef, useEffect } from "react";
import { Upload, X, Minus, Plus, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { toast } from "sonner";
import { ImageCropperModal } from "@/components/ui/ImageCropperModal";
import { fileToDataUrl } from "@/utils/cropImage";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";

interface LogoEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { url: string; alt?: string }) => void;
  initialData?: { url: string; alt?: string };
}

export const LogoEditModal = ({ isOpen, onClose, onSave, initialData }: LogoEditModalProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [logoSize, setLogoSize] = useState<number>(5);
  const { settings, uploadLogo, loadSettings, updateSettings } = useTenantSettings();
  const { currentTenantId: tenantId } = useTenantContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");

  // Use current logo from settings, not local state
  const currentLogoUrl = settings?.logo_url || initialData?.url || "";
  
  // Initialize logo size from settings
  useEffect(() => {
    if (settings?.logo_size) {
      setLogoSize(settings.logo_size);
    }
  }, [settings?.logo_size]);

  const handleSave = async () => {
    if (!currentLogoUrl.trim()) return;
    
    try {
      // Save logo size to database
      await updateSettings({ logo_size: logoSize });
      
      // Apply cache-busting to force immediate visual refresh using URL API
      const url = new URL(currentLogoUrl.trim(), window.location.origin);
      url.searchParams.set('cb', Date.now().toString());
      
      onSave({
        url: url.toString(),
        alt: "Logo"
      });
      toast.success("Logo guardado exitosamente");
      // Don't close modal - let user close manually
    } catch (error) {
      console.error('Error saving logo:', error);
      toast.error("Error al guardar el logo");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Convert file to data URL and open cropper
        const dataUrl = await fileToDataUrl(file);
        setImageToCrop(dataUrl);
        setCropperOpen(true);
      } catch (error) {
        console.error('Error reading file:', error);
        toast.error("Error al leer la imagen");
      }
    }
    // Reset input
    event.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploading(true);
    try {
      // Convert blob to file for upload
      const file = new File([croppedBlob], `logo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Upload to Supabase Storage
      const uploadedUrl = await uploadLogo(file);
      
      if (uploadedUrl) {
        toast.success("Logo subido exitosamente");
        // Force a re-render and keep modal open so user can save
        await loadSettings(); // Refresh settings to get new logo URL
      } else {
        toast.error("Error al subir el logo");
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error("Error al subir el logo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-[30px]">
        <DialogHeader className="relative">
          <DialogTitle>Editar Logo</DialogTitle>
          <DialogClose className="absolute right-0 top-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Logo Preview */}
          {currentLogoUrl ? (
            <div className="flex justify-center">
              <div className="relative">
                <img 
                  src={currentLogoUrl} 
                  alt="Logo"
                  style={{ height: `${logoSize * 16}px` }}
                  className="w-auto object-contain border rounded-lg p-2"
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-24 w-24 border-2 border-dashed border-muted rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Sin logo</span>
              </div>
            </div>
          )}

          {/* Logo Size Slider */}
          {currentLogoUrl && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Tamaño del Logo</label>
              <div className="flex items-center gap-4">
                <Minus className="w-4 h-4 text-muted-foreground" />
                <Slider
                  value={[logoSize]}
                  onValueChange={(value) => setLogoSize(value[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="flex-1"
                />
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pequeño</span>
                <span>Grande</span>
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Upload Button */}
          <Button 
            onClick={handleUploadClick}
            disabled={isUploading}
            className="w-full rounded-[30px]"
            size="lg"
          >
            <Upload className="w-5 h-5 mr-2" />
            {isUploading ? "Subiendo..." : "Subir Logo"}
          </Button>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={!currentLogoUrl.trim() || isUploading}
            variant="default"
            className="w-full rounded-[30px]"
            size="lg"
          >
            Guardar Logo
          </Button>

          {/* Close Button */}
          <Button 
            onClick={onClose} 
            variant="outline"
            className="w-full rounded-[30px]"
            size="lg"
          >
            Cerrar
          </Button>
        </div>

        {/* Image Cropper Modal */}
        <ImageCropperModal
          isOpen={cropperOpen}
          onClose={() => setCropperOpen(false)}
          imageSrc={imageToCrop}
          aspectRatio={1}
          onCropComplete={handleCropComplete}
          title="Recortar Logo"
        />
      </DialogContent>
    </Dialog>
  );
};