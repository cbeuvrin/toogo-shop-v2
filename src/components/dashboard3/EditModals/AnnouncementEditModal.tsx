import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface AnnouncementData {
    text: string;
    enabled: boolean;
    link?: string;
    /** Optional overrides — empty keeps each template's default bar colors. */
    bgColor?: string;
    textColor?: string;
}

interface AnnouncementEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: AnnouncementData) => void;
    initialData?: AnnouncementData;
}

export const AnnouncementEditModal = ({ isOpen, onClose, onSave, initialData }: AnnouncementEditModalProps) => {
    const [formData, setFormData] = useState<AnnouncementData>({
        text: "Refer A Friend To Earn $10 Off Your Next Purchase Of $50+ 👯‍♀️",
        enabled: true,
        link: ""
    });

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData
            }));
        }
    }, [initialData]);

    const handleSave = () => {
        onSave(formData);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Barra de Anuncios</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="enabled">Mostrar barra</Label>
                            <div className="text-xs text-muted-foreground">
                                Activa o desactiva la barra superior
                            </div>
                        </div>
                        <Switch
                            id="enabled"
                            checked={formData.enabled}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="text">Texto del anuncio</Label>
                        <Input
                            id="text"
                            value={formData.text}
                            onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                            placeholder="Ej: Envío gratis en todas tus compras"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ann-bg-color">Color de fondo</Label>
                        <div className="flex items-center gap-2">
                            <input
                                id="ann-bg-color"
                                type="color"
                                value={formData.bgColor || "#000000"}
                                onChange={(e) => setFormData(prev => ({ ...prev, bgColor: e.target.value }))}
                                className="h-9 w-12 rounded border cursor-pointer"
                            />
                            <Input
                                value={formData.bgColor || ""}
                                onChange={(e) => setFormData(prev => ({ ...prev, bgColor: e.target.value }))}
                                placeholder="Por defecto"
                                className="font-mono text-xs"
                            />
                            {formData.bgColor && (
                                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFormData(prev => ({ ...prev, bgColor: undefined }))}>
                                    Quitar
                                </Button>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Vacío = usar el color por defecto de la plantilla.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ann-text-color">Color del texto</Label>
                        <div className="flex items-center gap-2">
                            <input
                                id="ann-text-color"
                                type="color"
                                value={formData.textColor || "#ffffff"}
                                onChange={(e) => setFormData(prev => ({ ...prev, textColor: e.target.value }))}
                                className="h-9 w-12 rounded border cursor-pointer"
                            />
                            <Input
                                value={formData.textColor || ""}
                                onChange={(e) => setFormData(prev => ({ ...prev, textColor: e.target.value }))}
                                placeholder="Por defecto"
                                className="font-mono text-xs"
                            />
                            {formData.textColor && (
                                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFormData(prev => ({ ...prev, textColor: undefined }))}>
                                    Quitar
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="link">Enlace (Opcional)</Label>
                        <Input
                            id="link"
                            value={formData.link || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                            placeholder="https://..."
                        />
                        <p className="text-xs text-muted-foreground">
                            Si dejas este campo vacío, la barra no será clickeable.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave}>
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
