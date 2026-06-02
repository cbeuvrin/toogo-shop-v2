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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";

interface LogoEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { url: string; alt?: string }) => void;
  initialData?: { url: string; alt?: string };
  /** Editor device mode — determines which logo_size column the slider writes to. */
  deviceMode?: 'desktop' | 'tablet' | 'mobile';
}

export const LogoEditModal = ({ isOpen, onClose, onSave, initialData, deviceMode = 'desktop' }: LogoEditModalProps) => {
  const sizeColumn = deviceMode === 'mobile' ? 'logo_size_mobile' : deviceMode === 'tablet' ? 'logo_size_tablet' : 'logo_size';
  const sizeLabel = deviceMode === 'mobile' ? 'Tamaño del Logo (Móvil)' : deviceMode === 'tablet' ? 'Tamaño del Logo (Tablet)' : 'Tamaño del Logo (Escritorio)';
  const [isUploading, setIsUploading] = useState(false);
  const [logoSize, setLogoSize] = useState<number>(5);
  const [logoPosition, setLogoPosition] = useState<'left' | 'center' | 'right'>('center');
  const { settings, uploadLogo, loadSettings, updateSettings } = useTenantSettings();
  const { currentTenantId: tenantId } = useTenantContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use current logo from settings, not local state
  const currentLogoUrl = settings?.logo_url || initialData?.url || "";

  // Initialize logo size + position from settings.
  // Pick the size matching the current device mode; fall back to desktop size.
  useEffect(() => {
    const currentSize = (settings as any)?.[sizeColumn];
    const fallback = (settings as any)?.logo_size;
    if (currentSize) {
      setLogoSize(currentSize);
    } else if (fallback) {
      setLogoSize(fallback);
    }
    if ((settings as any)?.logo_position) {
      setLogoPosition((settings as any).logo_position);
    }
  }, [settings?.logo_size, (settings as any)?.logo_size_mobile, (settings as any)?.logo_size_tablet, (settings as any)?.logo_position, sizeColumn]);

  const handleSave = async () => {
    if (!currentLogoUrl.trim()) return;

    try {
      // Save logo size to the column matching current device mode (desktop / tablet / mobile)
      // + position which is shared across devices.
      await updateSettings({ [sizeColumn]: logoSize, logo_position: logoPosition } as any);

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
      await handleDirectUpload(file);
    }
    // Reset input
    event.target.value = '';
  };

  const handleDirectUpload = async (file: File) => {
    setIsUploading(true);
    try {
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
      <DialogContent className="sm:max-w-md rounded-[30px] max-h-[90vh] overflow-y-auto">
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
              <label className="text-sm font-medium">{sizeLabel}</label>
              <div className="flex items-center gap-4">
                <Minus className="w-4 h-4 text-muted-foreground" />
                <Slider
                  value={[logoSize]}
                  onValueChange={(value) => setLogoSize(value[0])}
                  min={1}
                  max={30}
                  step={1}
                  className="flex-1"
                />
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pequeño</span>
                <span>Extra Grande</span>
              </div>
            </div>
          )}

          {/* Logo Position — only honored by templates that read it (Indico) */}
          {currentLogoUrl && (
            <div className="space-y-2">
              <Label>Posición del Logo</Label>
              <Select value={logoPosition} onValueChange={(v) => setLogoPosition(v as 'left' | 'center' | 'right')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Izquierda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Derecha</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Por ahora se aplica en la plantilla Índico.</p>
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

      </DialogContent>
    </Dialog>
  );
};