
import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { DEMO_STORE_ID } from "@/lib/constants";
import { ImageCropperModal } from "@/components/ui/ImageCropperModal";
import { fileToDataUrl } from "@/utils/cropImage";
import { FocalPointPicker } from "@/components/ui/FocalPointPicker";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BANNER_ASPECT_RATIO = 12 / 5;

interface TextBannerData {
    text: string;
    isActive: boolean;
    imageUrl?: string;
    imagePosition?: string;
}

interface TextBannerEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: TextBannerData) => void;
    initialData?: TextBannerData;
}

export const TextBannerEditModal = ({ isOpen, onClose, onSave, initialData }: TextBannerEditModalProps) => {
    const [formData, setFormData] = useState<TextBannerData>({
        text: "Never Stop",
        isActive: true,
        imageUrl: "",
        imagePosition: "50% 50%",
    });

    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { currentTenantId, isSuperAdmin } = useTenantContext();
    const tenantId = currentTenantId || (isSuperAdmin ? DEMO_STORE_ID : null);

    const [cropperOpen, setCropperOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string>("");

    useEffect(() => {
        if (initialData) {
            setFormData({
                text: initialData.text || "Never Stop",
                isActive: initialData.isActive !== false,
                imageUrl: initialData.imageUrl || "",
                imagePosition: initialData.imagePosition || "50% 50%",
            });
        }
    }, [initialData, isOpen]);

    const handleSave = () => {
        onSave(formData);
        onClose();
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
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

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const validationError = validateFile(file);
        if (validationError) {
            toast.error(validationError);
            event.target.value = '';
            return;
        }

        if (!tenantId) {
            toast.error('No se pudo determinar el tenant');
            return;
        }

        try {
            const dataUrl = await fileToDataUrl(file);
            setImageToCrop(dataUrl);
            setCropperOpen(true);
        } catch (error) {
            toast.error("Error al leer la imagen");
        }

        event.target.value = '';
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setUploading(true);
        try {
            const previewUrl = URL.createObjectURL(croppedBlob);
            setFormData(prev => ({ ...prev, imageUrl: previewUrl }));

            const fileName = `text_banner_${Date.now()}.jpg`;
            const filePath = `${tenantId}/${fileName}`;

            const { error } = await supabase.storage.from('banners').upload(filePath, croppedBlob, {
                contentType: 'image/jpeg',
                upsert: true
            });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, imageUrl: publicUrl }));
            URL.revokeObjectURL(previewUrl);

            toast.success("Imagen subida exitosamente");
        } catch (error: any) {
            toast.error(`Error al subir imagen: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({ ...prev, imageUrl: "" }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Editar Banner de Texto</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Toggle Active */}
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="isActive" className="text-base">Mostrar banner</Label>
                            <div className="text-xs text-muted-foreground">
                                Activa o desactiva este banner en la tienda
                            </div>
                        </div>
                        <Switch
                            id="isActive"
                            checked={formData.isActive}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                        />
                    </div>

                    {/* Text Input */}
                    <div className="space-y-2">
                        <Label htmlFor="text">Texto del banner</Label>
                        <Input
                            id="text"
                            value={formData.text}
                            onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                            placeholder="Ej: Never Stop"
                        />
                        <p className="text-xs text-muted-foreground">
                            Texto grande que aparece centrado en el banner.
                        </p>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-3">
                        <Label>Imagen de fondo (Opcional)</Label>

                        {/* Preview */}
                        <div className="relative w-full aspect-[12/5] bg-muted rounded-lg overflow-hidden border border-dashed border-gray-300">
                            {formData.imageUrl ? (
                                <>
                                    <img
                                        src={formData.imageUrl}
                                        alt="Banner Background"
                                        className="w-full h-full object-cover"
                                        style={{ objectPosition: formData.imagePosition || "50% 50%" }}
                                    />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8 rounded-full"
                                        onClick={handleRemoveImage}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                                        <p className="mb-2 text-sm font-medium">Ninguna imagen seleccionada</p>
                                        <p className="text-xs">Se usará un fondo gris oscuro por defecto</p>
                                    </div>
                                </div>
                            )}

                            {uploading && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                                </div>
                            )}
                        </div>

                        {/* Focal Point Picker — shown when image is loaded */}
                        {formData.imageUrl && (
                            <FocalPointPicker
                                imageUrl={formData.imageUrl}
                                value={formData.imagePosition || "50% 50%"}
                                onChange={(pos) => setFormData(prev => ({ ...prev, imagePosition: pos }))}
                            />
                        )}

                        {/* Upload button */}
                        <div className="flex justify-end">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <Button
                                onClick={handleUploadClick}
                                disabled={formData.isActive === false || uploading}
                                variant="outline"
                                size="sm"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                {formData.imageUrl ? "Cambiar Imagen" : "Subir Imagen"}
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={uploading}>Guardar Cambios</Button>
                </DialogFooter>
            </DialogContent>

            <ImageCropperModal
                isOpen={cropperOpen}
                onClose={() => setCropperOpen(false)}
                imageSrc={imageToCrop}
                aspectRatio={BANNER_ASPECT_RATIO}
                onCropComplete={handleCropComplete}
                title="Recortar Imagen de Fondo"
            />
        </Dialog>
    );
};
