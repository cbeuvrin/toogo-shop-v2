import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload, Loader2, Crop } from "lucide-react";
import { HERO_SHAPE_OPTIONS, getHeroShapeRadius } from "@/lib/heroShapes";
import { useToast } from "@/hooks/use-toast";
import { ImageCropperModal } from "../../ui/ImageCropperModal";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";

export interface BannerItem {
    id?: string;
    image?: string;
    imageUrl?: string;
    sort?: number;
    position?: string;
    link?: string;
}

interface HeroShapeEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (shape: string, newBanner?: BannerItem, scale?: number) => void;
    initialShape?: string;
    initialBanner?: BannerItem;
    initialScale?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const HeroShapeEditModal = ({
    isOpen,
    onClose,
    onSave,
    initialShape = "organic",
    initialBanner,
    initialScale = 100,
}: HeroShapeEditModalProps) => {
    const [shape, setShape] = useState(initialShape);
    const [scale, setScale] = useState(initialScale);
    const [bannerState, setBannerState] = useState<BannerItem | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Cropper State
    const [cropperOpen, setCropperOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string>("");

    // Dragging State
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { currentTenantId, isSuperAdmin } = useTenantContext();
    const DEMO_STORE_ID = "11111111-1111-1111-1111-111111111111";
    const tenantId = currentTenantId || (isSuperAdmin ? DEMO_STORE_ID : null);

    useEffect(() => {
        if (isOpen) {
            setShape(initialShape || "organic");
            setScale(initialScale || 100);
            if (initialBanner) {
                setBannerState({ ...initialBanner });
            } else {
                setBannerState(null);
            }
        }
    }, [isOpen, initialShape, initialBanner, initialScale]);

    const handleSave = () => {
        onSave(shape, bannerState || undefined, scale);
    };

    // Re-open the cropper on the already-saved image to zoom/recrop it.
    const handleRecrop = async () => {
        const url = bannerState?.imageUrl || bannerState?.image;
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
            setCropperOpen(true);
        } catch (error) {
            console.error("Error loading image for recrop:", error);
            toast({ title: "Error", description: "No se pudo abrir la imagen para reencuadrar", variant: "destructive" });
        }
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

    const fileToDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const validationError = validateFile(file);
        if (validationError) {
            toast({ title: "Error", description: validationError, variant: "destructive" });
            event.target.value = '';
            return;
        }

        if (!tenantId) {
            toast({ title: "Error", description: 'No se pudo determinar el tenant', variant: "destructive" });
            event.target.value = '';
            return;
        }

        try {
            const dataUrl = await fileToDataUrl(file);
            setImageToCrop(dataUrl);
            setCropperOpen(true);
        } catch (error) {
            console.error('Error reading file:', error);
            toast({ title: "Error", description: "Error al leer la imagen", variant: "destructive" });
        }

        event.target.value = '';
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setIsUploading(true);
        try {
            const previewUrl = URL.createObjectURL(croppedBlob);
            setBannerState(prev => ({
                ...(prev || {}),
                id: prev?.id || `banner_${Date.now()}`,
                imageUrl: previewUrl,
                sort: 0,
                position: prev?.position || "center center",
            }));

            const fileName = `hero_${Date.now()}.jpg`;
            const filePath = `${tenantId}/${fileName}`;

            const { data, error } = await supabase.storage.from('banners').upload(filePath, croppedBlob, {
                contentType: 'image/jpeg'
            });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(filePath);

            setBannerState(prev => ({
                ...(prev || {}),
                id: prev?.id || `banner_${Date.now()}`,
                imageUrl: publicUrl,
                sort: 0,
            }));

            toast({ title: "Éxito", description: "Imagen subida correctamente" });

        } catch (error) {
            console.error('Upload error:', error);
            toast({ title: "Error", description: "Error al subir la imagen", variant: "destructive" });
        } finally {
            setIsUploading(false);
            setCropperOpen(false);
            setImageToCrop("");
        }
    };

    const updatePosition = (position: string) => {
        setBannerState(prev => prev ? { ...prev, position } : null);
    };

    const updatePositionFromEvent = (clientX: number, clientY: number) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
        updatePosition(`${Math.round(x)}% ${Math.round(y)}%`);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        isDragging.current = true;
        updatePositionFromEvent(e.clientX, e.clientY);
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current) return;
        updatePositionFromEvent(e.clientX, e.clientY);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        isDragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const imageUrl = bannerState?.imageUrl || bannerState?.image;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] md:max-w-[600px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Personalizar Imagen del Hero</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Forma Selector */}
                    <div className="space-y-4">
                        <Label>Estilo de Recorte</Label>
                        <Select value={shape} onValueChange={setShape}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecciona una forma" />
                            </SelectTrigger>
                            <SelectContent>
                                {HERO_SHAPE_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tamaño Selector */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label>Tamaño de la Figura</Label>
                            <span className="text-sm text-muted-foreground">{scale}%</span>
                        </div>
                        <Slider
                            value={[scale]}
                            min={50}
                            max={150}
                            step={1}
                            onValueChange={(vals) => setScale(vals[0])}
                            className="w-full"
                        />
                    </div>

                    {/* Interactive Preview Area */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label>Imagen y Posición</Label>
                            <span className="text-xs text-muted-foreground">Recomendado: 1080x1350px, máx 5MB</span>
                        </div>

                        <div
                            className="relative border-2 border-dashed rounded-lg p-4 transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 flex flex-col items-center justify-center min-h-[350px]"
                            style={{ backgroundColor: '#f9fafb' }}
                        >
                            {isUploading ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50 mb-2" />
                                    <span className="text-sm font-medium text-muted-foreground">Subiendo imagen...</span>
                                </div>
                            ) : imageUrl && imageUrl !== "/placeholder.svg" ? (
                                <div className="flex flex-col items-center w-full gap-4">
                                    <p className="text-xs text-muted-foreground text-center animate-pulse">
                                        👆 Arrastra la imagen para ajustar su posición dentro de la figura
                                    </p>
                                    <div
                                        className="relative overflow-hidden shadow-xl cursor-move touch-none group transition-all duration-300"
                                        style={{
                                            width: `${(scale / 100) * 14}rem`, // 56 corresponds to 14rem
                                            height: `${(scale / 100) * 18}rem`, // 72 corresponds to 18rem
                                            borderRadius: getHeroShapeRadius(shape),
                                            backgroundColor: '#f5e6d3'
                                        }}
                                        ref={containerRef}
                                        onPointerDown={handlePointerDown}
                                        onPointerMove={handlePointerMove}
                                        onPointerUp={handlePointerUp}
                                        onPointerCancel={handlePointerUp}
                                    >
                                        <img
                                            src={imageUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-300 group-hover:scale-105"
                                            style={{ objectPosition: bannerState?.position || 'center' }}
                                            draggable={false}
                                        />
                                    </div>
                                    <div className="flex gap-2 w-full max-w-[280px] mt-4">
                                        <Button variant="secondary" size="sm" onClick={handleRecrop} className="flex-1 shadow-sm">
                                            <Crop className="w-4 h-4 mr-2" /> Reencuadrar
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={handleUploadClick} className="flex-1 shadow-sm">
                                            <Upload className="w-4 h-4 mr-2" /> Cambiar
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground text-center">
                                        Posición: {bannerState?.position || 'center'}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 px-4 text-center cursor-pointer h-full w-full" onClick={handleUploadClick}>
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <h3 className="font-semibold mb-1">Subir imagen principal</h3>
                                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">Haz clic para buscar en tu dispositivo.</p>
                                    <Button variant="outline" size="sm" className="mt-4 pointer-events-none">Seleccionar Archivo</Button>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={onClose} disabled={isUploading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isUploading}>Guardar Cambios</Button>
                </DialogFooter>
            </DialogContent>

            <ImageCropperModal
                isOpen={cropperOpen}
                onClose={() => {
                    setCropperOpen(false);
                    setImageToCrop("");
                }}
                imageSrc={imageToCrop}
                onCropComplete={handleCropComplete}
                aspectRatio={4 / 5}
            />
        </Dialog>
    );
};
