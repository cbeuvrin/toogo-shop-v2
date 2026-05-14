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
            <DialogContent className="sm:max-w-md">
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
