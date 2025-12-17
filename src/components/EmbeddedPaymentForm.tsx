import React, { useState, useEffect } from 'react';
import { Payment, initMercadoPago } from '@mercadopago/sdk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Lock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';

interface EmbeddedPaymentFormProps {
  amount: number;
  description: string;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  purchaseData: {
    domain: string;
    tenantName: string;
    tenantId?: string; // Optional tenant ID for upgrades
    planType: 'monthly' | 'semi_annual' | 'annual';
    userInfo: {
      email: string;
      firstName: string;
      lastName: string;
    };
  };
  couponCode?: string;
  discountAmount?: number;
  appliedTo?: 'membership' | 'domain' | 'both';
}

export const EmbeddedPaymentForm: React.FC<EmbeddedPaymentFormProps> = ({
  amount,
  description,
  onPaymentSuccess,
  onPaymentError,
  onCancel,
  isLoading = false,
  purchaseData,
  couponCode,
  discountAmount,
  appliedTo = 'membership'
}) => {
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [isFormReady, setIsFormReady] = useState(false);
  const [mpPublicKey, setMpPublicKey] = useState<string | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Debug logs
  console.log('EmbeddedPaymentForm props:', { amount, description, purchaseData });
  console.log('MercadoPago initialization status:', (window as any).MercadoPago ? 'Loaded' : 'Not loaded');

  // Validation: Check if userInfo exists
  if (!purchaseData?.userInfo?.email) {
    console.error('[EmbeddedPaymentForm] Missing user information:', purchaseData);
  }

  useEffect(() => {
    const loadMercadoPagoConfig = async () => {
      try {
        setIsLoadingConfig(true);
        setConfigError(null);
        console.log('[EmbeddedPaymentForm] Loading MercadoPago configuration...');

        // Get public payment config (accessible to all authenticated users)
        const response = await supabase.functions.invoke('manage-membership-settings', {
          body: { action: 'get_public_payment_config' }
        });

        if (response.error) {
          console.error('[EmbeddedPaymentForm] Error fetching payment config:', response.error);
          setConfigError('Error al cargar la configuración de pago');
          setIsLoadingConfig(false);
          return;
        }

        const publicKey = response.data?.mercadopago?.public_key;

        if (!publicKey) {
          console.warn('[EmbeddedPaymentForm] No valid MercadoPago public key found');
          setConfigError('MercadoPago no está configurado correctamente. Verifica la configuración en Admin.');
          setIsLoadingConfig(false);
          return;
        }

        console.log('[EmbeddedPaymentForm] MercadoPago public key loaded successfully');
        setMpPublicKey(publicKey);

        // Initialize MercadoPago with the fetched key
        initMercadoPago(publicKey, {
          locale: 'es-MX',
          advancedFraudPrevention: false
        });

        console.log('[EmbeddedPaymentForm] MercadoPago SDK initialized');
      } catch (error) {
        console.error('[EmbeddedPaymentForm] Error loading MercadoPago configuration:', error);
        setConfigError('Error al cargar la configuración de pago');
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadMercadoPagoConfig();
  }, []);

  const initialization = {
    amount: Number(amount.toFixed(2)), // Round to 2 decimals
    payer: {
      email: purchaseData?.userInfo?.email || '',
      first_name: purchaseData?.userInfo?.firstName || '',
      last_name: purchaseData?.userInfo?.lastName || '',
    },
    preferenceId: undefined, // Para checkout embebido
  };

  const customization = {
    paymentMethods: {
      creditCard: 'all' as const,
      debitCard: 'all' as const,
      mercadoPago: 'wallet_purchase' as const,
    },
    visual: {
      style: {
        theme: 'default' as const,
      },
      hideFormTitle: false,
    },
  };

  const onSubmit = async ({ selectedPaymentMethod, formData }: any) => {
    setProcessing(true);
    setPaymentStatus('processing');

    try {
      // Call your edge function to process the payment
      const response = await supabase.functions.invoke('process-embedded-payment', {
        body: {
          ...purchaseData,
          tenantId: purchaseData.tenantId, // Ensure tenantId is passed explicitly
          couponCode,
          discountAmount,
          appliedTo,
          paymentData: {
            token: formData.token,
            payment_method_id: formData.payment_method_id,
            issuer_id: formData.issuer_id,
            transaction_amount: Number(amount.toFixed(2)), // Round to 2 decimals
            description: description,
            payer: {
              email: purchaseData.userInfo.email,
              first_name: purchaseData.userInfo.firstName,
              last_name: purchaseData.userInfo.lastName,
            },
          },
        }
      });

      const result = response.data;

      if (!response.error && result.payment?.status === 'approved') {
        setPaymentStatus('success');
        toast.success('¡Pago procesado exitosamente!');
        onPaymentSuccess(result);
      } else {
        throw new Error(response.error?.message || result?.error || 'Error en el pago');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      toast.error('Error al procesar el pago');
      onPaymentError(error);
    } finally {
      setProcessing(false);
    }
  };

  const onError = (error: any) => {
    console.error('Payment form error:', error);

    // Check for specific MercadoPago errors
    if (error?.message?.includes('Could not fetch site ID')) {
      console.error('MercadoPago site ID error - check public key validity');
      setConfigError('Clave pública de MercadoPago inválida. Contacta al administrador.');
    } else {
      setPaymentStatus('error');
      toast.error('Error en el formulario de pago');
    }

    onPaymentError(error);
  };

  const onReady = () => {
    console.log('Payment form is ready');
    setIsFormReady(true);
  };

  if (paymentStatus === 'success') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            ¡Pago Exitoso!
          </h3>
          <p className="text-green-600">
            Tu pago ha sido procesado correctamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (paymentStatus === 'error') {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Error en el Pago
          </h3>
          <p className="text-red-600 mb-4">
            Hubo un problema al procesar tu pago. Por favor, inténtalo de nuevo.
          </p>
          <Button
            onClick={() => setPaymentStatus('idle')}
            variant="outline"
            className="mr-2"
          >
            Reintentar
          </Button>
          <Button onClick={onCancel} variant="ghost">
            Cancelar
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show configuration error
  if (configError) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Configuración Requerida
          </h3>
          <p className="text-yellow-700 mb-4">
            {configError}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={onCancel} variant="outline">
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error if user info is missing
  if (!purchaseData?.userInfo?.email) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Información de Usuario Requerida
          </h3>
          <p className="text-yellow-700 mb-4">
            No se pudo obtener la información del usuario. Por favor, recarga la página e intenta nuevamente.
          </p>
          <Button onClick={onCancel} variant="outline">
            Volver
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show loading state
  if (isLoadingConfig || !mpPublicKey) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              Cargando configuración de pago...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Security indicators */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Lock className="w-4 h-4" />
        <span>Pago 100% seguro con MercadoPago</span>
      </div>

      {/* Payment form */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Datos de tu tarjeta</h3>
          </div>

          {/* Términos y Condiciones */}
          <div className="flex items-start space-x-2 p-4 bg-muted/50 rounded-lg mb-4 border">
            <Checkbox
              id="payment-terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
            />
            <label htmlFor="payment-terms" className="text-sm leading-relaxed cursor-pointer">
              Al procesar este pago, confirmo que he leído y acepto los{' '}
              <a
                href="/terminos-condiciones"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80 font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                Términos y Condiciones
              </a>
              {' '}y la{' '}
              <a
                href="/politica-privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80 font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                Política de Privacidad
              </a>
              {' '}de Toogo
            </label>
          </div>

          {/* Mensaje de advertencia si no se aceptan términos */}
          {!acceptedTerms && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
              <p className="text-sm text-yellow-800">
                Debes aceptar los términos y condiciones para continuar con el pago
              </p>
            </div>
          )}

          {!isFormReady && acceptedTerms && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                Cargando formulario de pago...
              </div>
            </div>
          )}

          <div className={`min-h-[300px] ${!isFormReady ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
            {acceptedTerms ? (
              mpPublicKey && amount > 0 && (
                <Payment
                  initialization={initialization}
                  customization={customization}
                  onSubmit={onSubmit}
                  onReady={onReady}
                  onError={onError}
                />
              )
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">Acepta los términos para continuar</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={processing || isLoading}
          className="flex-1"
        >
          Cancelar
        </Button>
        {paymentStatus === 'processing' && (
          <Button
            disabled
            className="flex-1 relative overflow-hidden bg-primary text-primary-foreground hover:bg-primary h-11"
          >
            {/* Barra deslizante animada */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-slide-right" />

            {/* Contenido del botón */}
            <div className="relative flex items-center justify-center gap-2 z-10">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="font-medium">Procesando pago...</span>
            </div>
          </Button>
        )}
      </div>

      {/* Payment methods info */}
      <div className="text-xs text-center text-muted-foreground">
        Aceptamos Visa, Mastercard, American Express y más
      </div>
    </div>
  );
};