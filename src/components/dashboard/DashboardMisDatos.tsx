import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { User, Lock, Mail, Bell, Crown, Zap, CheckCircle2 } from "lucide-react";
import { useTenantContext } from "@/contexts/TenantContext";
import { usePlanRestrictions } from "@/hooks/usePlanRestrictions";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { EmailPreviewCliente } from "@/components/admin/EmailPreviewCliente";
import { EmailEditor } from "./EmailEditor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const DashboardMisDatos = () => {
  const { user } = useAuth();
  const { currentTenantId, isSuperAdmin } = useTenantContext();
  const { plan, restrictions } = usePlanRestrictions();
  const { templates, isLoading: isLoadingTemplates } = useSystemSettings();
  const { settings: tenantSettings, isLoading: isLoadingTenantSettings, updateSettings } = useTenantSettings();
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: ""
  });

  // Email change states
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [codeExpiresAt, setCodeExpiresAt] = useState<Date | null>(null);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState<'input' | 'verify' | 'success'>('input');


  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.new !== passwords.confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (passwords.new.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) throw error;

      toast.success("Contraseña actualizada correctamente");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar la contraseña");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendVerificationCode = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error("Por favor ingresa un correo válido");
      return;
    }

    if (newEmail === user?.email) {
      toast.error("El nuevo correo es igual al actual");
      return;
    }

    setIsChangingEmail(true);

    try {
      const response = await supabase.functions.invoke('send-verification-code', {
        body: { email: newEmail }
      });

      if (response.error) throw response.error;

      const expiresAt = new Date(response.data.expiresAt);
      setCodeExpiresAt(expiresAt);
      setCodeSent(true);
      setEmailChangeStep('verify');
      toast.success(`Código enviado a ${newEmail}`);
    } catch (error: any) {
      toast.error(error.message || "Error al enviar el código");
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleVerifyAndChangeEmail = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Por favor ingresa el código de 6 dígitos");
      return;
    }

    setIsChangingEmail(true);

    try {
      // Verify code
      const verifyResponse = await supabase.functions.invoke('verify-code', {
        body: { 
          email: newEmail,
          code: verificationCode 
        }
      });

      if (verifyResponse.error) throw verifyResponse.error;

      // Update email in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (updateError) throw updateError;

      setEmailChangeStep('success');
      toast.success("¡Email actualizado exitosamente!");
    } catch (error: any) {
      toast.error(error.message || "Error al verificar el código");
    } finally {
      setIsChangingEmail(false);
    }
  };

  const resetEmailChangeModal = () => {
    setShowEmailChangeModal(false);
    setNewEmail("");
    setVerificationCode("");
    setCodeSent(false);
    setCodeExpiresAt(null);
    setEmailChangeStep('input');
  };


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Mis Datos</h2>
        <p className="text-muted-foreground">
          Gestiona tu información personal y configuración de cuenta
        </p>
      </div>

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Información de la Cuenta
          </CardTitle>
          <CardDescription>
            Información básica de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowEmailChangeModal(true)}
                className="h-auto p-0 text-xs"
              >
                Cambiar correo electrónico
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="created">Fecha de Registro</Label>
              <Input
                id="created"
                value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ""}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Cambiar Contraseña
          </CardTitle>
          <CardDescription>
            Actualiza tu contraseña para mantener tu cuenta segura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <Input
                id="new-password"
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                placeholder="Confirma tu nueva contraseña"
                required
              />
            </div>

            <Button 
              type="submit" 
              disabled={isChangingPassword || !passwords.new || !passwords.confirm}
              className="w-full md:w-auto"
            >
              {isChangingPassword ? "Actualizando..." : "Cambiar Contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Notifications and Templates Section */}
      <Card className="relative">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificaciones y Templates
            {plan === 'free' && (
              <img src="/assets/mascot-toogo.png" alt="Toogo Mascot" className="w-4 h-4" />
            )}
          </CardTitle>
          <CardDescription>
            Personaliza los emails que reciben tus clientes
            {plan === 'free' && (
              <span className="text-amber-600 font-medium"> (Requiere Plan Basic)</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Restriction Overlay for Free Users */}
          {plan === 'free' && !isSuperAdmin && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
              <div className="text-center p-6 space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary rounded-full flex items-center justify-center">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Upgrade a Plan Basic</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Personaliza los emails de tus clientes con tu logo, colores y mensajes únicos
                  </p>
                </div>
                <Button className="bg-primary text-white hover:bg-primary/90 rounded-[15px]">
                  <img src="/assets/mascot-toogo.png" alt="Toogo Mascot" className="w-4 h-4 mr-2" />
                      Actualizar Plan Basic
                    </Button>
              </div>
            </div>
          )}

          {/* Email Editor for Pro Users */}
          {(plan === 'basic' || isSuperAdmin) ? (
            <EmailEditor mode="tenant" />
          ) : (
            /* Basic Email Preview for Free Users */
            <div className="space-y-4">
              <h4 className="text-lg font-medium">Preview de Email a Cliente</h4>
              
              {isLoadingTemplates || isLoadingTenantSettings ? (
                <div className="flex items-center justify-center h-48 bg-muted/50 rounded-lg">
                  <div className="text-muted-foreground">Cargando preview...</div>
                </div>
              ) : (
                <EmailPreviewCliente 
                  template={templates?.email_template_customer || {
                    subject: 'Tu pedido ha sido recibido - Orden #{numero_orden}',
                    greeting: 'Hola {nombre_cliente}, ¡Gracias por tu compra!',
                    mainMessage: 'Hemos recibido tu pedido correctamente y lo estamos procesando. Te notificaremos cuando esté listo para envío.\n\nSi tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.\n\n¡Gracias por confiar en {nombre_tienda}!',
                    footerMessage: 'Saludos cordiales,\nEl equipo de {nombre_tienda}'
                  }}
                  tenantLogo={tenantSettings?.logo_url || ""}
                  storeName="Mi Tienda"
                  primaryColor={tenantSettings?.primary_color || "#000000"}
                  secondaryColor={tenantSettings?.secondary_color || "#ffffff"}
                />
              )}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Email Change Modal */}
      <Dialog open={showEmailChangeModal} onOpenChange={(open) => {
        if (!open) resetEmailChangeModal();
        setShowEmailChangeModal(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Cambiar Correo Electrónico
            </DialogTitle>
            <DialogDescription>
              {emailChangeStep === 'input' && "Ingresa tu nuevo correo electrónico"}
              {emailChangeStep === 'verify' && "Verifica el código enviado a tu nuevo correo"}
              {emailChangeStep === 'success' && "¡Correo actualizado exitosamente!"}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Input new email */}
          {emailChangeStep === 'input' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Correo Actual</Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-email">Nuevo Correo Electrónico</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nuevo@ejemplo.com"
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={resetEmailChangeModal}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSendVerificationCode}
                  disabled={isChangingEmail || !newEmail}
                >
                  {isChangingEmail ? "Enviando..." : "Enviar Código"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 2: Verify code */}
          {emailChangeStep === 'verify' && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Código enviado a:</p>
                <p className="text-sm text-muted-foreground">{newEmail}</p>
                {codeExpiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Expira: {codeExpiresAt.toLocaleTimeString()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification-code">Código de Verificación (6 dígitos)</Label>
                <Input
                  id="verification-code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                />
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={handleSendVerificationCode}
                  disabled={isChangingEmail}
                  className="w-full sm:w-auto"
                >
                  Reenviar Código
                </Button>
                <Button
                  onClick={handleVerifyAndChangeEmail}
                  disabled={isChangingEmail || verificationCode.length !== 6}
                  className="w-full sm:w-auto"
                >
                  {isChangingEmail ? "Verificando..." : "Verificar y Cambiar"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 3: Success */}
          {emailChangeStep === 'success' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">¡Email Actualizado!</h3>
                  <p className="text-sm text-muted-foreground">
                    Tu correo ha sido cambiado a:
                  </p>
                  <p className="text-sm font-medium">{newEmail}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg space-y-2">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    📧 Supabase te enviará un email de confirmación.
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Por favor revisa tu bandeja de entrada y confirma tu nuevo correo.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={resetEmailChangeModal}
                  className="w-full"
                >
                  Entendido
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};