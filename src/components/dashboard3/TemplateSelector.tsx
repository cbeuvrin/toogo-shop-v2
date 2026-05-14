
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle } from 'lucide-react';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const TEMPLATES = [
    {
        id: 'default',
        name: 'Atlántico',
        description: 'Diseño limpio y equilibrado. Ideal para cualquier tipo de tienda.',
        thumbnail: '/assets/templates/atlantico.png',
        tags: ['Versátil', 'Clásico'],
        requires: []
    },
    {
        id: 'simple_live',
        name: 'Pacífico',
        description: 'Energía y movimiento. Diseño dinámico con grandes visuales. Inspirado en marcas deportivas.',
        thumbnail: '/assets/templates/pacifico.png',
        tags: ['Deporte', 'Dinámico', 'Moderno'],
        requires: []
    },
    {
        id: 'minimal',
        name: 'Mediterráneo',
        description: 'Sofisticación y espacio en blanco. Para marcas de alta gama.',
        thumbnail: '/assets/templates/mediterraneo.png',
        tags: ['Lujo', 'Moda'],
        requires: []
    },
    {
        id: 'fashion',
        name: 'Adriático',
        description: 'Diseño moderno estilo revista. Ideal para marcas de ropa con fuerte identidad visual.',
        thumbnail: '/assets/templates/adriatico.png',
        tags: ['Moda', 'Editorial', 'Moderno'],
        requires: []
    },
    {
        id: 'fashion_hero',
        name: 'Índico',
        description: 'Hero dividido: foto a la izquierda, texto a la derecha. Sin banner superior. Elegante y minimalista.',
        thumbnail: '/assets/templates/indico.png',
        tags: ['Moda', 'Hero Foto', 'Split Layout'],
        requires: []
    },
    {
        id: 'trendy_fashion',
        name: 'Caribe',
        description: 'Hero con foto en forma orgánica a la derecha y texto elegante a la izquierda. Ideal para marcas de moda premium.',
        thumbnail: '/assets/templates/caribe.png',
        tags: ['Moda', 'Elegante', 'Premium'],
        requires: []
    },
    {
        id: 'nature',
        name: 'Nature & Earth',
        description: 'Diseño natural y orgánico con un layout limpio y elegante. Ideal para marcas ecológicas, outdoor o sustentables.',
        thumbnail: '/assets/templates/nature.png',
        tags: ['Ecológico', 'Outdoor', 'Limpio'],
        requires: []
    },
    {
        id: 'premium_brand',
        name: 'Premium Brand',
        description: 'Plantilla de alta conversión con colores oscuros, ideal para mostrar múltiples características y recomendaciones.',
        thumbnail: '/assets/templates/premium_brand.png',
        tags: ['Premium', 'Café', 'Oscuro'],
        requires: []
    },
    {
        id: 'bauhaus',
        name: 'Bauhaus',
        description: 'Editorial con geometría y colores primarios. Tipografía masiva y layout asimétrico. Ideal para marcas de arte, diseño y productos creativos.',
        thumbnail: '/assets/templates/bauhaus.svg',
        tags: ['Editorial', 'Arte', 'Geométrico'],
        requires: []
    },
    {
        id: 'cyber',
        name: 'Cyber',
        description: 'Modo oscuro futurista con acentos neón, glassmorphism y tipografía monoespacio. Ideal para tech, gaming, streetwear o productos digitales.',
        thumbnail: '/assets/templates/cyber.svg',
        tags: ['Tech', 'Dark', 'Neón'],
        requires: []
    },
];

interface TemplateSelectorProps {
    onUpdate?: () => void;
}

export const TemplateSelector = ({ onUpdate }: TemplateSelectorProps) => {
    const { settings, updateSettings, isLoading, loadSettings } = useTenantSettings();
    const { toast } = useToast();
    const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);

    const currentTemplateId = settings?.template_id || 'default';

    const handleSelect = (templateId: string) => {
        if (templateId === currentTemplateId) return;
        setSelectedTemplate(templateId);
        setIsConfirmOpen(true);
    };

    const confirmChange = async () => {
        if (!selectedTemplate) return;
        setIsSaving(true);
        try {
            await updateSettings({ template_id: selectedTemplate });
            // Force reload to ensure local state is synced if updateSettings didn't do it fully (it usually does but just in case)
            await loadSettings();

            if (onUpdate) {
                onUpdate();
            }

            toast({
                title: "Plantilla actualizada",
                description: `El diseño de tu tienda ha cambiado a ${TEMPLATES.find(t => t.id === selectedTemplate)?.name}`,
            });
            setIsConfirmOpen(false);
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo cambiar la plantilla.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div>Cargando plantillas...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {TEMPLATES.map((template) => {
                    const isActive = currentTemplateId === template.id;
                    return (
                        <Card
                            key={template.id}
                            className={`group cursor-pointer transition-all hover:shadow-md border-2 ${isActive ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-gray-200'}`}
                            onClick={() => handleSelect(template.id)}
                        >
                            <div className="aspect-video w-full bg-gray-100 relative overflow-hidden rounded-t-lg">
                                <img
                                    src={template.thumbnail}
                                    alt={template.name}
                                    className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                                {isActive && (
                                    <div className="absolute top-2 right-2 bg-primary text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                        <Check size={12} /> Activa
                                    </div>
                                )}
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex justify-between items-center">
                                    {template.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <p className="text-sm text-gray-500 mb-3">{template.description}</p>
                                <div className="flex flex-wrap gap-2">
                                    {template.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Cambiar plantilla?</DialogTitle>
                        <DialogDescription>
                            Estás a punto de cambiar el diseño de tu tienda a <strong>{TEMPLATES.find(t => t.id === selectedTemplate)?.name}</strong>.
                            El contenido (productos, banners) se mantendrá, pero la distribución visual cambiará.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancelar</Button>
                        <Button onClick={confirmChange} disabled={isSaving}>
                            {isSaving ? 'Guardando...' : 'Confirmar Cambio'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
