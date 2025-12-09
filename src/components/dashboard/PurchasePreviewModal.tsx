import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CreditCard, Calendar, Zap, Tag, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { EmbeddedPaymentForm } from '@/components/EmbeddedPaymentForm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCoupons } from '@/hooks/useCoupons';
import { toast } from 'sonner';

interface PurchaseBreakdown {
  domain: {
    name: string;
    price: number;
    description: string;
  };
  plan: {
    name: string;
    price: number;
    description: string;
    billing_cycle: 'monthly' | 'semi_annual' | 'annual';
    auto_billing: boolean;
  };
  total: {
    price: number;
    description: string;
  };
  savings?: {
    monthly_equivalent: number;
    savings_amount: number;
    savings_description: string;
  };
}

interface PurchasePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  breakdown?: PurchaseBreakdown | null;
  onConfirm: () => void;
  onGoBack?: () => void;
  isLoading?: boolean;
  purchaseData?: {
    domain: string;
    tenantName: string;
    planType: 'monthly' | 'semi_annual' | 'annual';
    userInfo: {
      email: string;
      firstName: string;
      lastName: string;
    };
  };
}

export const PurchasePreviewModal: React.FC<PurchasePreviewModalProps> = ({
  open,
  onOpenChange,
  breakdown,
  onConfirm,
  onGoBack,
  isLoading = false,
  purchaseData
}) => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  
  const { validateCoupon } = useCoupons();
  const formatPrice = (price: number) => `$${price.toLocaleString()} MXN`;
  
  // Utility to round to 2 decimals
  const round2 = (n: number): number => Math.round(n * 100) / 100;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Ingresa un código de cupón');
      return;
    }

    setIsValidatingCoupon(true);
    try {
      // Validar cupón solo contra el precio del plan (membresía)
      const result = await validateCoupon(
        couponCode.trim(),
        'membership', // Cupones solo se aplican a membresía
        breakdown?.plan.price || 0
      );

      if (result.isValid && result.coupon) {
        setAppliedCoupon(result.coupon);
        setCouponDiscount(result.discountAmount);
        toast.success(`Cupón aplicado: ${formatPrice(result.discountAmount)} de descuento`);
      } else {
        toast.error(result.error || 'Cupón inválido o expirado');
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      toast.error('Error al validar el cupón');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode('');
    toast.info('Cupón removido');
  };

  // Calcular el total final: dominio + (plan - descuento) - ROUNDED
  const planAfterDiscount = round2(Math.max(0, (breakdown?.plan.price || 0) - couponDiscount));
  const finalTotal = round2((breakdown?.domain.price || 0) + planAfterDiscount);

  const handlePaymentSuccess = (paymentResult: any) => {
    console.log('Payment successful:', paymentResult);
    
    // Redirigir a la página de "Tienda en Construcción"
    const queryParams = new URLSearchParams({
      domain: purchaseData?.domain || '',
      email: purchaseData?.userInfo.email || '',
      order_id: paymentResult.id || paymentResult.order_id || 'N/A'
    });
    
    window.location.href = `/store-being-created?${queryParams.toString()}`;
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    setShowPaymentForm(false);
  };

  if (!breakdown) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resumen de compra</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">Preparando resumen...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Confirmar Compra
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Purchase Items */}
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Domain */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{breakdown.domain.name}</p>
                    {breakdown.domain.price === 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        GRATIS
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{breakdown.domain.description}</p>
                </div>
                <div className="text-right">
                  {breakdown.domain.price === 0 ? (
                    <div>
                      <p className="text-sm text-muted-foreground line-through">$222 MXN</p>
                      <p className="font-medium text-green-600">GRATIS</p>
                    </div>
                  ) : (
                    <p className="font-medium">{formatPrice(breakdown.domain.price)}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Plan */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{breakdown.plan.name}</p>
                    {breakdown.plan.billing_cycle === 'semi_annual' && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        1 mes gratis
                      </Badge>
                    )}
                    {breakdown.plan.billing_cycle === 'annual' && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        2 meses gratis
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{breakdown.plan.description}</p>
                  
                  {/* Auto billing indicator */}
                  {breakdown.plan.auto_billing && (
                    <div className="flex items-center gap-1 mt-1">
                      <Zap className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-blue-600">Cobro automático</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatPrice(breakdown.plan.price)}</p>
                  {breakdown.savings && (
                    <p className="text-xs text-green-600">
                      vs ${breakdown.savings.monthly_equivalent} MXN/mes
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Subtotal */}
              {couponDiscount > 0 && (
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(breakdown.total.price)}</span>
                </div>
              )}

              {/* Discount */}
              {couponDiscount > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span>Descuento ({appliedCoupon?.code})</span>
                  <span>-{formatPrice(couponDiscount)}</span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center font-bold text-lg">
                <span>{breakdown.total.description}</span>
                <span className="text-primary">{formatPrice(finalTotal)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Coupon Section */}
          {!showPaymentForm && (
            <Card className="border-dashed">
              <CardContent className="p-4">
                <Label className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  ¿Tienes un cupón de descuento?
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="CODIGO-CUPON"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={!!appliedCoupon}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !appliedCoupon) {
                        handleApplyCoupon();
                      }
                    }}
                  />
                  <Button
                    onClick={handleApplyCoupon}
                    disabled={!couponCode || isValidatingCoupon || !!appliedCoupon}
                    variant="outline"
                  >
                    {isValidatingCoupon ? 'Validando...' : 'Aplicar'}
                  </Button>
                </div>
                {appliedCoupon && (
                  <div className="mt-2 flex items-center justify-between p-2 bg-green-50 rounded-md border border-green-200">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Cupón aplicado: {appliedCoupon.code}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveCoupon}
                      className="h-7 text-green-700 hover:text-green-800"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Savings Information */}
          {breakdown.savings && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-800">Ahorro Anual</span>
                </div>
                <p className="text-sm text-green-700">
                  Ahorras {formatPrice(breakdown.savings.savings_amount)} al elegir el plan anual
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Equivale a {breakdown.savings.savings_description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Billing Information */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">Información de Facturación</span>
              </div>
              <p className="text-sm text-blue-700">
                {breakdown.plan.billing_cycle === 'annual' 
                  ? 'Renovación automática cada año'
                  : breakdown.plan.billing_cycle === 'semi_annual'
                  ? 'Renovación automática cada 6 meses'
                  : 'Renovación automática cada mes'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Puedes cancelar en cualquier momento desde tu dashboard
              </p>
            </CardContent>
          </Card>

          {/* Payment Section */}
          {!showPaymentForm ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onGoBack || (() => onOpenChange(false))}
                disabled={isLoading}
                className="flex-1"
              >
                {onGoBack ? '← Cambiar Plan' : 'Cancelar'}
              </Button>
              <Button
                onClick={() => setShowPaymentForm(true)}
                disabled={isLoading || !purchaseData}
                className="flex-1"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pagar Ahora
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Separator />
              <EmbeddedPaymentForm
                amount={finalTotal}
                description={breakdown.total.description}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                onCancel={() => setShowPaymentForm(false)}
                isLoading={isLoading}
                purchaseData={purchaseData!}
                couponCode={appliedCoupon?.code}
                discountAmount={couponDiscount}
                appliedTo="membership"
              />
            </div>
          )}

          {/* Security Notice */}
          <p className="text-xs text-center text-muted-foreground">
            Pago seguro procesado por MercadoPago
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};