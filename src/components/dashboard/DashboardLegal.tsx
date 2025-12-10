import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { toast } from "sonner";
import { Scale, FileText, CheckCircle2 } from "lucide-react";

export const DashboardLegal = () => {
    const { settings, updateSettings, isLoading } = useTenantSettings();
    const [terms, setTerms] = useState("");
    const [privacy, setPrivacy] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            setTerms(settings.terms_text || "");
            setPrivacy(settings.privacy_text || "");
        }
    }, [settings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const success = await updateSettings({
                terms_text: terms,
                privacy_text: privacy
            });

            if (success) {
                toast.success("Páginas legales actualizadas correctamente");
            } else {
                toast.error("Error al guardar los cambios");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar los cambios");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div>Cargando...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Páginas Legales</h2>
                <p className="text-muted-foreground">
                    Personaliza los Términos y Condiciones y la Política de Privacidad de tu tienda.
                    Si dejas estos campos vacíos, se usarán los textos predeterminados de la plataforma.
                </p>
            </div>

            <div className="grid gap-6">
                {/* Terms and Conditions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Scale className="w-5 h-5" />
                            Términos y Condiciones
                        </CardTitle>
                        <CardDescription>
                            Define las reglas de uso de tu tienda, políticas de venta, etc.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor="terms">Contenido</Label>
                            <Textarea
                                id="terms"
                                placeholder="Escribe aquí tus términos y condiciones..."
                                className="min-h-[300px]"
                                value={terms}
                                onChange={(e) => setTerms(e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">
                                Este texto aparecerá cuando los clientes hagan clic en "Términos y Condiciones" en el pie de página.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Privacy Policy */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Política de Privacidad
                        </CardTitle>
                        <CardDescription>
                            Explica cómo manejas los datos de tus clientes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor="privacy">Contenido</Label>
                            <Textarea
                                id="privacy"
                                placeholder="Escribe aquí tu política de privacidad..."
                                className="min-h-[300px]"
                                value={privacy}
                                onChange={(e) => setPrivacy(e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">
                                Este texto aparecerá cuando los clientes hagan clic en "Política de Privacidad" en el pie de página.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end sticky bottom-6 bg-background/80 backdrop-blur-sm p-4 border rounded-lg shadow-sm">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full sm:w-auto"
                        size="lg"
                    >
                        {isSaving ? "Guardando..." : (
                            <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Guardar Cambios
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};
