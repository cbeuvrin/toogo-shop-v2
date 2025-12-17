import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, ExternalLink, ImageIcon } from "lucide-react";

interface PendingRequest {
    id: string; // settings id
    tenant_id: string;
    share_title_draft: string;
    share_description_draft: string;
    share_image_url_draft: string;
    share_approval_status: string;
    tenant_name?: string; // joined
}

export const AdminModeration = () => {
    const [requests, setRequests] = useState<PendingRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const loadRequests = async () => {
        setIsLoading(true);
        try {
            // Fetch settings with status = 'pending'
            // Also fetch tenant name. Since we don't have direct join easily without foreign key setup usually, 
            // we'll try to join if relationship exists, or just fetch all and filter.
            // Assuming 'tenants' table exists and there is a relationship? 
            // Usually tenant_settings.tenant_id references tenants.id

            const { data, error } = await supabase
                .from('tenant_settings')
                .select(`
          *,
          tenants:tenant_id (
            name,
            id
          )
        `)
                .eq('share_approval_status', 'pending');

            if (error) throw error;

            // Transform data
            const formatted = (data || []).map((item: any) => ({
                ...item,
                tenant_name: item.tenants?.name || 'Desconocido'
            }));

            setRequests(formatted);
        } catch (error) {
            console.error('Error loading moderation requests:', error);
            toast({
                title: "Error",
                description: "No se pudieron cargar las solicitudes.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleApprove = async (request: PendingRequest) => {
        try {
            const { error } = await supabase
                .from('tenant_settings')
                .update({
                    share_title: request.share_title_draft,
                    share_description: request.share_description_draft,
                    share_image_url: request.share_image_url_draft,
                    share_approval_status: 'approved',
                    share_title_draft: null, // Clear drafts or keep them? Clearing is cleaner.
                    share_description_draft: null,
                    share_image_url_draft: null
                })
                .eq('id', request.id);

            if (error) throw error;

            toast({
                title: "Solicitud Aprobada",
                description: "Los cambios ya son visibles en la tienda."
            });

            loadRequests(); // Refresh list
        } catch (error) {
            console.error('Error approving request:', error);
            toast({
                title: "Error",
                description: "No se pudo aprobar la solicitud.",
                variant: "destructive"
            });
        }
    };

    const handleReject = async (request: PendingRequest) => {
        try {
            const { error } = await supabase
                .from('tenant_settings')
                .update({
                    share_approval_status: 'rejected'
                    // We keep the draft values so the user can see what they submitted/edit them
                })
                .eq('id', request.id);

            if (error) throw error;

            toast({
                title: "Solicitud Rechazada",
                description: "Se ha marcado como rechazada."
            });

            loadRequests();
        } catch (error) {
            console.error('Error rejecting request:', error);
            toast({
                title: "Error",
                description: "No se pudo rechazar la solicitud.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Moderación de Metadatos</h2>
                <p className="text-muted-foreground">
                    Revisa y aprueba los cambios de imagen/texto para redes sociales de tus tiendas.
                </p>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : requests.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                        <CheckCircle2 className="w-12 h-12 mb-4 text-green-500 opacity-50" />
                        <p className="text-lg font-medium">¡Todo al día!</p>
                        <p>No hay solicitudes pendientes de revisión.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {requests.map((request) => (
                        <Card key={request.id} className="overflow-hidden">
                            <CardHeader className="bg-muted/40 pb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-yellow-600" />
                                            {request.tenant_name}
                                        </CardTitle>
                                        <CardDescription>ID: {request.tenant_id}</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleReject(request)}
                                        >
                                            <XCircle className="w-4 h-4 mr-1" /> Rechazar
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => handleApprove(request)}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-1" /> Aprobar
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="grid md:grid-cols-2 gap-0 divide-x">
                                    <div className="p-6 space-y-4">
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título Propuesto</span>
                                            <p className="font-medium text-lg">{request.share_title_draft || "(Sin cambios)"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción Propuesta</span>
                                            <p className="text-sm text-gray-600">{request.share_description_draft || "(Sin cambios)"}</p>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-50 flex items-center justify-center">
                                        {request.share_image_url_draft ? (
                                            <div className="space-y-2 w-full max-w-sm">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Imagen Propuesta</span>
                                                <div className="aspect-video rounded-lg overflow-hidden border shadow-sm relative group bg-white">
                                                    <img
                                                        src={request.share_image_url_draft}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <a
                                                        href={request.share_image_url_draft}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <ExternalLink className="text-white w-6 h-6" />
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-muted-foreground">
                                                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <span className="text-sm">Sin cambio de imagen</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
