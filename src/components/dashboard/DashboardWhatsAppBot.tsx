import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { useWhatsAppBotNumber } from "@/hooks/useWhatsAppBotNumber";
import { toast } from "sonner";
import { MessageSquare, Phone, CheckCircle2, XCircle, Loader2, ExternalLink, ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { countries } from "@/data/countries";

interface WhatsAppUser {
  id: string;
  phone_number: string;
  is_active: boolean;
  is_verified?: boolean;
  notify_on_new_order?: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  customer_phone: string;
  last_message_at: string;
  status: string;
  message_count: number;
}

export const DashboardWhatsAppBot = () => {
  const { currentTenantId } = useTenantContext();
  const { data: botConfig, isLoading: loadingBotConfig } = useWhatsAppBotNumber();
  const [countryCode, setCountryCode] = useState("MX");
  const [localNumber, setLocalNumber] = useState("");
  const [whatsappUser, setWhatsappUser] = useState<WhatsAppUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Verification dialog state
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Get full phone number with prefix
  const getFullPhoneNumber = () => {
    const country = countries.find(c => c.code === countryCode);
    if (!country || !localNumber.trim()) return "";
    const cleanNumber = localNumber.replace(/\D/g, "");
    return `${country.phonePrefix}${cleanNumber}`;
  };

  // Parse existing phone number to extract country and local number
  const parsePhoneNumber = (fullNumber: string) => {
    if (!fullNumber) return;

    // Try to match with known country prefixes
    for (const country of countries) {
      if (fullNumber.startsWith(country.phonePrefix)) {
        setCountryCode(country.code);
        setLocalNumber(fullNumber.slice(country.phonePrefix.length));
        return;
      }
    }
    // Default to Mexico if no match
    setLocalNumber(fullNumber.replace(/^\+/, ""));
  };

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (currentTenantId) {
      loadWhatsAppConfig();
      loadConversations();
    }
  }, [currentTenantId]);

  const loadWhatsAppConfig = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("whatsapp_users")
        .select("*")
        .eq("tenant_id", currentTenantId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setWhatsappUser(data as WhatsAppUser);
        parsePhoneNumber(data.phone_number);
      }
    } catch (error: any) {
      console.error("Error loading WhatsApp config:", error);
      toast.error("Error al cargar la configuración de WhatsApp");
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const { data: whatsappUserData } = await supabase
        .from("whatsapp_users")
        .select("id")
        .eq("tenant_id", currentTenantId)
        .maybeSingle();

      if (!whatsappUserData) return;

      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select(`
          id,
          customer_phone,
          last_message_at,
          status,
          whatsapp_messages(count)
        `)
        .eq("tenant_id", currentTenantId)
        .order("last_message_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedConversations = (data || []).map((conv: any) => ({
        id: conv.id,
        customer_phone: conv.customer_phone,
        last_message_at: conv.last_message_at,
        status: conv.status,
        message_count: conv.whatsapp_messages?.[0]?.count || 0,
      }));

      setConversations(formattedConversations);
    } catch (error: any) {
      console.error("Error loading conversations:", error);
    }
  };

  const sendVerificationCode = async (phoneNumber: string) => {
    try {
      setIsSendingCode(true);

      const { data, error } = await supabase.functions.invoke('whatsapp-send-verification', {
        body: { phoneNumber, tenantId: currentTenantId }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("Código enviado a tu WhatsApp");
      setResendCooldown(60);
      return true;
    } catch (error: any) {
      console.error("Error sending verification code:", error);
      toast.error(error.message || "Error al enviar el código de verificación");
      return false;
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleRegisterPhone = async () => {
    const fullPhone = getFullPhoneNumber();

    if (!fullPhone || localNumber.trim().length < 8) {
      toast.error("Ingresa un número de WhatsApp válido (mínimo 8 dígitos)");
      return;
    }

    if (!currentTenantId) {
      toast.error("No se pudo identificar la tienda");
      return;
    }

    try {
      setIsSaving(true);

      if (whatsappUser) {
        // Update existing
        const { error } = await supabase
          .from("whatsapp_users")
          .update({
            phone_number: fullPhone,
            is_active: true,
            is_verified: false,
          })
          .eq("id", whatsappUser.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("whatsapp_users")
          .insert({
            tenant_id: currentTenantId,
            phone_number: fullPhone,
            is_active: true,
            is_verified: false,
          });

        if (error) throw error;
      }

      await loadWhatsAppConfig();

      // Send verification code and show dialog
      const sent = await sendVerificationCode(fullPhone);
      if (sent) {
        setShowVerificationDialog(true);
        setVerificationCode("");
      }

    } catch (error: any) {
      console.error("Error registering phone:", error);
      toast.error("Error al registrar el número de WhatsApp");
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Ingresa el código de 6 dígitos");
      return;
    }

    try {
      setIsVerifying(true);

      const { data, error } = await supabase.functions.invoke('whatsapp-verify-code', {
        body: {
          phoneNumber: whatsappUser?.phone_number,
          tenantId: currentTenantId,
          code: verificationCode
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success("¡Número verificado exitosamente!");
      setShowVerificationDialog(false);
      setVerificationCode("");
      await loadWhatsAppConfig();

    } catch (error: any) {
      console.error("Error verifying code:", error);
      toast.error(error.message || "Error al verificar el código");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !whatsappUser?.phone_number) return;
    await sendVerificationCode(whatsappUser.phone_number);
  };

  const toggleActive = async () => {
    if (!whatsappUser) return;

    try {
      const { error } = await supabase
        .from("whatsapp_users")
        .update({ is_active: !whatsappUser.is_active })
        .eq("id", whatsappUser.id);

      if (error) throw error;

      toast.success(
        whatsappUser.is_active
          ? "Bot desactivado"
          : "Bot activado"
      );
      await loadWhatsAppConfig();
    } catch (error: any) {
      console.error("Error toggling active:", error);
      toast.error("Error al cambiar el estado del bot");
    }
  };

  const toggleNotifications = async () => {
    if (!whatsappUser) return;

    try {
      const { error } = await supabase
        .from("whatsapp_users")
        .update({ notify_on_new_order: !whatsappUser.notify_on_new_order })
        .eq("id", whatsappUser.id);

      if (error) throw error;

      toast.success(
        !whatsappUser.notify_on_new_order
          ? "Notificaciones activadas"
          : "Notificaciones desactivadas"
      );
      await loadWhatsAppConfig();
    } catch (error: any) {
      console.error("Error toggling notifications:", error);
      toast.error("Error al configurar notificaciones");
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "hace un momento";
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    return `hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
  };

  const handleOpenWhatsApp = () => {
    if (!botConfig?.phone) {
      toast.error("No se ha configurado el número del bot");
      return;
    }
    const cleanPhone = botConfig.phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hola! Soy ${whatsappUser?.phone_number || "un vendedor"} y quiero gestionar mi tienda.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  if (isLoading || loadingBotConfig) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Verifica tu número de WhatsApp
            </DialogTitle>
            <DialogDescription>
              Te enviamos un código de 6 dígitos al número {whatsappUser?.phone_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={setVerificationCode}
                disabled={isVerifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleVerifyCode}
                className="w-full"
                disabled={verificationCode.length !== 6 || isVerifying}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Verificar"
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || isSendingCode}
              >
                {isSendingCode ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : resendCooldown > 0 ? (
                  `Reenviar código (${resendCooldown}s)`
                ) : (
                  "Reenviar código"
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              El código expira en 10 minutos
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {botConfig && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Escríbele al Asistente de tu Tienda
            </CardTitle>
            <CardDescription>
              Envía mensajes desde tu WhatsApp registrado para gestionar tu tienda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-background border">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">WhatsApp del Bot</p>
                <p className="text-2xl font-bold text-primary">{botConfig.phone}</p>
                <p className="text-xs text-muted-foreground">{botConfig.display_name}</p>
              </div>
              <Button
                onClick={handleOpenWhatsApp}
                size="lg"
                className="w-full sm:w-auto"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir WhatsApp
              </Button>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-lg">⚠️</span>
              <div className="space-y-1">
                <p className="text-sm font-medium">Importante</p>
                <p className="text-xs text-muted-foreground">
                  Debes escribir desde el número de WhatsApp que registraste abajo.
                  El bot solo responderá a números registrados.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Administra tu tienda por WhatsApp
          </CardTitle>
          <CardDescription>
            Conecta tu número de WhatsApp personal y gestiona tu tienda usando un asistente con IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Tu número de WhatsApp personal
              </Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode} disabled={isSaving}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.phonePrefix} {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="whatsapp-phone"
                  type="tel"
                  placeholder="5543830150"
                  value={localNumber}
                  onChange={(e) => setLocalNumber(e.target.value.replace(/\D/g, ""))}
                  disabled={isSaving}
                  className="flex-1"
                />
                <Button
                  onClick={handleRegisterPhone}
                  disabled={isSaving || localNumber.trim().length < 8}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : whatsappUser ? (
                    "Actualizar"
                  ) : (
                    "Registrar"
                  )}
                </Button>
              </div>
              {localNumber && (
                <p className="text-xs text-muted-foreground">
                  Se guardará como: <span className="font-mono font-medium">{getFullPhoneNumber()}</span>
                </p>
              )}
            </div>

            {whatsappUser && (
              <div className="space-y-3">
                {/* Verification Status */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Verificación:</span>
                    {whatsappUser.is_verified ? (
                      <Badge variant="default" className="gap-1 bg-green-600">
                        <ShieldCheck className="h-3 w-3" />
                        Verificado
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        Sin verificar
                      </Badge>
                    )}
                  </div>
                  {!whatsappUser.is_verified && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        sendVerificationCode(whatsappUser.phone_number).then(sent => {
                          if (sent) {
                            setShowVerificationDialog(true);
                            setVerificationCode("");
                          }
                        });
                      }}
                      disabled={isSendingCode}
                    >
                      {isSendingCode ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Verificar ahora"
                      )}
                    </Button>
                  )}
                </div>

                {/* Bot Status */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Estado del Bot:</span>
                    {whatsappUser.is_active ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Inactivo
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleActive}
                  >
                    {whatsappUser.is_active ? "Desactivar" : "Activar"}
                  </Button>
                </div>

                {/* Notifications Config */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-purple-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Notificar nuevos pedidos:</span>
                    {whatsappUser.notify_on_new_order ? (
                      <Badge variant="default" className="gap-1 bg-purple-600 hover:bg-purple-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Activado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Desactivado
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleNotifications}
                  >
                    {whatsappUser.notify_on_new_order ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">🤖 Cómo funciona:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                Registra tu número de WhatsApp personal en este panel
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                Verifica tu número con el código que te enviamos por WhatsApp
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                Escribe mensajes al bot desde WhatsApp para gestionar tu tienda
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">4.</span>
                Consulta estadísticas, actualiza productos, crea productos con fotos, gestiona pedidos y más
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">5.</span>
                Si envías audio, el bot también te responde con audio
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50/50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            Guía de Comandos Rápidos
          </CardTitle>
          <CardDescription>
            Copia y pega estos ejemplos para hablar con tu asistente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 p-4 bg-white rounded-lg border shadow-sm">
              <h4 className="font-semibold flex items-center gap-2 text-sm text-blue-600">
                <span className="text-lg">📊</span> Consultas y Reportes
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                  "¿Cuánto vendí hoy?"
                </li>
                <li className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                  "Dame un resumen de esta semana"
                </li>
                <li className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                  "¿Cuáles son mis productos más vendidos?"
                </li>
              </ul>
            </div>

            <div className="space-y-3 p-4 bg-white rounded-lg border shadow-sm">
              <h4 className="font-semibold flex items-center gap-2 text-sm text-purple-600">
                <span className="text-lg">🛍️</span> Gestión de Productos
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                  "Crear producto: Tenis Nike Air $2500"
                </li>
                <li className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                  "Cambiar precio de Tenis Nike Air a $2300"
                </li>
                <li className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                  "Desactivar producto: Tenis Nike Air"
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💬 Historial de Conversaciones</CardTitle>
          <CardDescription>
            Tus conversaciones recientes con el asistente de IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay conversaciones aún</p>
              <p className="text-sm mt-1">Envía un mensaje al bot desde WhatsApp para empezar</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{conv.customer_phone}</p>
                        <p className="text-xs text-muted-foreground">
                          {conv.message_count} mensaje{conv.message_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {conv.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(conv.last_message_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div >
  );
};
