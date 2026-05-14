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

interface TickerData {
    text: string;
    enabled: boolean;
}

interface TickerEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: TickerData) => void;
    initialData?: TickerData;
}

export const TickerEditModal = ({ isOpen, onClose, onSave, initialData }: TickerEditModalProps) => {
    const [formData, setFormData] = useState<TickerData>({
        text: "New Styles Added Weekly",
        enabled: true
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
                    <DialogTitle>Editar Barra de Noticias (Ticker)</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="enabled">Mostrar barra</Label>
                            <div className="text-xs text-muted-foreground">
                                Activa o desactiva la barra de noticias desplazable
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
                            placeholder="Ej: Nuevos estilos cada semana"
                        />
                        <p className="text-xs text-muted-foreground">
                            Este texto se repetirá automáticamente.
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
