import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, Eye, Save, RotateCcw } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { useTenantEmailTemplates } from "@/hooks/useTenantEmailTemplates";
import { EmailPreviewCliente } from "@/components/admin/EmailPreviewCliente";
import { supabase } from "@/integrations/supabase/client";

interface EmailTemplate {
  subject: string;
  greeting: string;
  mainMessage: string;
  footerMessage: string;
}

interface EmailEditorProps {
  mode?: 'superadmin' | 'tenant';
}

export const EmailEditor = ({ mode = 'tenant' }: EmailEditorProps) => {
  const { templates, saveTemplates, isLoading: isLoadingSystemTemplates } = useSystemSettings();
  const { customerTemplate, saveTemplate: saveTenantTemplate, isLoading: isLoadingTenantTemplate } = useTenantEmailTemplates();
  const { settings: tenantSettings, uploadLogo } = useTenantSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Default template with realistic content and variables
  const DEFAULT_TEMPLATE: EmailTemplate = {
    subject: "Confirmación de tu pedido #{numero_orden}",
    greeting: "¡Hola {nombre_cliente}! Gracias por tu pedido en {nombre_tienda}.",
    mainMessage: "Hemos recibido tu pedido por un total de {total_pedido} y está siendo procesado. Te notificaremos cuando esté listo para envío.",
    footerMessage: "Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos. ¡Gracias por confiar en {nombre_tienda}!"
  };

  // Local state for editing
  const [localTemplate, setLocalTemplate] = useState<EmailTemplate>(DEFAULT_TEMPLATE);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("content");

  // Determine which template source to use
  const isLoading = mode === 'superadmin' ? isLoadingSystemTemplates : isLoadingTenantTemplate;

  // Initialize template when data loads
  React.useEffect(() => {
    if (mode === 'superadmin' && templates?.email_template_customer) {
      setLocalTemplate({
        ...DEFAULT_TEMPLATE,
        ...templates.email_template_customer
      });
    } else if (mode === 'tenant' && customerTemplate) {
      setLocalTemplate({
        ...DEFAULT_TEMPLATE,
        ...customerTemplate
      });
    }
  }, [templates, customerTemplate, mode]);

  const handleTemplateChange = (field: keyof EmailTemplate, value: string) => {
    setLocalTemplate(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("La imagen debe ser menor a 5MB");
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error("Solo se permiten archivos de imagen");
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewLogo(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;
    
    setIsUploading(true);
    try {
      const logoUrl = await uploadLogo(logoFile);
      if (logoUrl) {
        toast.success("Logo subido correctamente");
        setLogoFile(null);
        setPreviewLogo("");
      }
    } catch (error) {
      toast.error("Error al subir el logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      if (mode === 'superadmin') {
        if (!templates) return;
        const updatedTemplates = {
          ...templates,
          email_template_customer: {
            ...localTemplate,
            orderDetails: "" // Add for backward compatibility
          }
        };
        await saveTemplates(updatedTemplates);
      } else {
        // Tenant mode: save to tenant_settings
        await saveTenantTemplate(localTemplate);
      }
    } catch (error) {
      toast.error("Error al guardar la plantilla");
    }
  };

  const handleResetTemplate = () => {
    let resetTemplate = DEFAULT_TEMPLATE;
    
    if (mode === 'superadmin' && templates?.email_template_customer) {
      resetTemplate = { ...DEFAULT_TEMPLATE, ...templates.email_template_customer };
    } else if (mode === 'tenant' && customerTemplate) {
      resetTemplate = { ...DEFAULT_TEMPLATE, ...customerTemplate };
    }
    
    setLocalTemplate(resetTemplate);
    toast.success("Plantilla restablecida");
  };

  const currentLogo = previewLogo || tenantSettings?.logo_url;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Editor de Emails</h3>
        <p className="text-muted-foreground">
          Personaliza el contenido e imágenes de los emails que reciben tus clientes
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">Contenido</TabsTrigger>
          <TabsTrigger value="images">Imágenes</TabsTrigger>
          <TabsTrigger value="preview">Vista Previa</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Editar Contenido del Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Available Variables Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 text-sm">Variables Disponibles:</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div><code className="bg-background px-1 rounded">{'{nombre_cliente}'}</code> - Nombre del cliente</div>
                  <div><code className="bg-background px-1 rounded">{'{numero_orden}'}</code> - Número de pedido</div>
                  <div><code className="bg-background px-1 rounded">{'{fecha_pedido}'}</code> - Fecha del pedido</div>
                  <div><code className="bg-background px-1 rounded">{'{total_pedido}'}</code> - Total del pedido</div>
                  <div><code className="bg-background px-1 rounded">{'{nombre_tienda}'}</code> - Nombre de tu tienda</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Asunto del Email</Label>
                  <Input
                    id="subject"
                    value={localTemplate.subject}
                    onChange={(e) => handleTemplateChange('subject', e.target.value)}
                    placeholder="Ej: Confirmación de tu pedido #{numero_orden}"
                  />
                  <p className="text-xs text-muted-foreground">Aparece en la línea de asunto del email</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="greeting">Saludo Inicial</Label>
                  <Textarea
                    id="greeting"
                    value={localTemplate.greeting}
                    onChange={(e) => handleTemplateChange('greeting', e.target.value)}
                    placeholder="Ej: ¡Hola {nombre_cliente}! Gracias por tu pedido en {nombre_tienda}."
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">Saludo personalizado al inicio del email</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mainMessage">Mensaje Principal (Opcional)</Label>
                  <Textarea
                    id="mainMessage"
                    value={localTemplate.mainMessage}
                    onChange={(e) => handleTemplateChange('mainMessage', e.target.value)}
                    placeholder="Ej: Hemos recibido tu pedido y está siendo procesado..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">Mensaje destacado opcional después del saludo</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-sm text-blue-800 mb-2">📋 Sección del Pedido (Automática)</h4>
                  <p className="text-xs text-blue-600">
                    Los detalles del pedido, productos, totales y información de pago se generan automáticamente 
                    y no se pueden modificar desde aquí.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footerMessage">Mensaje de Cierre (Opcional)</Label>
                  <Textarea
                    id="footerMessage"
                    value={localTemplate.footerMessage}
                    onChange={(e) => handleTemplateChange('footerMessage', e.target.value)}
                    placeholder="Ej: ¡Gracias por confiar en {nombre_tienda}! Contactanos si tienes dudas."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Mensaje final antes del pie de página</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logo de la Tienda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Logo Display */}
              {currentLogo && (
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <img 
                    src={currentLogo} 
                    alt="Logo actual" 
                    className="w-16 h-16 object-contain"
                  />
                  <div>
                    <p className="font-medium">Logo actual</p>
                    <p className="text-sm text-muted-foreground">
                      Este logo aparecerá en los emails
                    </p>
                  </div>
                </div>
              )}

              {/* Upload New Logo */}
              <div className="space-y-4">
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">
                    Haz clic para subir un nuevo logo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG hasta 5MB
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {logoFile && (
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <img 
                      src={previewLogo} 
                      alt="Preview" 
                      className="w-16 h-16 object-contain"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{logoFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(logoFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      onClick={handleUploadLogo}
                      disabled={isUploading}
                      size="sm"
                    >
                      {isUploading ? "Subiendo..." : "Subir"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Vista Previa del Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-48 bg-muted/50 rounded-lg">
                  <div className="text-muted-foreground">Cargando preview...</div>
                </div>
              ) : (
                <EmailPreviewCliente 
                  template={localTemplate}
                  tenantLogo={currentLogo}
                  storeName="Mi Tienda"
                  primaryColor={tenantSettings?.primary_color}
                  secondaryColor={tenantSettings?.secondary_color}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={handleSaveTemplate} disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          Guardar Plantilla
        </Button>
        <Button variant="outline" onClick={handleResetTemplate}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Restablecer
        </Button>
      </div>
    </div>
  );
};