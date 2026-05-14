import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, MessageCircle, DollarSign, Settings, Shield, AlertTriangle, Crown, AlertCircle, Link2, Unlink, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useTenantContext } from "@/contexts/TenantContext";
import { usePlanRestrictions } from "@/hooks/usePlanRestrictions";

interface PaymentConfig {
  mercadopago: {
    enabled: boolean;
    publicKey: string;
    accessToken: string;
    hasAccessToken: boolean;
  };
  paypal: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    hasClientSecret: boolean;
  };
  stripe: {
    enabled: boolean;
    publicKey: string;
    secretKey: string;
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
      accessToken: "",
      hasAccessToken: false
    },
    paypal: {
      enabled: false,
      clientId: "",
      clientSecret: "",
      hasClientSecret: false
    },
    stripe: {
      enabled: false,
      publicKey: "",
      secretKey: "",
      hasSecretKey: false
    },
    whatsapp: {
      enabled: false,
      number: "",
      message: "Hola! Me interesa este producto: {product_name}. Precio: {price}. Mi información de contacto: {customer_name} - {customer_phone}"
    }
  });
  const [loading, setLoading] = useState(false);
  // Estado de integración OAuth (nueva forma) con MercadoPago
  const [mpIntegration, setMpIntegration] = useState<{
    status: string;
    provider_user_email: string | null;
    connected_at: string | null;
    is_legacy: boolean;
  } | null>(null);
  const [mpConnecting, setMpConnecting] = useState(false);

  useEffect(() => {
    if (!tenantLoading && tenantId) {
      loadPaymentConfig();
      loadMpIntegration();
    }
  }, [tenantId, tenantLoading]);

  const loadMpIntegration = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("tenant_payment_integrations")
      .select("status, provider_user_email, connected_at, metadata")
      .eq("tenant_id", tenantId)
      .eq("provider", "mercadopago")
      .maybeSingle();

    if (data) {
      setMpIntegration({
        status: data.status,
        provider_user_email: data.provider_user_email,
        connected_at: data.connected_at,
        is_legacy: false,
      });
    } else {
      // Si hay access_token en tenant_secrets pero no en payment_integrations → es legacy
      const { data: legacyCheck } = await supabase
        .from('tenant_payment_secrets' as any)
        .select('mercadopago_access_token')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if ((legacyCheck as any)?.mercadopago_access_token) {
        setMpIntegration({ status: "legacy", provider_user_email: null, connected_at: null, is_legacy: true });
      }
    }
  };

  const handleConnectMercadoPago = async () => {
    if (!tenantId) return;
    setMpConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("mercadopago-oauth-start", {
        body: { tenantId },
      });
      if (error) throw new Error(error.message);
      if (!data?.auth_url) throw new Error("No se recibió la URL de autorización");
      window.location.href = data.auth_url;
    } catch (err: any) {
      toast({
        title: "Error",
        description: `No pudimos iniciar la conexión: ${err.message}`,
        variant: "destructive",
      });
      setMpConnecting(false);
    }
  };

  const handleDisconnectMercadoPago = async () => {
    if (!tenantId) return;
    if (!confirm("¿Seguro que quieres desconectar MercadoPago? Tus clientes no podrán pagar con MP hasta que reconectes.")) return;
    const { error } = await supabase
      .from("tenant_payment_integrations")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("provider", "mercadopago");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "MercadoPago desconectado", description: "Reconecta cuando quieras." });
    loadMpIntegration();
  };

  // Detectar regreso del flujo OAuth: ?mp_connected=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mp_connected") === "1") {
      toast({ title: "¡MercadoPago conectado!", description: "Ya puedes recibir pagos en tu tienda." });
      params.delete("mp_connected");
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
      window.history.replaceState({}, "", newUrl);
      loadMpIntegration();
    }
  }, []);

  const loadPaymentConfig = async () => {
    if (!user || !tenantId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .rpc('get_tenant_payment_display_config', { p_tenant_id: tenantId });

      if (error) throw error;

      const settings = data as unknown as PaymentDisplaySettings;

      // Check existence of SECRET credentials (in safe separate table)
      const { data: secretDataRow } = await supabase
        .from('tenant_payment_secrets' as any)
        .select('mercadopago_access_token, paypal_client_secret, stripe_secret_key')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      const secretData = secretDataRow as any;

      const hasMpSecret = !!secretData?.mercadopago_access_token;
      const hasPaypalSecret = !!secretData?.paypal_client_secret;
      const hasStripeSecret = !!secretData?.stripe_secret_key;

      if (settings) {
        console.log('Received payment config');
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
            accessToken: '',
            hasAccessToken: hasMpSecret
          },
          paypal: {
            enabled: !!settings.paypal_client_id,
            clientId: settings.paypal_client_id || '',
            clientSecret: '',
            hasClientSecret: hasPaypalSecret
          },
          stripe: {
            enabled: false,
            publicKey: '',
            secretKey: '',
            hasSecretKey: hasStripeSecret
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

      // 1. Update PUBLIC settings in tenant_settings
      const { error: settingsError } = await supabase
        .from('tenant_settings')
        .update({
          mercadopago_public_key: config.mercadopago.publicKey || null,
          paypal_client_id: config.paypal.clientId || null,
          whatsapp_number: config.whatsapp.number || null,
          whatsapp_message: config.whatsapp.message || null,
        })
        .eq('tenant_id', tenantId);

      if (settingsError) throw settingsError;

      // 2. Update SECRET settings in tenant_payment_secrets (if provided)
      if (config.mercadopago.accessToken || config.paypal.clientSecret || config.stripe.secretKey) {

        const secretPayload: any = {
          tenant_id: tenantId,
          updated_at: new Date().toISOString()
        };

        if (config.mercadopago.accessToken) secretPayload.mercadopago_access_token = config.mercadopago.accessToken;
        if (config.paypal.clientSecret) secretPayload.paypal_client_secret = config.paypal.clientSecret;
        if (config.stripe.secretKey) secretPayload.stripe_secret_key = config.stripe.secretKey;

        const { error: secretError } = await supabase
          .from('tenant_payment_secrets' as any)
          .upsert(secretPayload, { onConflict: 'tenant_id' });

        if (secretError) {
          console.error('Error saving secrets:', secretError);
          throw new Error("Error guardando credenciales secretas: " + secretError.message);
        }
      }

      toast({
        title: "Configuración guardada",
        description: "Tus métodos de pago se han actualizado correctamente.",
      });

      // Clear secret fields from state
      setConfig(prev => ({
        ...prev,
        mercadopago: { ...prev.mercadopago, accessToken: '', hasAccessToken: prev.mercadopago.hasAccessToken || !!config.mercadopago.accessToken },
        paypal: { ...prev.paypal, clientSecret: '', hasClientSecret: prev.paypal.hasClientSecret || !!config.paypal.clientSecret },
        stripe: { ...prev.stripe, secretKey: '', hasSecretKey: prev.stripe.hasSecretKey || !!config.stripe.secretKey }
      }));

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

      {/* Banner informativo de comisión para plan free */}
      {plan === 'free' && (
        <Alert className="bg-purple-50 border-purple-200">
          <DollarSign className="h-5 w-5 text-purple-600" />
          <AlertDescription className="text-sm">
            <strong className="text-purple-900">Plan Free — 1% de comisión por venta procesada en plataforma.</strong>
            <br />
            Conecta tu pasarela y empieza a vender. Por cada venta procesada en la tienda
            web (no aplica a ventas por WhatsApp), Toogo retiene automáticamente el 1%.
            El 99% restante se deposita directo en tu cuenta. Si más adelante quieres pasar
            al plan Basic, eliminamos la comisión.
          </AlertDescription>
        </Alert>
      )}

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

      {/* Mercado Pago — Conexión OAuth tipo "marketplace" */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <CardTitle>Mercado Pago</CardTitle>
              {mpIntegration?.status === "active" && (
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Conectado
                </Badge>
              )}
              {mpIntegration?.status === "legacy" && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                  <AlertCircle className="w-3 h-3 mr-1" /> Método antiguo
                </Badge>
              )}
              {!mpIntegration && (
                <Badge variant="secondary">Sin conectar</Badge>
              )}
            </div>
          </div>
          <CardDescription>
            Acepta pagos con tarjetas de crédito/débito y otros métodos populares en LATAM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Caso 1: NO conectado → mostrar botón conectar */}
          {!mpIntegration && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Conecta tu cuenta de MercadoPago con un solo click. No tienes que copiar ni pegar claves —
                Mercado Pago te va a pedir solo autorizar la conexión.
              </p>
              <Button
                onClick={handleConnectMercadoPago}
                disabled={mpConnecting}
                className="bg-[#009ee3] hover:bg-[#007eb5] text-white"
                size="lg"
              >
                {mpConnecting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirigiendo...</>
                ) : (
                  <><Link2 className="w-4 h-4 mr-2" /> Conectar con MercadoPago</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Si aún no tienes cuenta de MercadoPago, podrás crearla durante el proceso.
              </p>
            </div>
          )}

          {/* Caso 2: Conectado vía OAuth */}
          {mpIntegration?.status === "active" && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-green-900">Tu cuenta de MercadoPago está conectada</p>
                  {mpIntegration.provider_user_email && (
                    <p className="text-green-700 text-xs mt-1">Cuenta: <span className="font-mono">{mpIntegration.provider_user_email}</span></p>
                  )}
                  {mpIntegration.connected_at && (
                    <p className="text-green-700 text-xs">
                      Conectado el {new Date(mpIntegration.connected_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={handleDisconnectMercadoPago} size="sm">
                <Unlink className="w-4 h-4 mr-2" /> Desconectar MercadoPago
              </Button>
            </div>
          )}

          {/* Caso 3: Tiene credenciales legacy → forzar reconexión OAuth */}
          {mpIntegration?.status === "legacy" && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-amber-900">Configuración antigua detectada</p>
                  <p className="text-amber-800 text-xs mt-1">
                    Tienes MercadoPago configurado con el método anterior (Access Token manual).
                    Reconecta con el nuevo método de un click para mejor seguridad y experiencia.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleConnectMercadoPago}
                disabled={mpConnecting}
                className="bg-[#009ee3] hover:bg-[#007eb5] text-white"
                size="lg"
              >
                {mpConnecting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirigiendo...</>
                ) : (
                  <><Link2 className="w-4 h-4 mr-2" /> Reconectar con MercadoPago</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
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
            <div>
              <Label htmlFor="paypal-client-secret" className="flex items-center gap-2">
                Client Secret *
                <span className="text-xs text-muted-foreground font-normal">(Requerido para procesar el pago)</span>
              </Label>
              <Input
                id="paypal-client-secret"
                type="password"
                value={config.paypal.clientSecret}
                onChange={(e) => updateConfig("paypal", "clientSecret", e.target.value)}
                placeholder={config.paypal.hasClientSecret ? "•••••••••••••••• (Guardado)" : "Ingresa tu Client Secret"}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tu Secret se guarda de forma segura. Déjalo en blanco si no deseas cambiarlo.
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-md border border-blue-100 text-sm text-blue-800">
              <p className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                ¿No sabes cómo obtener tus credenciales?{" "}
                <a
                  href="/ayuda/configurar-pagos?provider=paypal"
                  className="underline font-semibold hover:text-blue-900"
                  target="_blank"
                >
                  Ver guía
                </a>
              </p>
            </div>
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
            <div>
              <Label htmlFor="stripe-secret-key" className="flex items-center gap-2">
                Secret Key *
                <span className="text-xs text-muted-foreground font-normal">(Requerido)</span>
              </Label>
              <Input
                id="stripe-secret-key"
                type="password"
                value={config.stripe.secretKey}
                onChange={(e) => updateConfig("stripe", "secretKey", e.target.value)}
                placeholder={config.stripe.hasSecretKey ? "•••••••••••••••• (Guardado)" : "sk_live_..."}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tu Secret Key se guarda de forma segura.
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-md border border-blue-100 text-sm text-blue-800">
              <p className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                ¿No sabes cómo obtener tus credenciales? <a href="#" className="underline">Ver guía</a>
              </p>
            </div>
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