import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
    fontSize?: number; // px applied as inline style on the ticker text
    animated?: boolean; // marquee scrolling effect — default true
    bgColor?: string; // empty = use template default background
    textColor?: string; // empty = use template default text color
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
        enabled: true,
        fontSize: 12,
        animated: true,
        bgColor: "",
        textColor: ""
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
                    <DialogTitle>Editar Barra de Noticias (Ticker)</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="enabled">Mostrar barra</Label>
                            <div className="text-xs text-muted-foreground">
                                Activa o desactiva la barra de noticias
                            </div>
                        </div>
                        <Switch
                            id="enabled"
                            checked={formData.enabled}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="animated">Mover texto (efecto marquee)</Label>
                            <div className="text-xs text-muted-foreground">
                                El texto se desliza de derecha a izquierda. Apágalo para mostrar el texto fijo y centrado.
                            </div>
                        </div>
                        <Switch
                            id="animated"
                            checked={formData.animated !== false}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, animated: checked }))}
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

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Tamaño del texto</Label>
                            <span className="text-xs text-muted-foreground">{formData.fontSize || 12}px</span>
                        </div>
                        <Slider
                            value={[formData.fontSize || 12]}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, fontSize: v[0] }))}
                            min={10}
                            max={32}
                            step={1}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Pequeño</span>
                            <span>Grande</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            La barra ajusta su altura automáticamente al tamaño del texto.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ticker-bg-color">Color de fondo</Label>
                        <div className="flex items-center gap-2">
                            <input
                                id="ticker-bg-color"
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
                                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFormData(prev => ({ ...prev, bgColor: "" }))}>
                                    Quitar
                                </Button>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Vacío = usar el color por defecto de la plantilla.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ticker-text-color">Color del texto</Label>
                        <div className="flex items-center gap-2">
                            <input
                                id="ticker-text-color"
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
                                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFormData(prev => ({ ...prev, textColor: "" }))}>
                                    Quitar
                                </Button>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Vacío = usar el color por defecto de la plantilla.</p>
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
