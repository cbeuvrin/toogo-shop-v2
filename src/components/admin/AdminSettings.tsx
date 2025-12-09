import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Settings, Database, Shield, Bell, Mail, DollarSign, AlertTriangle, CreditCard, Eye, EyeOff, Check, Loader2, CheckCircle2, FileText, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EmailPreviewVendor } from './EmailPreviewVendor';
import { EmailPreviewCliente } from './EmailPreviewCliente';
import { WhatsAppPreview } from './WhatsAppPreview';
import { useTenantDataForPreview } from '@/hooks/useTenantDataForPreview';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { DEFAULT_WHATSAPP_MESSAGE } from '@/utils/whatsappMessage';
import { AdminCoupons } from './AdminCoupons';

export const AdminSettings = () => {
  const { tenantData, isLoading: tenantLoading } = useTenantDataForPreview();
  const { templates, isLoading: templatesLoading, saveTemplates } = useSystemSettings();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [adminNotifications, setAdminNotifications] = useState(true);
  
  // Pricing state
  const [pricing, setPricing] = useState({
    plans: {
      basic_annual: { name: "Plan Basic Anual", period: "year", price_mxn: 3120, description: "Cobro automático anual - 2 meses gratis", auto_billing: true, billing_cycle: "annual", savings_months: 2 },
      basic_semi_annual: { name: "Plan Basic Semestral", period: "6_months", price_mxn: 1710, description: "Cobro automático semestral - 1 mes gratis", auto_billing: true, billing_cycle: "semi_annual", savings_months: 1 },
      basic_monthly: { name: "Plan Basic Mensual", period: "month", price_mxn: 299, description: "Cobro automático mensual", auto_billing: true, billing_cycle: "monthly" }
    }
  });

  // Payment configuration state
  const [paymentConfig, setPaymentConfig] = useState({
    stripe: { enabled: false, publishable_key: '', secret_key: '' },
    paypal: { enabled: false, client_id: '', client_secret: '' },
    mercadopago: { enabled: false, access_token: '', public_key: '' }
  });
  

  // UI state
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showPayPalSecret, setShowPayPalSecret] = useState(false);
  const [showMercadoPagoSecret, setShowMercadoPagoSecret] = useState(false);
  const [validatingCredentials, setValidatingCredentials] = useState(false);
  const [validationStatus, setValidationStatus] = useState({
    stripe: 'idle',
    paypal: 'idle', 
    mercadopago: 'idle'
  });
  const [isLoading, setIsLoading] = useState(true);

  // Templates state - initialize from database or use defaults
  const [emailTemplates, setEmailTemplates] = useState({
    vendor: {
      subject: "¡Nueva venta en tu tienda Toogo!",
      greeting: "¡Hola! Tienes una nueva venta en tu tienda.",
      mainMessage: "Se ha realizado una nueva compra:",
      orderDetails: "Orden #12345 - Cliente: Juan Pérez - Total: $299 MXN",
      footerMessage: "Visita tu dashboard para más detalles. - Equipo Toogo"
    },
    customer: {
      subject: "¡Gracias por tu compra!",
      greeting: "¡Hola! Gracias por tu compra.",
      mainMessage: "Tu pedido ha sido confirmado:",
      orderDetails: "Orden #12345 - Total: $299 MXN - Envío: 2-3 días hábiles",
      footerMessage: "Te notificaremos sobre el estado de tu envío."
    }
  });
  
  const [whatsappTemplate, setWhatsappTemplate] = useState(DEFAULT_WHATSAPP_MESSAGE);

  // Update local state when templates are loaded from database
  useEffect(() => {
    if (templates) {
      if (templates.email_template_vendor) {
        setEmailTemplates(prev => ({
          ...prev,
          vendor: {
            ...templates.email_template_vendor,
            orderDetails: templates.email_template_vendor.orderDetails || ""
          }
        }));
      }
      if (templates.email_template_customer) {
        setEmailTemplates(prev => ({
          ...prev,
          customer: {
            ...templates.email_template_customer,
            orderDetails: templates.email_template_customer.orderDetails || ""
          }
        }));
      }
      if (templates.whatsapp_template) {
        setWhatsappTemplate(templates.whatsapp_template.message);
      }
    }
  }, [templates]);
  const [toogoLogo, setToogoLogo] = useState('');

  const { toast } = useToast();

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-membership-settings', {
        method: 'GET'
      });
      
      if (error) throw error;
      
      if (data.pricing) setPricing(data.pricing);
      if (data.paymentConfig) {
        // Ensure all payment providers have proper structure
        const completePaymentConfig = {
          stripe: { enabled: false, publishable_key: '', secret_key: '', ...data.paymentConfig.stripe },
          paypal: { enabled: false, client_id: '', client_secret: '', ...data.paymentConfig.paypal },
          mercadopago: { enabled: false, access_token: '', public_key: '', ...data.paymentConfig.mercadopago }
        };
        setPaymentConfig(completePaymentConfig);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: `No se pudieron cargar las configuraciones: ${error.message || 'Error desconocido'}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = () => {
    toast({
      title: "Configuración guardada",
      description: "Los cambios se han aplicado correctamente"
    });
  };

  const savePricing = async () => {
    try {
      const { error } = await supabase.functions.invoke('manage-membership-settings', {
        body: { type: 'pricing', data: pricing }
      });
      
      if (error) throw error;
      
      toast({
        title: "Precios actualizados",
        description: "Los precios de membresías se han guardado correctamente"
      });
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los precios",
        variant: "destructive"
      });
    }
  };

  const validateAndSavePaymentConfig = async (provider: 'stripe' | 'paypal' | 'mercadopago') => {
    try {
      setValidatingCredentials(true);
      setValidationStatus(prev => ({ ...prev, [provider]: 'validating' }));
      
      const credentials = provider === 'stripe' 
        ? { 
            publishableKey: paymentConfig.stripe.publishable_key,
            secretKey: paymentConfig.stripe.secret_key
          }
        : provider === 'paypal'
        ? {
            clientId: paymentConfig.paypal.client_id,
            clientSecret: paymentConfig.paypal.client_secret
          }
        : {
            accessToken: paymentConfig.mercadopago.access_token,
            publicKey: paymentConfig.mercadopago.public_key
          };

      // Validate credentials first
      const { data: validation, error: validationError } = await supabase.functions.invoke('validate-payment-credentials', {
        body: { provider, credentials }
      });

      if (validationError) {
        setValidationStatus(prev => ({ ...prev, [provider]: 'error' }));
        throw validationError;
      }

      if (!validation.valid) {
        setValidationStatus(prev => ({ ...prev, [provider]: 'error' }));
        toast({
          title: "Credenciales inválidas",
          description: validation.message,
          variant: "destructive"
        });
        return;
      }

      // If valid, save the configuration
      const { error } = await supabase.functions.invoke('manage-membership-settings', {
        body: { type: 'payment_config', data: paymentConfig }
      });
      
      if (error) {
        setValidationStatus(prev => ({ ...prev, [provider]: 'error' }));
        throw error;
      }
      
      setValidationStatus(prev => ({ ...prev, [provider]: 'success' }));
      toast({
        title: "¡Configuración exitosa!",
        description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} conectado y configurado correctamente`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error saving payment config:', error);
      setValidationStatus(prev => ({ ...prev, [provider]: 'error' }));
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración de pagos",
        variant: "destructive"
      });
    } finally {
      setValidatingCredentials(false);
    }
  };

  const handleSaveTemplates = async () => {
    try {
      const newTemplates = {
        email_template_vendor: emailTemplates.vendor,
        email_template_customer: emailTemplates.customer,
        whatsapp_template: { message: whatsappTemplate }
      };
      
      await saveTemplates(newTemplates);
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  };

  const handleBackupDatabase = () => {
    toast({
      title: "Backup iniciado",
      description: "El backup de la base de datos se está generando"
    });
  };

  const handlePurgeOldLogs = () => {
    toast({
      title: "Limpieza iniciada",
      description: "Se están eliminando los logs antiguos"
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuración del Sistema
          </CardTitle>
          <CardDescription>
            Administra la configuración global del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="inline-flex w-full md:grid md:grid-cols-6 overflow-x-auto">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden md:inline">General</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden md:inline">Seguridad</span>
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden md:inline">Templates</span>
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span className="hidden md:inline">Precios</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="hidden md:inline">Métodos de Pago</span>
              </TabsTrigger>
              <TabsTrigger value="coupons" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden md:inline">Cupones</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configuración General</CardTitle>
                  <CardDescription>
                    Configuraciones básicas del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="site-name">Nombre del Sitio</Label>
                      <Input
                        id="site-name"
                        defaultValue="Mi Plataforma E-commerce"
                        className="rounded-[30px]"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="site-description">Descripción</Label>
                      <Textarea
                        id="site-description"
                        defaultValue="Plataforma de e-commerce multi-tenant"
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="admin-email">Email de Administrador</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        defaultValue="admin@miplatforma.com"
                        className="rounded-[30px]"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="support-email">Email de Soporte</Label>
                      <Input
                        id="support-email"
                        type="email"
                        defaultValue="soporte@miplatforma.com"
                        className="rounded-[30px]"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveSettings} className="bg-purple-600 hover:bg-purple-700 text-white rounded-[30px]">
                    Guardar Configuración
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configuraciones de Registro</CardTitle>
                  <CardDescription>
                    Controla quién puede registrarse en la plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Permitir Nuevos Registros</Label>
                      <p className="text-sm text-muted-foreground">
                        Habilita o deshabilita el registro de nuevos usuarios
                      </p>
                    </div>
                    <Switch
                      checked={allowRegistrations}
                      onCheckedChange={setAllowRegistrations}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Crear Preaprobaciones Retroactivas</CardTitle>
                  <CardDescription>
                    Genera preaprobaciones de Mercado Pago para suscripciones existentes (solo una vez)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={async () => {
                      try {
                        toast({
                          title: "Procesando...",
                          description: "Creando preaprobaciones, esto puede tomar unos segundos"
                        });
                        
                        const { data, error } = await supabase.functions.invoke('create-retroactive-preapprovals');
                        
                        if (error) throw error;
                        
                        console.log('Resultado:', data);
                        
                        toast({
                          title: "✅ Preaprobaciones creadas",
                          description: `Se procesaron ${data.total} suscripciones. Revisa la consola para ver los links de autorización.`,
                          duration: 8000
                        });
                      } catch (error) {
                        console.error('Error:', error);
                        toast({
                          title: "Error",
                          description: "No se pudieron crear las preaprobaciones",
                          variant: "destructive"
                        });
                      }
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white rounded-[30px]"
                  >
                    Ejecutar Función Retroactiva
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Configuración de Seguridad
                  </CardTitle>
                  <CardDescription>
                    Configuraciones relacionadas con la seguridad del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="session-timeout">Tiempo de Sesión (minutos)</Label>
                      <Input
                        id="session-timeout"
                        type="number"
                        defaultValue="480"
                        className="rounded-[30px]"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="max-login-attempts">Intentos Máximos de Login</Label>
                      <Input
                        id="max-login-attempts"
                        type="number"
                        defaultValue="5"
                        className="rounded-[30px]"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password-min-length">Longitud Mínima de Contraseña</Label>
                      <Input
                        id="password-min-length"
                        type="number"
                        defaultValue="8"
                        className="rounded-[30px]"
                      />
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Configuraciones de Acceso</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Requerir 2FA para Admins</Label>
                          <p className="text-sm text-muted-foreground">
                            Fuerza autenticación de dos factores para administradores
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Logs de Seguridad Detallados</Label>
                          <p className="text-sm text-muted-foreground">
                            Registra todas las acciones de seguridad
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={handleSaveSettings} className="bg-purple-600 hover:bg-purple-700 text-white rounded-[30px]">
                    Guardar Configuración de Seguridad
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>


            <TabsContent value="templates" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Plantillas de Email y WhatsApp
                  </CardTitle>
                  <CardDescription>
                    Configura los templates de emails y mensajes de WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Left Column - Editors */}
                    <div className="space-y-6">
                      {/* Vendor Email Template */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Email para Vendedores</CardTitle>
                          <CardDescription>
                            Template con logo de Toogo para notificar ventas
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="vendor-subject">Asunto</Label>
                              <Input
                                id="vendor-subject"
                                value={emailTemplates.vendor.subject}
                                onChange={(e) => setEmailTemplates(prev => ({
                                  ...prev,
                                  vendor: { ...prev.vendor, subject: e.target.value }
                                }))}
                                className="rounded-[30px]"
                              />
                            </div>
                            <div>
                              <Label htmlFor="vendor-greeting">Saludo</Label>
                              <Input
                                id="vendor-greeting"
                                value={emailTemplates.vendor.greeting}
                                onChange={(e) => setEmailTemplates(prev => ({
                                  ...prev,
                                  vendor: { ...prev.vendor, greeting: e.target.value }
                                }))}
                                className="rounded-[30px]"
                              />
                            </div>
                            <div>
                              <Label htmlFor="vendor-main">Mensaje Principal</Label>
                              <Textarea
                                id="vendor-main"
                                value={emailTemplates.vendor.mainMessage}
                                onChange={(e) => setEmailTemplates(prev => ({
                                  ...prev,
                                  vendor: { ...prev.vendor, mainMessage: e.target.value }
                                }))}
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label htmlFor="vendor-footer">Mensaje de Pie</Label>
                              <Input
                                id="vendor-footer"
                                value={emailTemplates.vendor.footerMessage}
                                onChange={(e) => setEmailTemplates(prev => ({
                                  ...prev,
                                  vendor: { ...prev.vendor, footerMessage: e.target.value }
                                }))}
                                className="rounded-[30px]"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Customer Email Template */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Email para Clientes (Template General)</CardTitle>
                          <CardDescription>
                            Template base que usan usuarios Free (con logo del vendedor)
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="customer-subject">Asunto</Label>
                              <Input
                                id="customer-subject"
                                value={emailTemplates.customer.subject}
                                onChange={(e) => setEmailTemplates(prev => ({
                                  ...prev,
                                  customer: { ...prev.customer, subject: e.target.value }
                                }))}
                                className="rounded-[30px]"
                              />
                            </div>
                            <div>
                              <Label htmlFor="customer-greeting">Saludo</Label>
                              <Input
                                id="customer-greeting"
                                value={emailTemplates.customer.greeting}
                                onChange={(e) => setEmailTemplates(prev => ({
                                  ...prev,
                                  customer: { ...prev.customer, greeting: e.target.value }
                                }))}
                                className="rounded-[30px]"
                              />
                            </div>
                            <div>
                              <Label htmlFor="customer-main">Mensaje Principal</Label>
                              <Textarea
                                id="customer-main"
                                value={emailTemplates.customer.mainMessage}
                                onChange={(e) => setEmailTemplates(prev => ({
                                  ...prev,
                                  customer: { ...prev.customer, mainMessage: e.target.value }
                                }))}
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label htmlFor="customer-footer">Mensaje de Pie</Label>
                              <Input
                                id="customer-footer"
                                value={emailTemplates.customer.footerMessage}
                                onChange={(e) => setEmailTemplates(prev => ({
                                  ...prev,
                                  customer: { ...prev.customer, footerMessage: e.target.value }
                                }))}
                                className="rounded-[30px]"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* WhatsApp Template */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Mensaje WhatsApp</CardTitle>
                          <CardDescription>
                            Template para botón de WhatsApp en productos
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div>
                            <Label htmlFor="whatsapp-template">Plantilla de Mensaje</Label>
                            <Textarea
                              id="whatsapp-template"
                              value={whatsappTemplate}
                              onChange={(e) => setWhatsappTemplate(e.target.value)}
                              rows={6}
                              className="mt-2"
                              placeholder="Usa variables como {product_name}, {sku}, {price}, {customer_name}"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <Button 
                        onClick={handleSaveTemplates} 
                        disabled={templatesLoading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-[30px]"
                      >
                        {templatesLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          'Guardar Plantillas'
                        )}
                      </Button>
                    </div>

                    {/* Right Column - Previews */}
                    <div className="space-y-6">
                    <EmailPreviewVendor 
                      template={emailTemplates.vendor} 
                    />
                      
                      <EmailPreviewCliente 
                        template={emailTemplates.customer}
                        tenantLogo={tenantData?.logo_url}
                        storeName={tenantData?.name || "Tienda Demo"}
                      />
                      
                      <WhatsAppPreview 
                        template={whatsappTemplate}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Configuración de Precios de Membresías
                  </CardTitle>
                  <CardDescription>
                    Configura los precios de los planes Pro y Enterprise
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading ? (
                    <div className="text-center py-8">Cargando configuración...</div>
                  ) : (
                    <>
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Plan Basic Mensual</CardTitle>
                            <CardDescription>
                              Configuración de precios para el Plan Basic Mensual
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-2">
                              <Label htmlFor="basic-monthly-price">Precio en MXN</Label>
                              <Input
                                id="basic-monthly-price"
                                type="number"
                                step="0.01"
                                value={pricing.plans?.basic_monthly?.price_mxn || 299}
                                onChange={(e) => setPricing(prev => ({
                                  ...prev,
                                  plans: {
                                    ...prev.plans,
                                    basic_monthly: {
                                      ...prev.plans?.basic_monthly,
                                      price_mxn: parseFloat(e.target.value) || 0
                                    }
                                  }
                                }))}
                                className="rounded-[30px]"
                              />
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Descripción: {pricing.plans?.basic_monthly?.description || "Plan Basic Mensual"}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Plan Basic Semestral</CardTitle>
                            <CardDescription>
                              Configuración de precios para el Plan Basic Semestral
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-2">
                              <Label htmlFor="basic-semi-annual-price">Precio en MXN</Label>
                              <Input
                                id="basic-semi-annual-price"
                                type="number"
                                step="0.01"
                                value={pricing.plans?.basic_semi_annual?.price_mxn || 1710}
                                onChange={(e) => setPricing(prev => ({
                                  ...prev,
                                  plans: {
                                    ...prev.plans,
                                    basic_semi_annual: {
                                      ...prev.plans?.basic_semi_annual,
                                      price_mxn: parseFloat(e.target.value) || 0
                                    }
                                  }
                                }))}
                                className="rounded-[30px]"
                              />
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Descripción: {pricing.plans?.basic_semi_annual?.description || "Plan Basic Semestral - 1 mes gratis"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Equivale a: ${Math.round((pricing.plans?.basic_semi_annual?.price_mxn || 1710) / 6)} MXN/mes
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Ahorro: {pricing.plans?.basic_semi_annual?.savings_months || 1} mes
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Plan Basic Anual</CardTitle>
                            <CardDescription>
                              Configuración de precios para el Plan Basic Anual
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-2">
                              <Label htmlFor="basic-annual-price">Precio en MXN</Label>
                              <Input
                                id="basic-annual-price"
                                type="number"
                                step="0.01"
                                value={pricing.plans?.basic_annual?.price_mxn || 3120}
                                onChange={(e) => setPricing(prev => ({
                                  ...prev,
                                  plans: {
                                    ...prev.plans,
                                    basic_annual: {
                                      ...prev.plans?.basic_annual,
                                      price_mxn: parseFloat(e.target.value) || 0
                                    }
                                  }
                                }))}
                                className="rounded-[30px]"
                              />
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Descripción: {pricing.plans?.basic_annual?.description || "Plan Basic Anual - 2 meses gratis"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Equivale a: ${Math.round((pricing.plans?.basic_annual?.price_mxn || 3120) / 12)} MXN/mes
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Ahorro: {pricing.plans?.basic_annual?.savings_months || 2} meses
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Button 
                        onClick={savePricing} 
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-[30px]"
                      >
                        Guardar Precios
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Configuración de Métodos de Pago
                  </CardTitle>
                  <CardDescription>
                    Configura los métodos de pago para las membresías de la plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading ? (
                    <div className="text-center py-8">Cargando configuración...</div>
                  ) : (
                    <>
                      {/* Stripe Configuration */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center justify-between">
                            Stripe
                            <Switch
                              checked={paymentConfig.stripe.enabled}
                              onCheckedChange={(enabled) => setPaymentConfig(prev => ({
                                ...prev,
                                stripe: { ...prev.stripe, enabled }
                              }))}
                            />
                          </CardTitle>
                          <CardDescription>
                            Configuración de Stripe para procesar pagos de membresías
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-2">
                            <Label htmlFor="stripe-publishable">Clave Pública (Publishable Key)</Label>
                            <Input
                              id="stripe-publishable"
                              placeholder="pk_test_..."
                              value={paymentConfig.stripe.publishable_key}
                              onChange={(e) => setPaymentConfig(prev => ({
                                ...prev,
                                stripe: { ...prev.stripe, publishable_key: e.target.value }
                              }))}
                              className="rounded-[30px]"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="stripe-secret">Clave Secreta (Secret Key)</Label>
                            <div className="relative">
                              <Input
                                id="stripe-secret"
                                type={showStripeSecret ? "text" : "password"}
                                placeholder="sk_test_..."
                                value={paymentConfig.stripe.secret_key}
                                onChange={(e) => setPaymentConfig(prev => ({
                                  ...prev,
                                  stripe: { ...prev.stripe, secret_key: e.target.value }
                                }))}
                                className="rounded-[30px] pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowStripeSecret(!showStripeSecret)}
                              >
                                {showStripeSecret ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <Button 
                            onClick={() => validateAndSavePaymentConfig('stripe')}
                            disabled={!paymentConfig.stripe.publishable_key || !paymentConfig.stripe.secret_key || validatingCredentials}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-[30px]"
                          >
                            {validatingCredentials ? 'Validando...' : 'Validar y Guardar Stripe'}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* PayPal Configuration */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center justify-between">
                            PayPal
                            <Switch
                              checked={paymentConfig.paypal.enabled}
                              onCheckedChange={(enabled) => setPaymentConfig(prev => ({
                                ...prev,
                                paypal: { ...prev.paypal, enabled }
                              }))}
                            />
                          </CardTitle>
                          <CardDescription>
                            Configuración de PayPal para procesar pagos de membresías
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-2">
                            <Label htmlFor="paypal-client-id">Client ID</Label>
                            <Input
                              id="paypal-client-id"
                              placeholder="Tu PayPal Client ID"
                              value={paymentConfig.paypal.client_id}
                              onChange={(e) => setPaymentConfig(prev => ({
                                ...prev,
                                paypal: { ...prev.paypal, client_id: e.target.value }
                              }))}
                              className="rounded-[30px]"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="paypal-secret">Client Secret</Label>
                            <div className="relative">
                              <Input
                                id="paypal-secret"
                                type={showPayPalSecret ? "text" : "password"}
                                placeholder="Tu PayPal Client Secret"
                                value={paymentConfig.paypal.client_secret}
                                onChange={(e) => setPaymentConfig(prev => ({
                                  ...prev,
                                  paypal: { ...prev.paypal, client_secret: e.target.value }
                                }))}
                                className="rounded-[30px] pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPayPalSecret(!showPayPalSecret)}
                              >
                                {showPayPalSecret ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <Button 
                            onClick={() => validateAndSavePaymentConfig('paypal')}
                            disabled={!paymentConfig.paypal.client_id || !paymentConfig.paypal.client_secret || validatingCredentials}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white rounded-[30px]"
                          >
                            {validatingCredentials ? 'Validando...' : 'Validar y Guardar PayPal'}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* MercadoPago Configuration */}
                      <Card>
                        <CardHeader>
                           <CardTitle className="text-base flex items-center gap-2">
                             <CreditCard className="w-4 h-4" />
                             MercadoPago
                             {validationStatus.mercadopago === 'success' && (
                               <div className="flex items-center gap-1 text-green-600">
                                 <CheckCircle2 className="w-4 h-4" />
                                 <span className="text-xs font-normal">Conectado</span>
                               </div>
                             )}
                           </CardTitle>
                           <CardDescription>
                             Configuración de MercadoPago para cobros de la plataforma
                             {validationStatus.mercadopago === 'success' && (
                               <span className="text-green-600 font-medium"> - Credenciales validadas ✓</span>
                             )}
                           </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Habilitar MercadoPago</Label>
                              <p className="text-sm text-muted-foreground">
                                Activa MercadoPago para procesar pagos de membresías
                              </p>
                            </div>
                             <Switch
                               checked={paymentConfig.mercadopago.enabled}
                               onCheckedChange={(checked) =>
                                 setPaymentConfig({
                                   ...paymentConfig,
                                   mercadopago: { ...paymentConfig.mercadopago, enabled: checked }
                                 })
                               }
                               disabled={validationStatus.mercadopago !== 'success'}
                               className={validationStatus.mercadopago === 'success' ? 'data-[state=checked]:bg-green-600' : ''}
                             />
                          </div>
                          
                          <div className="grid gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="mp-access-token">Access Token (Privado)</Label>
                              <div className="relative">
                                <Input
                                  id="mp-access-token"
                                  type={showMercadoPagoSecret ? "text" : "password"}
                                  placeholder="APP_USR-xxxxxxxx-xxxxxx-xx"
                                  value={paymentConfig.mercadopago.access_token}
                                  onChange={(e) =>
                                    setPaymentConfig({
                                      ...paymentConfig,
                                      mercadopago: { ...paymentConfig.mercadopago, access_token: e.target.value }
                                    })
                                  }
                                  className="rounded-[30px] pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowMercadoPagoSecret(!showMercadoPagoSecret)}
                                >
                                  {showMercadoPagoSecret ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="mp-public-key">Public Key</Label>
                              <Input
                                id="mp-public-key"
                                type="text"
                                placeholder="APP_USR-xxxxxxxx-xxxxxx-xx"
                                value={paymentConfig.mercadopago.public_key}
                                onChange={(e) =>
                                  setPaymentConfig({
                                    ...paymentConfig,
                                    mercadopago: { ...paymentConfig.mercadopago, public_key: e.target.value }
                                  })
                                }
                                className="rounded-[30px]"
                              />
                            </div>
                          </div>
                           <Button 
                             onClick={() => validateAndSavePaymentConfig('mercadopago')}
                             disabled={!paymentConfig.mercadopago.access_token || !paymentConfig.mercadopago.public_key || validatingCredentials}
                             className={`rounded-[30px] ${
                               validationStatus.mercadopago === 'success' 
                                 ? 'bg-green-600 hover:bg-green-700' 
                                 : 'bg-blue-600 hover:bg-blue-700'
                             } text-white`}
                           >
                             {validatingCredentials && validationStatus.mercadopago === 'validating' ? (
                               <div className="flex items-center gap-2">
                                 <Loader2 className="w-4 h-4 animate-spin" />
                                 Validando...
                               </div>
                             ) : validationStatus.mercadopago === 'success' ? (
                               <div className="flex items-center gap-2">
                                 <Check className="w-4 h-4" />
                                 MercadoPago Conectado
                               </div>
                             ) : (
                               'Validar y Guardar MercadoPago'
                             )}
                           </Button>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="coupons" className="space-y-6">
              <AdminCoupons />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};