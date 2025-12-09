import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Mail, Loader2, ShoppingBag, Globe, ArrowLeft, CreditCard, X, HelpCircle, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { PlanSelector } from "@/components/dashboard/PlanSelector";
import { PurchasePreviewModal } from "@/components/dashboard/PurchasePreviewModal";
import { countries, getCountryByCode, getStatesByCountry } from "@/data/countries";
import { useAuth } from "./AuthProvider";
import { usePlatformFacebookPixel } from "@/hooks/usePlatformFacebookPixel";
interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFlowType?: "subdomain" | "domain";
}
type FlowType = "initial" | "subdomain" | "domain";
interface FormData {
  // Domain/Subdomain
  domain: string;
  subdomain: string;
  // User Data
  email: string;
  phone: string;
  phonePrefix: string;
  country: string;
  state: string;
  // Account Creation
  password: string;
  confirmPassword: string;
  verificationCode: string;
  // Payment selection
  paymentPlan: "monthly" | "annual";
  // Legal acceptance
  acceptedTerms: boolean;
}
export const OnboardingModal = ({
  open,
  onOpenChange,
  initialFlowType
}: OnboardingModalProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const {
    user,
    session,
    loading: authLoading
  } = useAuth();
  
  // Initialize Facebook Pixel tracking
  const { trackCustomEvent, trackInitiateCheckout, trackPurchase, trackCompleteRegistration } = usePlatformFacebookPixel();

  const [flowType, setFlowType] = useState<FlowType>("initial");
  const [selectedOption, setSelectedOption] = useState<"subdomain" | "domain">("subdomain");
  const [currentStep, setCurrentStep] = useState("step1");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [isDomainAvailable, setIsDomainAvailable] = useState<boolean | null>(null);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isProcessingVerification, setIsProcessingVerification] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningProgress, setProvisioningProgress] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    domain: "",
    subdomain: "",
    email: "",
    phone: "",
    phonePrefix: "+52",
    country: "",
    state: "",
    password: "",
    confirmPassword: "",
    verificationCode: "",
    paymentPlan: "monthly",
    acceptedTerms: false
  });
  const [domainName, setDomainName] = useState('');
  const [domainExtension, setDomainExtension] = useState('.com');
  const [extensionPricing, setExtensionPricing] = useState<{
    [key: string]: number;
  }>({});
  const [selectedPlan, setSelectedPlan] = useState<{
    id: string;
    name: string;
    price_mxn: number;
    billing_cycle: 'monthly' | 'annual';
  } | null>(null);
  const [showPurchasePreview, setShowPurchasePreview] = useState(false);
  const [purchaseBreakdown, setPurchaseBreakdown] = useState<any>(null);
  const [domainPrice, setDomainPrice] = useState<{ usd: number; mxn: number } | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [hasOwnDomain, setHasOwnDomain] = useState(false);

  // Function to go back from purchase preview to plan selector
  const handleGoBackToPlanSelector = () => {
    setShowPurchasePreview(false);
    setSelectedPlan(null);
    setPurchaseBreakdown(null);
  };

  // Reset/re-hydrate state when modal opens
  useEffect(() => {
    if (open) {
      console.log('[Onboarding] Modal opened. Attempting to rehydrate state from localStorage');

      // Reset transient flags
      setIsCheckingDomain(false);
      setIsDomainAvailable(null);
      setIsVerificationSent(false);
      setIsVerifying(false);
      setIsVerified(false);
      setIsVerifyingOtp(false);
      setIsPaying(false);
      setIsProvisioning(false);
      setProvisioningProgress(0);
      setIsProcessingVerification(false);

      // Check if user is coming from verification link
      const urlParams = new URLSearchParams(window.location.search);
      const isFromVerification = urlParams.has('verified') && urlParams.has('onboarding');
      try {
        const raw = localStorage.getItem('onboardingState');
        if (raw) {
          const saved = JSON.parse(raw);
          
          // Validar que el país guardado existe en nuestra lista
          if (saved.country && !getCountryByCode(saved.country)) {
            console.warn('⚠️ Invalid country in localStorage, clearing:', saved.country);
            localStorage.removeItem('onboardingState');
            // Resetear a estado inicial
            setFlowType(initialFlowType || 'initial');
            setSelectedOption(initialFlowType || 'subdomain');
            setCurrentStep('step1');
            return;
          }
          
          console.log('[Onboarding] Rehydrated onboardingState:', saved);
          if (saved.flowType === 'subdomain' || saved.flowType === 'domain') {
            setFlowType(saved.flowType);
            setSelectedOption(saved.flowType === 'subdomain' ? 'subdomain' : 'domain');
          } else {
            setFlowType('initial');
            setSelectedOption('subdomain');
          }
          setFormData(prev => ({
            ...prev,
            email: saved.email || prev.email,
            subdomain: saved.subdomain || prev.subdomain,
            domain: saved.domain || prev.domain
          }));

          // If coming from verification link, set processing state
          if (isFromVerification) {
            console.log('[Onboarding] Detected verification redirect, processing...');
            setIsProcessingVerification(true);
            setCompletedSteps(['step1', 'step2', 'step3']);
            setCurrentStep('step4');
            setIsVerificationSent(true);
          } else {
            // Assume steps 1 and 2 completed after signup
            setCompletedSteps(['step1', 'step2']);
            setCurrentStep('step3');
            setIsVerificationSent(true);
          }
        } else {
          // Fresh start - check if initialFlowType is provided
          if (initialFlowType) {
            setFlowType(initialFlowType);
            setSelectedOption(initialFlowType);
          } else {
            setFlowType('initial');
            setSelectedOption('subdomain');
          }
          setCurrentStep('step1');
        }
      } catch (error) {
        console.error('⚠️ Error parsing localStorage:', error);
        localStorage.removeItem('onboardingState');
        setFlowType(initialFlowType || 'initial');
        setSelectedOption(initialFlowType || 'subdomain');
        setCurrentStep('step1');
      }
    } else {
      // Fresh start - check if initialFlowType is provided
      if (initialFlowType) {
        setFlowType(initialFlowType);
        setSelectedOption(initialFlowType);
      } else {
        setFlowType('initial');
        setSelectedOption('subdomain');
      }
      setCurrentStep('step1');
      setCompletedSteps([]);
      setIsVerificationSent(false);
      setIsVerified(false);
      setIsVerifyingOtp(false);
      setIsPaying(false);
      setIsProvisioning(false);
      setProvisioningProgress(0);
      setIsProcessingVerification(false);
    }
  }, [open, initialFlowType]);

  // Robust verification: detect confirmed user regardless of internal step state
  useEffect(() => {
    if (!user || isVerified) return;
    let saved: any = null;
    try {
      const savedRaw = localStorage.getItem('onboardingState');
      saved = savedRaw ? JSON.parse(savedRaw) : null;
    } catch {}
    const savedEmail = saved?.email;
    const targetEmail = (formData.email || savedEmail || '').toLowerCase();
    const userEmail = (user.email || '').toLowerCase();
    console.log('[Onboarding] Auth update:', {
      userEmail,
      confirmed_at: user.email_confirmed_at,
      targetEmail,
      flowType
    });
    if (user.email_confirmed_at && targetEmail && userEmail === targetEmail) {
      // Add delay to ensure verification is processed
      setTimeout(() => {
        setIsVerified(true);
        setIsProcessingVerification(false);

        // Ensure steps 2 and 3 are marked complete
        setCompletedSteps(prev => Array.from(new Set([...prev, 'step2', 'step3'])));
        toast({
          title: "¡Email verificado!",
          description: "Tu cuenta ha sido confirmada correctamente"
        });

        // Advance to next step based on flow
        const flow = saved?.flowType || flowType;
        if (flow === 'subdomain') {
          setCurrentStep('step4');
        } else {
          setCurrentStep('step4'); // Plan selection for domain
        }

        // Cleanup persisted state once handled
        try {
          localStorage.removeItem('onboardingState');
        } catch {}
      }, 1000);
    }
  }, [user, isVerified, formData.email, flowType, toast]);
  const checkDomainAvailability = async (inputValue?: string) => {
    const domainToCheck = inputValue || (flowType === "subdomain" ? formData.subdomain : `${domainName}${domainExtension}`);
    if (!domainToCheck.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Por favor ingresa un ${flowType === "subdomain" ? "subdominio" : "dominio"}`
      });
      return;
    }
    setIsCheckingDomain(true);
    try {
      if (flowType === "subdomain") {
        // Normalize subdomain input
        const normalizedSubdomain = domainToCheck.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
        if (!normalizedSubdomain) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "El subdominio solo puede contener letras, números y guiones"
          });
          return;
        }

        // Update form data with normalized subdomain
        setFormData(prev => ({
          ...prev,
          subdomain: normalizedSubdomain
        }));

        // Check subdomain availability using edge function (works without auth)
        const { data: availabilityData, error } = await supabase.functions.invoke(
          'check-subdomain-availability',
          {
            body: { subdomain: normalizedSubdomain }
          }
        );

        if (error) {
          console.error('Error checking subdomain availability:', error);
          throw error;
        }

        const isAvailable = availabilityData?.available ?? false;
        setIsDomainAvailable(isAvailable);
        if (isAvailable) {
          toast({
            title: "¡Disponible!",
            description: "El subdominio está disponible"
          });
          setCompletedSteps(prev => [...prev, "step1"]);
          setCurrentStep("step2");
        } else {
          toast({
            variant: "destructive",
            title: "No disponible",
            description: "El subdominio ya está en uso"
          });
        }
      } else {
        // Construir dominio completo con extensión seleccionada
        const fullDomain = flowType === "domain" ? `${domainName}${domainExtension}` : domainToCheck;

        // Normalizar dominio
        const normalizedDomain = fullDomain.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/i, '').replace(/^www\./i, '').replace(/\/$/, '').replace(/\s+/g, '').replace(/\.$/, '');

        // Use Openprovider API for domain availability
        const {
          data,
          error
        } = await supabase.functions.invoke('openprovider-domains', {
          body: {
            action: 'check-availability',
            domain: normalizedDomain
          }
        });
        if (error) {
          console.error('Domain availability check error:', error);
          throw error;
        }
        if (data?.status === 'error') {
          console.error('Domain availability response error:', {
            code: data.code,
            message: data.message,
            details: data.details
          });
          toast({
            variant: "destructive",
            title: "Error",
            description: data?.message || "Error al verificar disponibilidad. Intenta de nuevo."
          });
          return;
        }
        const isAvailable = data.available;
        setIsDomainAvailable(isAvailable);
        setFormData(prev => ({
          ...prev,
          domain: fullDomain
        }));
        if (isAvailable) {
          setDomainPrice({
            usd: data.price_usd,
            mxn: data.price_mxn
          });
          toast({
            title: "¡Disponible!",
            description: `${fullDomain} disponible por $${data.price_mxn} MXN/año`
          });
        } else {
          setDomainPrice(null);
          toast({
            variant: "destructive",
            title: "No disponible",
            description: `El dominio ${fullDomain} ya está registrado`
          });
        }
      }
    } catch (error) {
      console.error('Domain check error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as any)?.message || "Error al verificar disponibilidad. Intenta de nuevo."
      });
    } finally {
      setIsCheckingDomain(false);
    }
  };
  const checkEmailAvailability = async (email: string) => {
    if (!email) return;
    setCheckingEmail(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('check-email-exists', {
        body: {
          email
        }
      });
      if (error) {
        console.error('Email check error:', error);
        setEmailAvailable(true); // Assume available on error
        return;
      }
      setEmailAvailable(!data.exists);
    } catch (error) {
      console.error('Email check error:', error);
      setEmailAvailable(true); // Assume available on error
    } finally {
      setCheckingEmail(false);
    }
  };
  const sendVerificationCode = async () => {
    if (!formData.acceptedTerms) {
      toast({
        variant: "destructive",
        title: "Términos requeridos",
        description: "Debes aceptar los Términos y Condiciones para continuar"
      });
      return;
    }
    if (!formData.email || !formData.phone || !formData.country || !formData.state || !formData.password || !formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor completa todos los campos obligatorios"
      });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Las contraseñas no coinciden"
      });
      return;
    }

    // First check if email already exists - but only if we haven't verified it's available yet
    if (emailAvailable === false) {
      toast({
        variant: "destructive",
        title: "Correo ya registrado",
        description: "Este correo ya está registrado. Inicia sesión en su lugar."
      });
      return;
    }
    setIsVerificationSent(true);
    try {
      // Send verification code via Edge Function
      const {
        data,
        error
      } = await supabase.functions.invoke('send-verification-code', {
        body: {
          email: formData.email
        }
      });
      if (error) throw error;

      // Persist onboarding state so we can continue after email verification
      try {
        const stateToSave = {
          email: formData.email,
          phone: formData.phonePrefix + formData.phone,
          country: formData.country,
          state: formData.state,
          password: formData.password,
          flowType,
          subdomain: formData.subdomain,
          domain: formData.domain || (flowType === 'domain' ? `${domainName}${domainExtension}` : ''),
          selectedOption,
          ts: Date.now()
        };
        localStorage.setItem('onboardingState', JSON.stringify(stateToSave));
        console.log('[Onboarding] Saved onboardingState:', stateToSave);
      } catch (e) {
        console.warn('[Onboarding] Failed to save onboardingState', e);
      }
      setCompletedSteps(prev => [...prev, "step2"]);
      setCurrentStep("step3");
      toast({
        title: "Código de verificación enviado",
        description: "Revisa tu correo e ingresa el código de 6 dígitos."
      });
    } catch (error: any) {
      setIsVerificationSent(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al enviar el código. Intenta de nuevo."
      });
    }
  };
  const verifyCode = async () => {
    if (!formData.verificationCode || formData.verificationCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor ingresa un código de 6 dígitos"
      });
      return;
    }
    setIsVerifyingOtp(true);
    try {
      // Verify code via Edge Function
      const {
        data,
        error
      } = await supabase.functions.invoke('verify-code', {
        body: {
          email: formData.email,
          code: formData.verificationCode
        }
      });
      if (error || !data.success) {
        toast({
          variant: "destructive",
          title: "Código incorrecto",
          description: data?.error || "El código de verificación es incorrecto o ha expirado"
        });
        return;
      }

      // Code verified successfully, now create the user account
      const savedState = JSON.parse(localStorage.getItem('onboardingState') || '{}');
      const {
        data: authData,
        error: authError
      } = await supabase.auth.signUp({
        email: formData.email,
        password: savedState.password || formData.password,
        options: {
          emailRedirectTo: null,
          // No additional emails
          data: {
            username: formData.email,
            phone: savedState.phone || formData.phonePrefix + formData.phone,
            country: savedState.country || formData.country,
            state: savedState.state || formData.state
          }
        }
      });
      if (authError) {
        // If user already exists, try to sign in instead
        if (authError.message.includes('already registered')) {
          const {
            error: signInError
          } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: savedState.password || formData.password
          });
          if (signInError) {
            toast({
              variant: "destructive",
              title: "Error al iniciar sesión",
              description: "Por favor revisa tu contraseña"
            });
            return;
          }
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: authError.message
          });
          return;
        }
      } else {
        // Account created successfully, now sign in to establish session
        const {
          error: signInError
        } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: savedState.password || formData.password
        });
        if (signInError) {
          const msg = (signInError.message || '').toLowerCase();
          // Intento de autoconsolidar confirmación si el error indica correo no confirmado
          if (msg.includes('confirm')) {
            try {
              const {
                data: confirmData,
                error: confirmError
              } = await supabase.functions.invoke('admin-confirm-user', {
                body: {
                  email: formData.email
                }
              });
              if (confirmError || !confirmData?.success) {
                throw confirmError || new Error(confirmData?.error || 'No se pudo confirmar el correo automáticamente');
              }
              // Reintentar login
              const {
                error: retryError
              } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: savedState.password || formData.password
              });
              if (retryError) {
                toast({
                  variant: "destructive",
                  title: "Error al iniciar sesión",
                  description: retryError.message
                });
                return;
              }
            } catch (e: any) {
              toast({
                variant: "destructive",
                title: "Confirma tu correo",
                description: e?.message || "No se pudo confirmar automáticamente. Revisa tu correo."
              });
              return;
            }
          } else {
            toast({
              variant: "destructive",
              title: "Error al iniciar sesión",
              description: signInError.message
            });
            return;
          }
        }
      }
      setIsVerified(true);
      setCompletedSteps(prev => [...prev, "step3"]);
      setCurrentStep("step4");
      toast({
        title: "¡Email verificado!",
        description: "Tu cuenta ha sido creada e iniciada sesión correctamente"
      });

      // Clean up localStorage
      localStorage.removeItem('onboardingState');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al verificar el código. Intenta de nuevo."
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  };
  const resendVerificationCode = async () => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('send-verification-code', {
        body: {
          email: formData.email
        }
      });
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error al reenviar el código"
        });
        return;
      }
      toast({
        title: "Código reenviado",
        description: "Te hemos enviado un nuevo código de verificación"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al reenviar el código. Intenta de nuevo."
      });
    }
  };
  const processPayment = async () => {
    if (!selectedPlan) return;
    setIsPaying(true);
    
    // Track Purchase event BEFORE redirecting to payment
    trackPurchase(
      `pending_${Date.now()}`,
      selectedPlan.price_mxn + (hasOwnDomain ? 0 : (domainPrice?.mxn || 0)),
      selectedPlan.billing_cycle,
      'MXN'
    );
    
    try {
      const finalDomain = hasOwnDomain ? domainName : (formData.domain || `${domainName}${domainExtension}`);
      
      const {
        data,
        error
      } = await supabase.functions.invoke('process-combined-purchase', {
        body: {
          domain: finalDomain,
          domainOption: hasOwnDomain ? 'dns-only' : 'buy',
          tenantName: finalDomain.split('.')[0],
          planType: selectedPlan.billing_cycle,
          autoRenewDomain: !hasOwnDomain,
          returnUrlBase: window.location.origin,
          userInfo: {
            email: formData.email,
            firstName: formData.email.split('@')[0],
            lastName: '',
            phone: formData.phonePrefix + formData.phone
          }
        }
      });
      if (error) throw error;

      // Redirect to MercadoPago
      window.location.href = data.paymentUrl;
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        variant: "destructive",
        title: "Error en el pago",
        description: "Hubo un error al procesar el pago. Intenta de nuevo."
      });
    } finally {
      setIsPaying(false);
    }
  };
  const handlePlanSelection = async (plan: any) => {
    setSelectedPlan(plan);
    
    // Track plan selection
    trackCustomEvent('PlanSelected', {
      plan_type: plan.billing_cycle,
      plan_price: plan.price_mxn,
      currency: 'MXN'
    });

    // Apply free domain for annual plans
    // Si tiene su propio dominio, el costo del dominio es 0
    const finalDomainPrice = hasOwnDomain ? 0 : (plan.billing_cycle === 'annual' ? 0 : (domainPrice?.mxn || 0));
    const finalTotalPrice = finalDomainPrice + plan.price_mxn;

    // Generate purchase breakdown
    const breakdown = {
      domain: {
        name: formData.domain || (hasOwnDomain ? domainName : `${domainName}${domainExtension}`),
        price: finalDomainPrice,
        description: hasOwnDomain 
          ? "Usarás tu dominio propio (gratis)" 
          : (finalDomainPrice === 0 ? "Dominio GRATIS con plan anual" : "Registro de dominio por 1 año")
      },
      plan: {
        name: plan.name,
        price: plan.price_mxn,
        description: `Plan ${plan.name} - ${plan.billing_cycle === 'annual' ? 'Facturación anual' : 'Facturación mensual'}`,
        billing_cycle: plan.billing_cycle,
        auto_billing: true
      },
      total: {
        price: finalTotalPrice,
        description: "Total a pagar"
      },
      savings: plan.billing_cycle === 'annual' ? {
        monthly_equivalent: 299,
        savings_amount: 459,
        savings_description: "Ahorras $459 MXN al año (2 meses gratis)"
      } : undefined
    };
    setPurchaseBreakdown(breakdown);
    setShowPurchasePreview(true);
  };
  const startProvisioning = async () => {
    setIsProvisioning(true);

    // Simulate provisioning progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setProvisioningProgress(i);
    }
    setIsProvisioning(false);
    setCurrentStep("step6");
    toast({
      title: "¡Dominio configurado!",
      description: "SSL instalado y dominio verificado"
    });
  };
  const createStore = async () => {
    try {
      console.log('🚀 Creating store - Using bootstrap function');

      // Check authentication
      if (authLoading) {
        console.log('⏳ Auth still loading, waiting...');
        toast({
          title: "Cargando",
          description: "Verificando autenticación..."
        });
        return;
      }
      if (!user || !session) {
        console.error('❌ No authenticated user or session found');
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: "No hay una sesión activa. Por favor, inicia sesión nuevamente."
        });
        return;
      }
      console.log('✅ User authenticated:', {
        userId: user.id,
        email: user.email
      });
      const storeName = flowType === "subdomain" ? formData.subdomain : formData.domain.split('.')[0];
      const storeUrl = flowType === "domain" ? formData.domain : `${formData.subdomain}.toogo.store`;
      console.log('🏪 Bootstrap request:', {
        storeName,
        storeUrl,
        flowType
      });

      // For custom domains, handle purchase through Openprovider first
      if (flowType === "domain") {
        console.log('💳 Purchasing domain:', formData.domain);
        const {
          data: purchaseData,
          error: purchaseError
        } = await supabase.functions.invoke('openprovider-domains', {
          body: {
            action: 'purchase',
            domain: formData.domain
          }
        });
        if (purchaseError) {
          console.error('❌ Domain purchase failed:', purchaseError);
          toast({
            variant: "destructive",
            title: "Error al comprar dominio",
            description: purchaseError.message
          });
          return;
        }
        console.log('✅ Domain purchased, setting up DNS...');

        // Auto-setup DNS for the purchased domain
        await supabase.functions.invoke('openprovider-domains', {
          body: {
            action: 'setup-dns',
            domain: formData.domain
          }
        });
        console.log('✅ DNS configured');
      }

      // Use new bootstrap function to create everything atomically
      console.log('🚀 Calling bootstrap-complete-tenant function...');
      const {
        data: bootstrapResult,
        error: bootstrapError
      } = await supabase.functions.invoke('bootstrap-complete-tenant', {
        body: {
          tenantName: storeName,
          primaryHost: storeUrl,
          flowType: flowType,
        }
      });
      if (bootstrapError) {
        console.error('❌ Bootstrap function error:', bootstrapError);

        // Handle specific error cases
        if (bootstrapError.message?.includes('DOMAIN_EXISTS') || bootstrapError.message?.includes('Domain already exists')) {
          toast({
            variant: "destructive",
            title: "Dominio no disponible",
            description: `El ${flowType === "subdomain" ? "subdominio" : "dominio"} ya está en uso. Por favor, elige otro diferente.`
          });

          // Reset to step 1 to allow user to choose a different domain
          setCurrentStep("step1");
          setIsDomainAvailable(null);
          return;
        }
        throw new Error(bootstrapError.message || 'Error en el proceso de creación');
      }
      if (!bootstrapResult?.success) {
        console.error('❌ Bootstrap failed:', bootstrapResult);
        throw new Error(bootstrapResult?.error || 'Error en el proceso de creación');
      }
      console.log('✅ Bootstrap completed successfully:', bootstrapResult);

      // Store creation completed successfully
      const newTenant = bootstrapResult.tenant;
      
      // Track registration completion for free subdomain
      if (flowType === "subdomain") {
        trackCompleteRegistration(formData.email, formData.subdomain);
      }

      // Get current session for handshake
      const {
        data: sessionData
      } = await supabase.auth.getSession();
      const currentSession = sessionData.session;
      let redirectUrl = `https://${storeUrl}/dashboard`;

      // If user is authenticated, use handshake approach to transfer session
      if (currentSession?.access_token && currentSession?.refresh_token) {
        const handshakeParams = new URLSearchParams({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
          redirect: '/dashboard'
        });
        redirectUrl = `https://${storeUrl}/auth/handshake#${handshakeParams.toString()}`;
        console.log('Using session handshake URL:', redirectUrl);
      } else {
        console.log('No session found, redirecting to dashboard directly');
      }
      const domainType = flowType === "subdomain" ? "subdominio" : "dominio personalizado";
      toast({
        title: "🎉 ¡Tu tienda está lista!",
        description: `${domainType} configurado. Redirigiendo a ${storeUrl}...`
      });

      // Redirect to the new domain after success
      setTimeout(() => {
        onOpenChange(false);
        if (storeUrl && storeUrl.trim()) {
          window.location.href = redirectUrl;
        } else {
          console.warn('⚠️ storeUrl is invalid, showing manual navigation');
          toast({
            title: "Accede a tu tienda",
            description: `Visita: ${redirectUrl}`,
            duration: 5000
          });
        }
      }, 2000);
    } catch (error: any) {
      console.error('❌ Store creation failed:', error);
      toast({
        variant: "destructive",
        title: "Error al crear la tienda",
        description: error.message || "Error desconocido al crear la tienda"
      });
    }
  };
  const getStepsForFlow = () => {
    if (flowType === "subdomain") {
      return [{
        id: "step1",
        title: "Verificando subdominio",
        subtitle: "Elige cómo quieres que sea tu dirección web",
        description: "Comprueba la disponibilidad de tu subdominio",
        icon: Globe,
        completed: completedSteps.includes("step1")
      }, {
        id: "step2",
        title: "Crear cuenta",
        subtitle: "Información básica para tu cuenta",
        description: "Configura tu usuario y contraseña",
        icon: Mail,
        completed: completedSteps.includes("step2")
      }, {
        id: "step3",
        title: "Verificar correo",
        subtitle: "Confirma tu correo electrónico",
        description: "Confirma tu correo electrónico",
        icon: CheckCircle,
        completed: completedSteps.includes("step3")
      }, {
        id: "step4",
        title: "¡Listo!",
        subtitle: "¡Todo listo para empezar!",
        description: "¡Todo listo para empezar!",
        icon: CheckCircle,
        completed: completedSteps.includes("step4")
      }];
    } else {
      return [{
        id: "step1",
        title: "Verificar dominio",
        subtitle: "Elige cómo quieres que sea tu dirección web",
        description: "Comprueba la disponibilidad de tu dominio",
        icon: Globe,
        completed: completedSteps.includes("step1")
      }, {
        id: "step2",
        title: "Crear cuenta",
        subtitle: "Información básica para tu cuenta",
        description: "Configura tu usuario y contraseña",
        icon: Mail,
        completed: completedSteps.includes("step2")
      }, {
        id: "step3",
        title: "Verificar correo",
        subtitle: "Confirma tu correo electrónico",
        description: "Confirma tu correo electrónico",
        icon: CheckCircle,
        completed: completedSteps.includes("step3")
      }, {
        id: "step4",
        title: "Pago",
        subtitle: "Finaliza tu compra",
        description: "Completa el proceso de compra",
        icon: CreditCard,
        completed: completedSteps.includes("step4")
      }, {
        id: "step5",
        title: "Configuración",
        subtitle: "Configurando tu dominio",
        description: "Configuramos tu dominio",
        icon: Loader2,
        completed: completedSteps.includes("step5")
      }, {
        id: "step6",
        title: "¡Listo!",
        subtitle: "¡Todo listo para empezar!",
        description: "¡Todo listo para empezar!",
        icon: CheckCircle,
        completed: completedSteps.includes("step6")
      }];
    }
  };
  const isStepAvailable = (stepId: string) => {
    const steps = getStepsForFlow();
    const stepIndex = steps.findIndex(step => step.id === stepId);
    const currentStepIndex = steps.findIndex(step => step.id === currentStep);

    // First step is always available
    if (stepIndex === 0) return true;

    // Completed steps are always available (users can go back)
    if (completedSteps.includes(stepId)) return true;

    // Current step is available
    if (stepIndex === currentStepIndex) return true;
    return false;
  };
  const renderStepContent = (stepId: string) => {
    switch (stepId) {
      case "step1":
        // Show domain/subdomain form directly based on flowType
        return <div className="space-y-4">
            <Label className="text-sm font-medium">
              {flowType === "subdomain" ? "Tu subdominio personalizado" : "Tu dominio personalizado"}
            </Label>
            {flowType === "subdomain" ? <div className="flex items-center gap-2">
                <Input placeholder="mitienda" value={formData.subdomain} onChange={e => setFormData(prev => ({
              ...prev,
              subdomain: e.target.value
            }))} className="flex-1" />
                <span className="text-sm text-muted-foreground">.toogo.store</span>
              </div> : <div className="space-y-2">
                <div className="flex gap-2">
                <Input 
                  placeholder={hasOwnDomain ? "mitienda.com" : "mitienda"} 
                  value={domainName} 
                  onChange={e => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-.]/g, '');
                    setDomainName(value);
                    setDomainPrice(null);
                    setIsDomainAvailable(null);
                  }} 
                  className="flex-1" 
                  maxLength={63} 
                />
                  {!hasOwnDomain && (
                    <select value={domainExtension} onChange={e => {
                      setDomainExtension(e.target.value);
                      setDomainPrice(null);
                      setIsDomainAvailable(null);
                    }} className="px-3 py-2 border border-input rounded-md bg-background text-sm min-w-[100px]">
                      <option value=".com">.com</option>
                      <option value=".com.mx">.com.mx</option>
                      <option value=".info">.info</option>
                      <option value=".mx">.mx</option>
                      <option value=".net">.net</option>
                    </select>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Dominio: {hasOwnDomain ? domainName : `${domainName}${domainExtension}`}
                </p>
                
                <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 mt-4">
                  <div className="flex-1">
                    <Label htmlFor="own-domain-switch" className="text-sm font-medium cursor-pointer">
                      ✅ Tengo mi propio dominio y lo quiero usar
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Te enviaremos instrucciones para configurar DNS en tu proveedor actual
                    </p>
                  </div>
                  <Switch
                    id="own-domain-switch"
                    checked={hasOwnDomain}
                    onCheckedChange={(checked) => {
                      setHasOwnDomain(checked);
                      setIsDomainAvailable(null);
                      setDomainPrice(null);
                    }}
                  />
                </div>
              </div>}
            
            {isDomainAvailable === false && <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Este {flowType === "subdomain" ? "subdominio" : "dominio"} no está disponible</span>
              </div>}
            
            {isDomainAvailable === true && <div className="space-y-1">
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>¡Disponible!</span>
                </div>
                {domainPrice && <div className="text-sm text-muted-foreground pl-6">
                    Precio: <span className="font-semibold text-foreground">${domainPrice.mxn} MXN</span>
                    <span className="text-xs ml-2">(${domainPrice.usd.toFixed(2)} USD)</span>
                  </div>}
              </div>}
            
            <Button 
              onClick={() => {
                if (flowType === "subdomain") {
                  if (isDomainAvailable === true) {
                    setCompletedSteps(prev => [...prev, "step1"]);
                    setCurrentStep("step2");
                  } else {
                    checkDomainAvailability(formData.subdomain);
                  }
                } else if (hasOwnDomain) {
                  // Si el switch está ON, continuar directo sin verificar
                  setCompletedSteps(prev => [...prev, "step1"]);
                  setCurrentStep("step2");
                } else {
                  // Flow normal: comprar dominio
                  if (isDomainAvailable === true) {
                    setCompletedSteps(prev => [...prev, "step1"]);
                    setCurrentStep("step2");
                  } else {
                    checkDomainAvailability(domainName);
                  }
                }
              }} 
              disabled={
                isCheckingDomain || 
                (flowType === "subdomain" ? !formData.subdomain : !domainName)
              } 
              className="w-full rounded-[30px]"
            >
              {isCheckingDomain ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : hasOwnDomain ? (
                'Continuar'
              ) : isDomainAvailable === true ? (
                'Continuar'
              ) : (
                `Verificar ${flowType === "subdomain" ? "subdominio" : "dominio"}`
              )}
            </Button>
          </div>;
      case "step2":
        return <div className="space-y-6">
            {/* Datos personales */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">País *</Label>
                  <Select value={formData.country} onValueChange={value => {
                  try {
                    const selectedCountry = getCountryByCode(value);
                    if (!selectedCountry) {
                      console.error('❌ Country not found:', value);
                      toast({
                        variant: "destructive",
                        title: "Error",
                        description: "País no válido. Por favor recarga la página."
                      });
                      return;
                    }
                    
                    setFormData(prev => ({
                      ...prev,
                      country: value,
                      state: "",
                      phonePrefix: selectedCountry.phonePrefix || "+52"
                    }));
                  } catch (error) {
                    console.error('❌ Error selecting country:', error);
                    toast({
                      variant: "destructive",
                      title: "Error al seleccionar país",
                      description: "Por favor recarga la página e intenta nuevamente."
                    });
                  }
                }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu país" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(country => <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="state">Estado/Provincia *</Label>
                  <Select value={formData.state} onValueChange={value => setFormData(prev => ({
                  ...prev,
                  state: value
                }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {getStatesByCountry(formData.country).map(state => <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="email">Correo electrónico *</Label>
                <div className="relative">
                  <Input id="email" type="email" placeholder="tu@email.com" value={formData.email} onChange={e => {
                  setFormData(prev => ({
                    ...prev,
                    email: e.target.value
                  }));
                  setEmailAvailable(null); // Reset status when user types
                }} onBlur={() => {
                  if (formData.email) {
                    checkEmailAvailability(formData.email);
                  }
                }} className={`pr-10 ${emailAvailable === false ? 'border-red-500' : emailAvailable === true ? 'border-green-500' : ''}`} />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {checkingEmail && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    {!checkingEmail && emailAvailable === true && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {!checkingEmail && emailAvailable === false && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                </div>
                {emailAvailable === false && <p className="text-sm text-red-500 mt-1">
                    ✗ Correo ya registrado
                  </p>}
                {emailAvailable === true && <p className="text-sm text-green-500 mt-1">
                    ✓ Correo disponible
                  </p>}
              </div>
              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-muted rounded-l-md border border-r-0">
                    <span className="text-sm">{formData.phonePrefix}</span>
                  </div>
                  <Input id="phone" placeholder="1234567890" value={formData.phone} onChange={e => setFormData(prev => ({
                  ...prev,
                  phone: e.target.value.replace(/\D/g, '')
                }))} className="rounded-l-none" />
                </div>
              </div>
            </div>

            {/* Separador visual */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Crea tu acceso</span>
              </div>
            </div>

            {/* Sección de acceso */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Usuario</Label>
                <Input id="username" type="email" value={formData.email} readOnly className="bg-muted cursor-not-allowed" />
                <p className="text-xs text-muted-foreground mt-1">Se usará tu correo electrónico como usuario</p>
              </div>
              <div>
                <Label htmlFor="password">Contraseña *</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    value={formData.password} 
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      password: e.target.value
                    }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    value={formData.confirmPassword} 
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      confirmPassword: e.target.value
                    }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && <p className="text-xs text-destructive mt-1">Las contraseñas no coinciden</p>}
              </div>
            </div>

            {/* Términos y Condiciones */}
            <div className="flex items-start space-x-2 border-t border-b py-4 my-4">
              <Checkbox id="terms" checked={formData.acceptedTerms} onCheckedChange={checked => setFormData(prev => ({
              ...prev,
              acceptedTerms: !!checked
            }))} />
              <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                Acepto los{' '}
                <a href="/terminos-condiciones" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 font-medium" onClick={e => e.stopPropagation()}>
                  Términos y Condiciones
                </a>
                {' '}y la{' '}
                <a href="/politica-privacidad" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 font-medium" onClick={e => e.stopPropagation()}>
                  Política de Privacidad
                </a>
                {' '}de Toogo
              </label>
            </div>
            
            <Button onClick={sendVerificationCode} disabled={emailAvailable === false || checkingEmail || !formData.email || !formData.acceptedTerms} className="w-full rounded-[30px]">
              {checkingEmail ? <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando email...
                </> : 'Crear cuenta'}
            </Button>
            
            {emailAvailable === false && <div className="text-center space-y-2 mt-4">
                <p className="text-sm text-muted-foreground">
                  ¿Ya tienes cuenta?
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={() => {
                onOpenChange(false);
              }}>
                    Iniciar sesión
                  </Button>
                  <Button variant="ghost" size="sm">
                    Olvidaste tu contraseña
                  </Button>
                </div>
              </div>}
          </div>;
      case "step3":
        if (isProcessingVerification) {
          return <div className="space-y-4">
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
              <h3 className="text-lg font-semibold mb-2">Procesando verificación</h3>
              <p className="text-sm text-muted-foreground">
                Estamos confirmando tu correo electrónico, por favor espera...
              </p>
            </div>
          </div>;
        }
        return <div className="space-y-6">
            <div className="text-center">
              <Mail className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Ingresa tu código de verificación</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Te hemos enviado un código de 6 dígitos a <strong>{formData.email}</strong>
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Código de verificación</Label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={formData.verificationCode} onChange={value => setFormData(prev => ({
                  ...prev,
                  verificationCode: value
                }))}>
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
              </div>
              
              <Button onClick={verifyCode} disabled={isVerifyingOtp || formData.verificationCode.length !== 6} className="w-full">
                {isVerifyingOtp ? <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </> : "Verificar código"}
              </Button>
              
              <div className="text-center">
                <Button variant="ghost" onClick={resendVerificationCode} size="sm">
                  ¿No recibiste el código? Reenviar
                </Button>
              </div>
            </div>
            
            {isVerified && <div className="text-center py-4">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm text-green-600">
                  ¡Email verificado correctamente!
                </p>
              </div>}
          </div>;
      case "step4":
        if (flowType === "subdomain") {
          return <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
              <h3 className="text-xl font-semibold">¡Todo listo!</h3>
              <p className="text-muted-foreground">
                Tu tienda estará disponible en:<br />
                <strong>{formData.subdomain}.toogo.store</strong>
              </p>
              <Button onClick={createStore} className="w-full rounded-[30px]" disabled={authLoading || !user || !session || !isVerified}>
                {authLoading || !user || !session ? "Verificando sesión..." : "Crear mi tienda"}
              </Button>
              {(!user || !session) && !authLoading && <p className="text-sm text-yellow-600 text-center mt-2">
                  Confirma tu correo y vuelve para continuar
                </p>}
            </div>;
        } else {
          return <div className="space-y-4">
              <PlanSelector onPlanSelect={handlePlanSelection} domainName={formData.domain} domainPrice={domainPrice} />
            </div>;
        }
      case "step5":
        return <div className="text-center space-y-4">
            <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary" />
            <h3 className="text-xl font-semibold">Configurando tu dominio</h3>
            <div className="space-y-2">
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{
                width: `${provisioningProgress}%`
              }} />
              </div>
              <p className="text-sm text-muted-foreground">{provisioningProgress}% completado</p>
            </div>
            <div className="text-left space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">DNS configurado</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">SSL instalado</span>
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Verificando dominio...</span>
              </div>
            </div>
          </div>;
      case "step6":
        return <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
            <h3 className="text-xl font-semibold">¡Dominio configurado!</h3>
            <p className="text-muted-foreground">
              Tu tienda estará disponible en:<br />
              <strong>{formData.domain}</strong>
            </p>
            <Button onClick={createStore} className="w-full rounded-[30px]" disabled={authLoading || !user || !session || !isVerified}>
              {authLoading || !user || !session ? "Verificando sesión..." : "Crear mi tienda"}
            </Button>
            {(!user || !session) && !authLoading && <p className="text-sm text-yellow-600 text-center mt-2">
                Confirma tu correo y vuelve para continuar
              </p>}
          </div>;
      default:
        return null;
    }
  };

  // Show initial selection modal
  if (flowType === "initial") {
    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-0 bg-transparent border-0 shadow-none">
          <DialogHeader>
            <DialogTitle className="sr-only">Configuración inicial</DialogTitle>
          </DialogHeader>
          <div className="bg-white rounded-[30px] m-4 overflow-hidden max-h-full">
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-2rem)]">
              {/* Header con flecha de regreso */}
              <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => onOpenChange(false)}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Elige tu dominio
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Primero define cómo quieres que sea la dirección de tu tienda
                  </p>
                </div>
                <DialogClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </div>
              
              {/* Línea divisoria */}
              <div className="border-t border-gray-200 mb-6"></div>

              {/* Opciones de selección */}
              <TooltipProvider>
                <div className="space-y-4">
                  <div className={`border-2 rounded-[30px] p-6 cursor-pointer transition-all relative ${selectedOption === "subdomain" ? "border-[#8246C0] bg-purple-50" : "border-gray-200 bg-gray-50"}`} onClick={() => setSelectedOption("subdomain")}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="absolute top-4 right-4 p-1 hover:bg-white/50 rounded-full transition-colors">
                          <HelpCircle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                        </button>
                      </TooltipTrigger>
                       <TooltipContent side="left" align="end" sideOffset={8} collisionPadding={8} className="max-w-xs bg-white border shadow-lg">
                         <div className="p-2">
                           <h5 className="font-semibold text-sm mb-1">¿Qué es un subdominio?</h5>
                           <p className="text-xs text-gray-600 text-justify">
                             Es una dirección web gratuita que incluye el nombre de tu tienda seguido de '.toogo.store'. 
                             Por ejemplo: mitienda.toogo.store. Es perfecto para empezar sin costo y está listo al instante.
                           </p>
                         </div>
                       </TooltipContent>
                    </Tooltip>
                    <div className="flex items-start gap-4">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-1 ${selectedOption === "subdomain" ? "border-[#8246C0] bg-[#8246C0]" : "border-gray-300"}`}>
                        {selectedOption === "subdomain" && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="font-semibold text-base">Subdominio gratis</h4>
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            Gratis
                          </span>
                        </div>
                      <p className="text-gray-600 text-sm mb-3">
                        Obtén un subdominio como <span className="text-[#8246C0] font-mono whitespace-nowrap">mi-tienda.toogo.store</span>
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-600">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span>Disponible inmediatamente</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span>SSL incluido</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span>Sin costo adicional</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                  <div className={`border-2 rounded-[30px] p-6 cursor-pointer transition-all relative ${selectedOption === "domain" ? "border-[#8246C0] bg-purple-50" : "border-gray-200 bg-gray-50"}`} onClick={() => setSelectedOption("domain")}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="absolute top-4 right-4 p-1 hover:bg-white/50 rounded-full transition-colors">
                          <HelpCircle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                        </button>
                      </TooltipTrigger>
                       <TooltipContent side="left" align="end" sideOffset={8} collisionPadding={8} className="max-w-xs bg-white border shadow-lg">
                         <div className="p-2">
                           <h5 className="font-semibold text-sm mb-1">¿Qué es un dominio personalizado?</h5>
                           <p className="text-xs text-gray-600 text-justify">
                             Es tu propia dirección web única como 'mitienda.com'. Te da mayor profesionalidad y credibilidad, 
                             pero requiere un plan de pago y puede tomar unas horas en configurarse.
                           </p>
                         </div>
                       </TooltipContent>
                    </Tooltip>
                    <div className="flex items-start gap-4">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-1 ${selectedOption === "domain" ? "border-[#8246C0] bg-[#8246C0]" : "border-gray-300"}`}>
                        {selectedOption === "domain" && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="font-semibold text-base">Dominio personalizado</h4>
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">Basic</span>
                        </div>
                      <p className="text-gray-600 text-sm mb-3">
                        Usa tu propio dominio como <span className="text-[#8246C0] font-mono whitespace-nowrap">mi-tienda.com</span>
                      </p>
                      <p className="text-[11px] text-gray-500 mb-3 italic">
                        💡 Si aún no estás seguro de tu nombre de dominio, puedes elegir la opción gratis ahora y cambiarlo después.
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-600">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span>Más profesional</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span>Mejor SEO</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span>Mayor credibilidad</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </TooltipProvider>

              {/* Botón de continuar */}
              <div className="mt-8 flex justify-center">
                <Button onClick={() => {
                  // Track plan selection
                  if (selectedOption === "subdomain") {
                    trackCustomEvent('SelectFreePlan', { plan_type: 'free_subdomain' });
                  } else {
                    trackInitiateCheckout('basic_domain', { plan_type: 'basic' });
                  }
                  setFlowType(selectedOption);
                }} className="bg-[#8246C0] hover:bg-[#8246C0]/90 text-white px-8 py-3 rounded-[30px] font-medium">
                  Continuar con {selectedOption === "subdomain" ? "subdominio gratis" : "dominio personalizado"}
                </Button>
              </div>
            </div>
        </div>
      </DialogContent>
      
      <PurchasePreviewModal open={showPurchasePreview} onOpenChange={setShowPurchasePreview} breakdown={purchaseBreakdown} onConfirm={processPayment} isLoading={isPaying} />
    </Dialog>;
  }

  // Show onboarding flow
  return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-0 bg-transparent border-0 shadow-none">
          <DialogHeader>
            <DialogTitle className="sr-only">Onboarding de tienda</DialogTitle>
          </DialogHeader>
        <div className="bg-white rounded-[30px] m-4 overflow-hidden max-h-full">
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-2rem)]">
            {/* Header con flecha de regreso y X */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setFlowType("initial")} className="p-2 h-8 w-8 rounded-full hover:bg-gray-100">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Crea tu tienda en {flowType === "subdomain" ? "4" : "6"} pasos
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Solo te tomará unos minutos
                  </p>
                </div>
              </div>
              <DialogClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
            
            {/* Línea divisoria */}
            <div className="border-b border-gray-100 mb-6"></div>
            
            {/* Accordion */}
            <Accordion type="single" value={currentStep} onValueChange={value => {
            if (value && isStepAvailable(value)) {
              setCurrentStep(value);
            }
          }} className="space-y-3">
              {getStepsForFlow().map(step => {
              const isCurrentStep = currentStep === step.id;
              const isCompleted = completedSteps.includes(step.id);
              const isAvailable = isStepAvailable(step.id);
              return <AccordionItem key={step.id} value={step.id} className="bg-gray-50 rounded-[30px] border-0 shadow-sm">
                      <AccordionTrigger className={`px-6 py-4 hover:no-underline ${!isAvailable ? "opacity-70" : ""}`} disabled={!isAvailable}>
                        <div className="flex items-center gap-4 w-full">
                          {/* Icono circular */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isCompleted ? "bg-green-500 text-white" : isCurrentStep ? "bg-[#8246C0] text-white" : "bg-gray-100 text-gray-400"}`}>
                            {isCompleted ? <CheckCircle className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                          </div>
                          
                          {/* Contenido del paso */}
                          <div className="flex-1 text-left">
                        <h3 className={`font-semibold text-base ${isCurrentStep ? "text-[#8246C0]" : isCompleted ? "text-green-600" : "text-gray-600"}`}>
                              {step.title}
                            </h3>
                        <p className={`text-sm ${isCurrentStep ? "text-[#8246C0]/70" : isCompleted ? "text-green-500" : "text-gray-400"}`}>
                              {step.subtitle}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      {isCurrentStep && <AccordionContent className="px-6 pb-6 pt-2 bg-white rounded-b-[30px] mx-2 mb-2">
                          {renderStepContent(step.id)}
                        </AccordionContent>}
                    </AccordionItem>;
            })}
            </Accordion>
          </div>
        </div>

      </DialogContent>
      
        <PurchasePreviewModal open={showPurchasePreview} onOpenChange={setShowPurchasePreview} breakdown={purchaseBreakdown} onConfirm={processPayment} onGoBack={handleGoBackToPlanSelector} isLoading={isPaying} purchaseData={{
      domain: formData.domain,
      tenantName: formData.domain.split('.')[0],
      planType: selectedPlan?.billing_cycle ?? 'monthly',
      userInfo: {
        email: formData.email,
        firstName: formData.email.split('@')[0],
        lastName: formData.email.split('@')[0]
      }
    }} />
    </Dialog>;
};