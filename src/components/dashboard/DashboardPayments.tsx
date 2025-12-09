import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, MessageCircle, DollarSign, Settings, Shield, AlertTriangle, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useTenantContext } from "@/contexts/TenantContext";
import { usePlanRestrictions } from "@/hooks/usePlanRestrictions";

interface PaymentConfig {
  mercadopago: {
    enabled: boolean;
    publicKey: string;
    hasAccessToken: boolean;
  };
  paypal: {
    enabled: boolean;
    clientId: string;
    hasClientSecret: boolean;
  };
  stripe: {
    enabled: boolean;
    publicKey: string;
    hasSecretKey: boolean;
  };
  whatsapp: {
    enabled: boolean;
    number: string;
    message: string;
  };
}

interface PaymentDisplaySettings {
  whatsapp_number?: string | null;
  whatsapp_message?: string | null;
  mercadopago_public_key?: string | null;
  paypal_client_id?: string | null;
}

export const DashboardPayments = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentTenantId: tenantId, isLoading: tenantLoading } = useTenantContext();
  const { restrictions, plan } = usePlanRestrictions();
  const [config, setConfig] = useState<PaymentConfig>({
    mercadopago: {
      enabled: false,
      publicKey: "",
      hasAccessToken: false
    },
    paypal: {
      enabled: false,
      clientId: "",
      hasClientSecret: false
    },
    stripe: {
      enabled: false,
      publicKey: "",
      hasSecretKey: false
    },
    whatsapp: {
      enabled: false,
      number: "",
      message: "Hola! Me interesa este producto: {product_name}. Precio: {price}. Mi información de contacto: {customer_name} - {customer_phone}"
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenantLoading && tenantId) {
      loadPaymentConfig();
    }
  }, [tenantId, tenantLoading]);

  const loadPaymentConfig = async () => {
    if (!user || !tenantId) return;

    try {
      setLoading(true);

      // SECURITY: Use secure RPC instead of direct table access
      // This follows principle of least privilege by only exposing display-safe data
      const { data, error } = await supabase
        .rpc('get_tenant_payment_display_config', { p_tenant_id: tenantId });

      if (error) throw error;

      const settings = data as unknown as PaymentDisplaySettings;

      if (settings) {
        // SECURITY NOTE: settings contains ONLY public/display-safe keys
        // - mercadopago_public_key: PUBLIC key (not secret) for frontend
        // - paypal_client_id: PUBLIC identifier (not secret) for frontend
        // - Secret credentials are stored in Supabase secrets and never exposed to frontend
        console.log('Received secure payment config (public keys only)');
        setConfig(prev => ({
          ...prev,
          whatsapp: {
            enabled: !!settings.whatsapp_number,
            number: settings.whatsapp_number || '',
            message: settings.whatsapp_message || 'Hola! Me interesa este producto: {product_name}. Precio: {price}. Mi información de contacto: {customer_name} - {customer_phone}'
          },
          mercadopago: {
            enabled: !!settings.mercadopago_public_key,
            publicKey: settings.mercadopago_public_key || '',
            hasAccessToken: false // Secret token stored in Supabase secrets (not returned by RPC)
          },
          paypal: {
            enabled: !!settings.paypal_client_id,
            clientId: settings.paypal_client_id || '',
            hasClientSecret: false // Secret stored in Supabase secrets (not returned by RPC)
          },
          stripe: {
            enabled: false, // Will be implemented when Stripe is enabled
            publicKey: '',
            hasSecretKey: false
          }
        }));
      }
    } catch (error: any) {
      console.error('Error loading payment config:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración de pagos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (provider: keyof PaymentConfig, field: string, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!tenantId) {
      toast({
        title: "Error",
        description: "No se pudo identificar el tenant.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Update public settings in tenant_settings table using update() like useTenantSettings
      const { error: settingsError } = await supabase
        .from('tenant_settings')
        .update({
          mercadopago_public_key: config.mercadopago.publicKey || null,
          paypal_client_id: config.paypal.clientId || null,
          whatsapp_number: config.whatsapp.number || null,
          whatsapp_message: config.whatsapp.message || null,
        })
        .eq('tenant_id', tenantId);

      if (settingsError) {
        console.error('Error saving payment config:', settingsError);
        throw settingsError;
      }

      toast({
        title: "Configuración de pago exitosa",
        description: "Tu configuración de pagos se ha guardado correctamente.",
      });
    } catch (error: any) {
      console.error('Error saving payment config:', error);
      toast({
        title: "Error",
        description: `No se pudo guardar la configuración: ${error.message || 'Error desconocido'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Métodos de Pago</h3>
        <p className="text-sm text-muted-foreground">
          Configura las opciones de pago para tu tienda
        </p>
      </div>

      {/* Security Notice */}
      <Alert>
        <div className="flex items-start gap-3">
          <Shield className="h-10 w-10 text-green-600 flex-shrink-0 mt-1" />
          <AlertDescription>
            <strong>Seguridad mejorada:</strong> Las claves públicas mostradas aquí son seguras para usar en tu tienda web. Las claves secretas están protegidas en un almacenamiento cifrado separado y nunca se muestran en la interfaz.
            <br /><br />
            <span className="text-xs text-muted-foreground">
              🔒 MercadoPago Public Key & PayPal Client ID: Claves públicas (seguras para frontend)
              <br />
              🔐 Access Tokens & Client Secrets: Almacenados de forma segura en Supabase Secrets
            </span>
          </AlertDescription>
        </div>
      </Alert>

      {/* WhatsApp */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <CardTitle>WhatsApp</CardTitle>
              <Badge variant={config.whatsapp.enabled ? "default" : "secondary"}>
                {config.whatsapp.enabled ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <Switch
              checked={config.whatsapp.enabled}
              onCheckedChange={(checked) => updateConfig("whatsapp", "enabled", checked)}
            />
          </div>
          <CardDescription>
            Los clientes podrán contactarte directamente por WhatsApp con el producto preseleccionado
          </CardDescription>
        </CardHeader>
        {config.whatsapp.enabled && (
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="whatsapp-number">Número de WhatsApp *</Label>
              <Input
                id="whatsapp-number"
                value={config.whatsapp.number}
                onChange={(e) => updateConfig("whatsapp", "number", e.target.value)}
                placeholder="+52 55 1234 5678"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Incluye el código de país (ej: +52 para México)
              </p>
            </div>
            <div>
              <Label htmlFor="whatsapp-message">Mensaje predeterminado</Label>
              <Textarea
                id="whatsapp-message"
                value={config.whatsapp.message}
                onChange={(e) => updateConfig("whatsapp", "message", e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variables disponibles: {"{product_name}"}, {"{price}"}, {"{customer_name}"}, {"{customer_phone}"}
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Mercado Pago */}
      <Card className={!restrictions.canUseMercadoPago ? "opacity-50" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <CardTitle>Mercado Pago</CardTitle>
              {!restrictions.canUseMercadoPago && (
                <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                  <Crown className="w-3 h-3 mr-1" />
                  Basic
                </Badge>
              )}
              <Badge variant={config.mercadopago.enabled ? "default" : "secondary"}>
                {config.mercadopago.enabled ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <Switch
              checked={config.mercadopago.enabled}
              onCheckedChange={(checked) => updateConfig("mercadopago", "enabled", checked)}
              disabled={!restrictions.canUseMercadoPago}
            />
          </div>
          <CardDescription>
            Acepta pagos con tarjetas de crédito/débito y otros métodos populares en Latinoamérica
            {!restrictions.canUseMercadoPago && (
              <div className="text-orange-600 font-medium mt-1">
                Disponible en el Plan Basic ($299 MXN/mes)
              </div>
            )}
          </CardDescription>
        </CardHeader>
        {config.mercadopago.enabled && (
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mp-public-key">Public Key *</Label>
              <Input
                id="mp-public-key"
                value={config.mercadopago.publicKey}
                onChange={(e) => updateConfig("mercadopago", "publicKey", e.target.value)}
                placeholder="APP_USR-..."
              />
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Access Token (Secreto):</strong> {config.mercadopago.hasAccessToken ? "✅ Configurado en secretos" : "❌ No configurado"}
                <br />
                ¿No sabes cómo obtener tus credenciales de MercadoPago?{" "}
                <a
                  href="/ayuda/configurar-pagos?provider=mercadopago"
                  className="text-primary hover:underline font-medium"
                  target="_blank"
                >
                  Ver guía paso a paso →
                </a>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* PayPal */}
      <Card className={!restrictions.canUsePayPal ? "opacity-50" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-500" />
              <CardTitle>PayPal</CardTitle>
              {!restrictions.canUsePayPal && (
                <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                  <Crown className="w-3 h-3 mr-1" />
                  Basic
                </Badge>
              )}
              <Badge variant={config.paypal.enabled ? "default" : "secondary"}>
                {config.paypal.enabled ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <Switch
              checked={config.paypal.enabled}
              onCheckedChange={(checked) => updateConfig("paypal", "enabled", checked)}
              disabled={!restrictions.canUsePayPal}
            />
          </div>
          <CardDescription>
            Acepta pagos con PayPal y tarjetas internacionales
            {!restrictions.canUsePayPal && (
              <div className="text-orange-600 font-medium mt-1">
                Disponible en el Plan Basic ($299 MXN/mes)
              </div>
            )}
          </CardDescription>
        </CardHeader>
        {config.paypal.enabled && (
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="paypal-client-id">Client ID *</Label>
              <Input
                id="paypal-client-id"
                value={config.paypal.clientId}
                onChange={(e) => updateConfig("paypal", "clientId", e.target.value)}
                placeholder="AYjcyDDkBKSM..."
              />
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Client Secret (Secreto):</strong> {config.paypal.hasClientSecret ? "✅ Configurado en secretos" : "❌ No configurado"}
                <br />
                ¿No sabes cómo obtener tus credenciales de PayPal?{" "}
                <a
                  href="/ayuda/configurar-pagos?provider=paypal"
                  className="text-primary hover:underline font-medium"
                  target="_blank"
                >
                  Ver guía paso a paso →
                </a>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Stripe */}
      <Card className={!restrictions.canUseStripe ? "opacity-50" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              <CardTitle>Stripe</CardTitle>
              {!restrictions.canUseStripe && (
                <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                  <Crown className="w-3 h-3 mr-1" />
                  Basic
                </Badge>
              )}
              <Badge variant={config.stripe.enabled ? "default" : "secondary"}>
                {config.stripe.enabled ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <Switch
              checked={config.stripe.enabled}
              onCheckedChange={(checked) => updateConfig("stripe", "enabled", checked)}
              disabled={!restrictions.canUseStripe}
            />
          </div>
          <CardDescription>
            Acepta pagos con tarjetas de crédito/débito globalmente
            {!restrictions.canUseStripe && (
              <div className="text-orange-600 font-medium mt-1">
                Disponible en el Plan Basic ($299 MXN/mes)
              </div>
            )}
          </CardDescription>
        </CardHeader>
        {config.stripe.enabled && (
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="stripe-public-key">Publishable Key *</Label>
              <Input
                id="stripe-public-key"
                value={config.stripe.publicKey}
                onChange={(e) => updateConfig("stripe", "publicKey", e.target.value)}
                placeholder="pk_live_..."
              />
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Secret Key (Secreto):</strong> {config.stripe.hasSecretKey ? "✅ Configurado en secretos" : "❌ No configurado"}
                <br />
                ¿No sabes cómo obtener tus credenciales de Stripe?{" "}
                <a
                  href="/ayuda/configurar-pagos?provider=stripe"
                  className="text-primary hover:underline font-medium"
                  target="_blank"
                >
                  Ver guía paso a paso →
                </a>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-[30px]"
      >
        <Settings className="w-4 h-4 mr-2" />
        {loading ? "Guardando..." : "Guardar configuración de pago"}
      </Button>
    </div>
  );
};