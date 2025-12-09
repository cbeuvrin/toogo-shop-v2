import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import PasswordReset from "@/components/PasswordReset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Eye, EyeOff } from "lucide-react";
import { useTenantByDomain } from "@/hooks/useTenantByDomain";
import { usePlatformFacebookPixel } from "@/hooks/usePlatformFacebookPixel";

// Función helper para traducir errores de autenticación
const getAuthErrorMessage = (error: any): string => {
  const errorMessage = error?.message || "";
  
  // Mapear errores comunes de Supabase a mensajes amigables en español
  switch (errorMessage) {
    case "Invalid login credentials":
      return "Usuario y contraseña incorrectos";
    case "Email not confirmed":
      return "Por favor confirma tu email antes de iniciar sesión";
    case "Too many requests":
      return "Demasiados intentos, intenta más tarde";
    case "User not found":
      return "Usuario no encontrado";
    case "Signup not allowed for this instance":
      return "El registro no está permitido";
    case "Password should be at least 6 characters":
      return "La contraseña debe tener al menos 6 caracteres";
    case "Unable to validate email address: invalid format":
      return "Formato de correo electrónico inválido";
    default:
      // Para errores no conocidos, mostrar mensaje genérico
      if (errorMessage.includes("Invalid") || errorMessage.includes("credentials")) {
        return "Usuario y contraseña incorrectos";
      }
      if (errorMessage.includes("email")) {
        return "Error con el correo electrónico";
      }
      return "Error al iniciar sesión, verifica tus datos";
  }
};

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { tenant } = useTenantByDomain();
  const { trackPageView, trackLead } = usePlatformFacebookPixel();

  useEffect(() => {
    trackPageView('/auth', 'TOOGO - Login');
  }, []);

  // Check if this is a password reset redirect or unauthorized access
  useEffect(() => {
    const isReset = searchParams.get('reset') === 'true';
    const hasTokens = searchParams.get('access_token') && searchParams.get('refresh_token');
    const reason = searchParams.get('reason');
    
    if (isReset && hasTokens) {
      // This is a password reset, show the password reset component
      return;
    }

    if (reason === 'unauthorized') {
      toast({
        title: "Sesión requerida",
        description: "Necesitas iniciar sesión para acceder",
      });
      // Clear the reason param from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('reason');
      navigate({ search: newSearchParams.toString() }, { replace: true });
    }
  }, [searchParams, toast, navigate]);

  // If this is a password reset flow, render the password reset component
  if (searchParams.get('reset') === 'true' && searchParams.get('access_token')) {
    return <PasswordReset />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Error",
          description: getAuthErrorMessage(error),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Verificar permisos del usuario
      let userRole = null;
      if (data.user) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role, tenant_id')
          .eq('user_id', data.user.id)
          .limit(1)
          .maybeSingle();

        if (roleError) {
          console.error('Error checking user role:', roleError);
          await supabase.auth.signOut();
          setEmail("");
          setPassword("");
          toast({
            title: "Error",
            description: "Error al verificar permisos de usuario",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (!roleData) {
          // Usuario sin rol asignado
          await supabase.auth.signOut();
          setEmail("");
          setPassword("");
          toast({
            title: "Error",
            description: "No tienes permisos para acceder al sistema",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        userRole = roleData;

        // Si hay tenant específico, verificar permisos para ese tenant
        if (tenant && roleData.role !== 'superadmin' && roleData.tenant_id !== tenant.id) {
          await supabase.auth.signOut();
          setEmail("");
          setPassword("");
          toast({
            title: "Error",
            description: "No tienes permisos para esta tienda",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      toast({
        title: "Éxito",
        description: "Has iniciado sesión correctamente",
      });
      
      // Smart routing: prioritize return URL, then check PWA source
      const urlParams = new URLSearchParams(window.location.search);
      const returnTo = urlParams.get('return');
      const fromPWA = urlParams.get('source') === 'pwa' || sessionStorage.getItem('fromPWA') === '1';
      const isSuperAdmin = userRole?.role === 'superadmin';
      
      // Clear PWA flag
      sessionStorage.removeItem('fromPWA');
      
      // Navigate based on priority: return URL > PWA source > default
      if (returnTo && isSuperAdmin) {
        navigate(returnTo);
      } else if (fromPWA && isSuperAdmin) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Error",
        description: "Por favor ingresa tu correo electrónico",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        toast({
          title: "Error",
          description: getAuthErrorMessage(error),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Correo enviado",
          description: "Revisa tu correo para restablecer tu contraseña",
        });
        setShowForgotPassword(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al enviar el correo de recuperación",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Toogo</h1>
            <p className="text-muted-foreground">Recupera tu contraseña</p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowForgotPassword(false)}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <CardTitle>Recuperar contraseña</CardTitle>
                  <CardDescription>
                    Te enviaremos un enlace para restablecer tu contraseña
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Correo electrónico</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Ingresa tu correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={resetLoading}>
                  {resetLoading ? (
                    <>
                      <Mail className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar enlace de recuperación"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Toogo</h1>
          <p className="text-muted-foreground">Accede al perfil de tu tienda</p>
        </div>

        <Card className="rounded-[30px]">
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>
              Ingresa con tu cuenta para acceder al panel de administración
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-4">
            <div className="border-t border-border/70"></div>
          </div>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ingresa tu correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Button type="submit" className="w-full rounded-[30px]" disabled={loading}>
                {loading ? "Iniciando sesión..." : "Iniciar sesión"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                ¿No tienes una cuenta?{" "}
                <Link to="/" className="text-primary hover:underline">
                  Crear tienda gratis
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;