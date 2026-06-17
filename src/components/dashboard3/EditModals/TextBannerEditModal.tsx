
import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, Trash2, Crop } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { DEMO_STORE_ID } from "@/lib/constants";
import { ImageCropperModal } from "@/components/ui/ImageCropperModal";
import { fileToDataUrl } from "@/utils/cropImage";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BANNER_ASPECT_RATIO = 12 / 5;

interface TextBannerData {
    text: string;
    isActive: boolean;
    imageUrl?: string;
    imagePosition?: string;
    showTitle?: boolean;        // default true
    buttonEnabled?: boolean;    // default true (preserves the hardcoded CTA)
    buttonLabel?: string;
    buttonAction?: 'catalog' | 'category' | 'link';
    buttonCategorySlug?: string;
    buttonCustomUrl?: string;
    buttonBgColor?: string;
    buttonTextColor?: string;
    buttonHoverBgColor?: string;
    buttonHoverTextColor?: string;
}

interface TextBannerEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: TextBannerData) => void;
    initialData?: TextBannerData;
    /** Categories list for the "Ir a categoría" picker. */
    categories?: Array<{ id?: string; name: string; slug?: string }>;
}

export const TextBannerEditModal = ({ isOpen, onClose, onSave, initialData, categories = [] }: TextBannerEditModalProps) => {
    const [formData, setFormData] = useState<TextBannerData>({
        text: "Never Stop",
        isActive: true,
        imageUrl: "",
        imagePosition: "50% 50%",
        showTitle: true,
        buttonEnabled: true,
        buttonLabel: "",
        buttonAction: 'catalog',
        buttonCategorySlug: "",
        buttonCustomUrl: "",
        buttonBgColor: "#ffffff",
        buttonTextColor: "#000000",
        buttonHoverBgColor: "",
        buttonHoverTextColor: "",
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
                showTitle: initialData.showTitle !== false,
                buttonEnabled: initialData.buttonEnabled !== false,
                buttonLabel: initialData.buttonLabel || "",
                buttonAction: initialData.buttonAction || 'catalog',
                buttonCategorySlug: initialData.buttonCategorySlug || "",
                buttonCustomUrl: initialData.buttonCustomUrl || "",
                buttonBgColor: initialData.buttonBgColor || "#ffffff",
                buttonTextColor: initialData.buttonTextColor || "#000000",
                buttonHoverBgColor: initialData.buttonHoverBgColor || "",
                buttonHoverTextColor: initialData.buttonHoverTextColor || "",
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

    // Re-open the cropper on the already-saved image to move/zoom/recrop it.
    const handleRecrop = async () => {
        const url = formData.imageUrl;
        if (!url) return;
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
            setCropperOpen(true);
        } catch (error) {
            console.error("Error loading image for recrop:", error);
            toast.error("No se pudo abrir la imagen para reencuadrar");
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({ ...prev, imageUrl: "" }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

                    {/* Title section */}
                    <div className="space-y-3 border rounded-md p-3 bg-muted/20">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="showTitle">Mostrar título</Label>
                            <Switch
                                id="showTitle"
                                checked={formData.showTitle !== false}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showTitle: checked }))}
                            />
                        </div>
                        {formData.showTitle !== false && (
                            <div className="space-y-1.5">
                                <Label htmlFor="text" className="text-xs">Texto del banner</Label>
                                <Input
                                    id="text"
                                    value={formData.text}
                                    onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                                    placeholder="Ej: Never Stop"
                                />
                            </div>
                        )}
                    </div>

                    {/* Button section */}
                    <div className="space-y-3 border rounded-md p-3 bg-muted/20">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="buttonEnabled">Mostrar botón</Label>
                            <Switch
                                id="buttonEnabled"
                                checked={formData.buttonEnabled !== false}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, buttonEnabled: checked }))}
                            />
                        </div>
                        {formData.buttonEnabled !== false && (
                            <>
                                <div className="space-y-1.5">
                                    <Label htmlFor="buttonLabel" className="text-xs">Texto del botón</Label>
                                    <Input
                                        id="buttonLabel"
                                        value={formData.buttonLabel || ""}
                                        onChange={(e) => setFormData(prev => ({ ...prev, buttonLabel: e.target.value }))}
                                        placeholder="Ej: Explorar Colección"
                                    />
                                    <p className="text-[10px] text-muted-foreground">Vacío = "Explorar Colección".</p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Acción al hacer click</Label>
                                    <Select value={formData.buttonAction || 'catalog'} onValueChange={(v) => setFormData(prev => ({ ...prev, buttonAction: v as 'catalog' | 'category' | 'link' }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="catalog">Ir al catálogo completo</SelectItem>
                                            <SelectItem value="category">Ir a una categoría</SelectItem>
                                            <SelectItem value="link">Enlace personalizado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {formData.buttonAction === 'category' && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Categoría</Label>
                                        <Select value={formData.buttonCategorySlug || ""} onValueChange={(v) => setFormData(prev => ({ ...prev, buttonCategorySlug: v }))}>
                                            <SelectTrigger><SelectValue placeholder="Elige una categoría" /></SelectTrigger>
                                            <SelectContent>
                                                {categories.length === 0 ? (
                                                    <SelectItem value="__none__" disabled>No hay categorías aún</SelectItem>
                                                ) : (
                                                    categories.map((cat) => (
                                                        <SelectItem key={cat.id || cat.slug || cat.name} value={(cat.slug || cat.name).toLowerCase()}>
                                                            {cat.name}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {formData.buttonAction === 'link' && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="bannerCustomUrl" className="text-xs">URL</Label>
                                        <Input
                                            id="bannerCustomUrl"
                                            value={formData.buttonCustomUrl || ""}
                                            onChange={(e) => setFormData(prev => ({ ...prev, buttonCustomUrl: e.target.value }))}
                                            placeholder="https://ejemplo.com"
                                        />
                                        <p className="text-[10px] text-muted-foreground">Se abrirá en nueva pestaña.</p>
                                    </div>
                                )}

                                {/* Button colors (incl. hover/cursor) */}
                                <div className="space-y-2 pt-1">
                                    <Label className="text-xs">Colores del botón</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground block">Fondo</span>
                                            <input type="color" value={formData.buttonBgColor || "#ffffff"} onChange={(e) => setFormData(prev => ({ ...prev, buttonBgColor: e.target.value }))} className="h-9 w-full rounded border cursor-pointer" />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground block">Texto</span>
                                            <input type="color" value={formData.buttonTextColor || "#000000"} onChange={(e) => setFormData(prev => ({ ...prev, buttonTextColor: e.target.value }))} className="h-9 w-full rounded border cursor-pointer" />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground block">Fondo (cursor encima)</span>
                                            <input type="color" value={formData.buttonHoverBgColor || formData.buttonBgColor || "#ffffff"} onChange={(e) => setFormData(prev => ({ ...prev, buttonHoverBgColor: e.target.value }))} className="h-9 w-full rounded border cursor-pointer" />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground block">Texto (cursor encima)</span>
                                            <input type="color" value={formData.buttonHoverTextColor || formData.buttonTextColor || "#000000"} onChange={(e) => setFormData(prev => ({ ...prev, buttonHoverTextColor: e.target.value }))} className="h-9 w-full rounded border cursor-pointer" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">El de "cursor encima" es el color cuando el cliente pasa el mouse por el botón.</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-3">
                        <Label>Imagen de fondo (Opcional)</Label>

                        {/* Preview */}
                        <div
                            className={`group relative w-full aspect-[12/5] bg-muted rounded-lg overflow-hidden border border-dashed border-gray-300 ${formData.imageUrl ? "cursor-pointer" : ""}`}
                            onClick={() => { if (formData.imageUrl && !uploading) handleRecrop(); }}
                        >
                            {formData.imageUrl ? (
                                <>
                                    <img
                                        src={formData.imageUrl}
                                        alt="Banner Background"
                                        className="w-full h-full object-cover"
                                        style={{ objectPosition: formData.imagePosition || "50% 50%" }}
                                    />
                                    {/* Hover overlay: move/recrop affordance */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/45 transition-colors opacity-0 group-hover:opacity-100 pointer-events-none">
                                        <div className="text-center text-white">
                                            <Crop className="w-7 h-7 mx-auto mb-1" />
                                            <p className="text-xs font-medium">Mover y recortar</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full"
                                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
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
