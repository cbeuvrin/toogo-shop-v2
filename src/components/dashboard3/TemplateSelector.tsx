
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle } from 'lucide-react';
import { TEMPLATES } from '@/lib/templatesCatalog';
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
import { DesignWizard } from './DesignWizard';



interface TemplateSelectorProps {
    onUpdate?: () => void;
}

export const TemplateSelector = ({ onUpdate }: TemplateSelectorProps) => {
    const { settings, updateSettings, isLoading, loadSettings } = useTenantSettings();
    const { toast } = useToast();
    const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [wizardOpen, setWizardOpen] = React.useState(false);

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
            <div className="mb-4 flex justify-end">
                <button
                    onClick={() => setWizardOpen(true)}
                    className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                >
                    ✨ Diséñala con IA
                </button>
            </div>
            <DesignWizard open={wizardOpen} onOpenChange={setWizardOpen} />
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
                                        const img = e.target as HTMLImageElement;
                                        img.style.display = 'none';
                                        const fb = img.nextElementSibling as HTMLElement | null;
                                        if (fb) fb.style.display = 'flex';
                                    }}
                                />
                                {/* Fallback when the thumbnail image is missing/broken */}
                                <div
                                    className="absolute inset-0 hidden flex-col items-center justify-center text-white text-center px-4"
                                    style={{ background: 'linear-gradient(135deg, #023f66 0%, #e98063 100%)' }}
                                >
                                    <span className="text-xl font-black uppercase tracking-tight drop-shadow">{template.name}</span>
                                    <span className="text-[10px] uppercase tracking-widest opacity-80 mt-1">Vista previa</span>
                                </div>
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
