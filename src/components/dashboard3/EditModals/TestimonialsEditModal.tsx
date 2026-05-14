import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Testimonial {
    id: string;
    author: string;
    role: string;
    company: string;
    text: string;
    logo: string;
}

interface TestimonialsData {
    enabled: boolean;
    position: string;
    list: Testimonial[];
    title?: string;
}

interface TestimonialsEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    data?: TestimonialsData;
    onSave: (data: TestimonialsData) => void;
}

export const TestimonialsEditModal = ({
    isOpen,
    onClose,
    data,
    onSave,
}: TestimonialsEditModalProps) => {
    const defaultData: TestimonialsData = {
        enabled: true,
        position: 'beneath_hero',
        title: 'Recomendaciones de Personas',
        list: [
            {
                id: '1',
                author: 'John Doe',
                role: 'CEO',
                company: 'Company Inc',
                text: 'This is an amazing product!',
                logo: '/placeholder.svg'
            }
        ],
    };

    const [formData, setFormData] = useState<TestimonialsData>(defaultData);

    useEffect(() => {
        if (data) {
            setFormData({
                enabled: data.enabled ?? true,
                position: data.position || 'beneath_hero',
                title: data.title || 'Recomendaciones de Personas',
                list: data.list && data.list.length > 0 ? data.list : defaultData.list,
            });
        } else {
            setFormData(defaultData);
        }
    }, [data, isOpen]);

    const handleToggleEnabled = (checked: boolean) => {
        setFormData((prev) => ({ ...prev, enabled: checked }));
    };

    const handlePositionChange = (value: string) => {
        setFormData((prev) => ({ ...prev, position: value }));
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, title: e.target.value }));
    };

    const updateTestimonial = (id: string, field: keyof Testimonial, value: string) => {
        setFormData((prev) => ({
            ...prev,
            list: prev.list.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
        }));
    };

    const removeTestimonial = (id: string) => {
        setFormData((prev) => ({
            ...prev,
            list: prev.list.filter((t) => t.id !== id),
        }));
    };

    const addTestimonial = () => {
        const newId = Math.random().toString(36).substr(2, 9);
        setFormData((prev) => ({
            ...prev,
            list: [
                ...prev.list,
                {
                    id: newId,
                    author: '',
                    role: '',
                    company: '',
                    text: '',
                    logo: '/placeholder.svg',
                },
            ],
        }));
    };

    const handleSave = () => {
        onSave(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Testimoniales</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="testimonials-enabled" className="text-sm font-medium">Activar Sección</Label>
                        <Switch
                            id="testimonials-enabled"
                            checked={formData.enabled}
                            onCheckedChange={handleToggleEnabled}
                        />
                    </div>

                    {formData.enabled && (
                        <>
                            <div className="space-y-2">
                                <Label>Posición en la página</Label>
                                <Select value={formData.position} onValueChange={handlePositionChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una posición" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="top">Arriba del todo</SelectItem>
                                        <SelectItem value="beneath_hero">Debajo del Hero</SelectItem>
                                        <SelectItem value="above_footer">Arriba del Footer</SelectItem>
                                        <SelectItem value="bottom">Debajo del Footer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Título de la sección</Label>
                                <Input
                                    value={formData.title || ''}
                                    onChange={handleTitleChange}
                                    placeholder="Ej: Recomendaciones de Personas"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Lista de Testimonios</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addTestimonial}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Añadir Nuevo
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {formData.list.map((testimonial, index) => (
                                        <div key={testimonial.id} className="p-4 border rounded-md relative group">
                                            <div className="absolute top-2 right-2 flex space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeTestimonial(testimonial.id)}
                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div className="flex items-center mb-4">
                                                <GripVertical className="w-4 h-4 mr-2 text-gray-400 cursor-move" />
                                                <span className="text-sm font-bold text-gray-500">Testimonio {index + 1}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Autor</Label>
                                                    <Input
                                                        value={testimonial.author}
                                                        onChange={(e) => updateTestimonial(testimonial.id, 'author', e.target.value)}
                                                        placeholder="Nombre del autor"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Empresa</Label>
                                                    <Input
                                                        value={testimonial.company}
                                                        onChange={(e) => updateTestimonial(testimonial.id, 'company', e.target.value)}
                                                        placeholder="Empresa (opcional)"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Cargo</Label>
                                                    <Input
                                                        value={testimonial.role}
                                                        onChange={(e) => updateTestimonial(testimonial.id, 'role', e.target.value)}
                                                        placeholder="Cargo (opcional)"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">URL Logo (opcional)</Label>
                                                    <Input
                                                        value={testimonial.logo}
                                                        onChange={(e) => updateTestimonial(testimonial.id, 'logo', e.target.value)}
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                                <div className="col-span-2 space-y-2">
                                                    <Label className="text-xs">Texto / Cita</Label>
                                                    <Textarea
                                                        value={testimonial.text}
                                                        onChange={(e) => updateTestimonial(testimonial.id, 'text', e.target.value)}
                                                        placeholder="Escribe el testimonio aquí..."
                                                        rows={3}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {formData.list.length === 0 && (
                                        <div className="text-center p-4 border rounded-md border-dashed text-gray-500">
                                            No hay testimonios. Haz clic en "Añadir Nuevo" para empezar.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave}>Guardar Cambios</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
