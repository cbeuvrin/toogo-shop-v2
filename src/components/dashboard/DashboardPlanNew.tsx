// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, Crown, Globe, Shield, X, Calendar, CreditCard, AlertTriangle, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/components/AuthProvider';
import { MembershipPricing } from './MembershipPricing';
import { CancelPlanModal } from './CancelPlanModal';
import { CancellationBanner } from './CancellationBanner';
import { PurchasePreviewModal } from './PurchasePreviewModal';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';

interface PlanFeature {
  name: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  features: PlanFeature[];
  popular?: boolean;
  current?: boolean;
}

export const DashboardPlanNew = () => {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showDomainDialog, setShowDomainDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDomainChoiceDialog, setShowDomainChoiceDialog] = useState(false);
  const [showPurchasePreview, setShowPurchasePreview] = useState(false);
  const [showPaymentHistoryDialog, setShowPaymentHistoryDialog] = useState(false);
  const [domainOption, setDomainOption] = useState<'keep' | 'buy' | 'transfer'>('keep');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [domainName, setDomainName] = useState('');
  const [transferCode, setTransferCode] = useState('');
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseBreakdown, setPurchaseBreakdown] = useState<any>(null);
  const [purchaseData, setPurchaseData] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const { toast } = useToast();
  const { currentTenantId, availableTenants } = useTenantContext();
  const { user } = useAuth();
  const { plan, restrictions } = usePlanRestrictions();
  
  // Get the actual subdomain from the tenant's primary_host
  const currentTenant = availableTenants.find(t => t.id === currentTenantId);
  const subdomain = currentTenant?.primary_host?.replace('.toogo.store', '') || 'tutienda';

  useEffect(() => {
    if (currentTenantId) {
      loadSubscriptionData();
    }
  }, [currentTenantId]);

  const loadSubscriptionData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading subscription:', error);
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPaymentHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_orders')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading payment history:', error);
        return;
      }

      setPaymentHistory(data || []);
    } catch (error) {
      console.error('Error loading payment history:', error);
    }
  };

  useEffect(() => {
    if (showPaymentHistoryDialog && currentTenantId) {
      loadPaymentHistory();
    }
  }, [showPaymentHistoryDialog, currentTenantId]);

  // Simplified plan data
  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Plan Gratuito',
      price: 0,
      features: [
        { name: 'Hasta 20 productos', included: true },
        { name: 'Subdominio .toogo.store', included: true },
        { name: 'Pagos por WhatsApp', included: true },
        { name: 'Analytics básico', included: true },
        { name: 'Dominio personalizado', included: false },
        { name: 'Múltiples métodos de pago', included: false },
        { name: 'Analytics avanzado', included: false },
        { name: 'Soporte prioritario', included: false }
      ]
    },
    {
      id: 'basic',
      name: 'Plan Basic',
      price: 299,
      popular: true,
      features: [
        { name: 'Productos ilimitados', included: true },
        { name: 'Dominio personalizado', included: true },
        { name: 'Múltiples métodos de pago', included: true },
        { name: 'Analytics avanzado', included: true },
        { name: 'Soporte prioritario', included: true },
        { name: 'Integraciones avanzadas', included: true },
        { name: 'Exportación de datos', included: true },
        { name: 'Sin límites de productos', included: true }
      ]
    }
  ];

  // Determine current plan based on tenant plan field
  const currentPlan = plans.find(p => p.id === plan) || plans[0];
  const isBasicPlan = plan === 'basic' || plan === 'pro';
  const isProPlan = isBasicPlan; // Alias for Pro plan status

  const formatNextBillingDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePlanSelect = (plan: any) => {
    setSelectedPlan(plan);
    setShowUpgradeDialog(false);
    setShowDomainChoiceDialog(true);
  };

  const preparePurchaseBreakdown = (domainOpt: 'keep' | 'buy' | 'transfer', domain?: string) => {
    if (!selectedPlan) return;

    const planPrice = selectedPlan.billing_cycle === 'annual' ? 3120 : selectedPlan.billing_cycle === 'semi_annual' ? 1710 : 299;
    const domainPrice = domainOpt === 'keep' ? 0 : 222;
    const totalPrice = planPrice + domainPrice;

    const breakdown = {
      domain: {
        name: domainOpt === 'keep' 
          ? `${subdomain}.toogo.store`
          : domain || 'tudominio.com',
        price: domainPrice,
        description: domainOpt === 'keep' 
          ? 'Subdominio incluido gratis'
          : domainOpt === 'buy'
          ? 'Registro de dominio por 1 año'
          : 'Transferencia de dominio'
      },
      plan: {
        name: 'Plan Basic',
        price: planPrice,
        description: selectedPlan.billing_cycle === 'annual'
          ? 'Plan Basic - 12 meses (2 meses gratis)'
          : selectedPlan.billing_cycle === 'semi_annual'
          ? 'Plan Basic - 6 meses (1 mes gratis)'
          : 'Plan Basic - 1 mes',
        features: [
          '🛍️ Productos ilimitados',
          '🌐 Dominio personalizado',
          '💳 Múltiples métodos de pago (MercadoPago, PayPal)',
          '📊 Analytics avanzado',
          '🎨 Personalización completa',
          '📱 Soporte prioritario'
        ],
        billing_cycle: selectedPlan.billing_cycle,
        auto_billing: true
      },
      total: {
        price: totalPrice,
        description: 'Total a pagar'
      },
      savings: selectedPlan.billing_cycle === 'annual' ? {
        monthly_equivalent: 260,
        savings_amount: 468,
        savings_description: '$260 MXN/mes vs $299 MXN/mes'
      } : selectedPlan.billing_cycle === 'semi_annual' ? {
        monthly_equivalent: 285,
        savings_amount: 84,
        savings_description: '$285 MXN/mes vs $299 MXN/mes'
      } : undefined
    };

    const data = {
      domain: domainOpt === 'keep' 
        ? `${subdomain}.toogo.store`
        : domain || '',
      tenantName: currentTenant?.name || subdomain,
      planType: selectedPlan.billing_cycle,
      domainOption: domainOpt,
      authCode: domainOpt === 'transfer' ? transferCode : undefined,
      userInfo: {
        email: user?.email || '',
        firstName: user?.user_metadata?.first_name || user?.user_metadata?.firstName || '',
        lastName: user?.user_metadata?.last_name || user?.user_metadata?.lastName || ''
      }
    };

    console.log('[DashboardPlanNew] Purchase data created:', {
      tenantId: currentTenantId,
      userId: user?.id,
      userEmail: user?.email,
      purchaseData: data
    });

    setPurchaseBreakdown(breakdown);
    setPurchaseData(data);
    setShowPurchasePreview(true);
    setShowDomainChoiceDialog(false);
  };

  const handleDomainSubmit = () => {
    if (!domainName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre de dominio válido",
        variant: "destructive"
      });
      return;
    }
    preparePurchaseBreakdown('buy', domainName);
  };

  const handleTransferSubmit = () => {
    if (!domainName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa el dominio que quieres transferir",
        variant: "destructive"
      });
      return;
    }
    if (!transferCode.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa tu código EPP (código de autorización)",
        variant: "destructive"
      });
      return;
    }
    preparePurchaseBreakdown('transfer', domainName);
  };

  const handlePaymentSuccess = () => {
    toast({
      title: "¡Pago exitoso!",
      description: "Tu plan ha sido actualizado correctamente",
    });
    setShowPurchasePreview(false);
    loadSubscriptionData();
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Error en el pago",
      description: error,
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      {/* Cancellation Banner */}
      {currentTenantId && <CancellationBanner tenantId={currentTenantId} />}
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Current Plan */}
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  {currentPlan.name}
                </CardTitle>
                <CardDescription>Tu plan actual</CardDescription>
              </div>
              <Badge 
                variant="secondary" 
                className={isBasicPlan ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
              >
                {isBasicPlan ? 'Basic Activo' : 'Gratuito'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Dominio</p>
                  <p className="text-sm text-muted-foreground">
                    {isProPlan ? 'tudominio.com' : 'mitienda.toogo.store'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">SSL</p>
                  <p className="text-sm text-muted-foreground">Activo</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Productos</p>
                  <p className="text-sm text-muted-foreground">
                    {restrictions.maxProducts === Infinity ? 'Ilimitados' : '5 / 20'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Facturación para Basic / Dominios para Free */}
        {isBasicPlan ? (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Facturación</CardTitle>
              <CardDescription>
                Información de tus pagos y suscripción
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription && (
                <>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Próximo cobro</p>
                      <p className="text-sm font-medium">
                        {formatNextBillingDate(subscription.next_billing_date)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <CreditCard className="w-4 h-4 text-green-500" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Monto mensual</p>
                      <p className="text-sm font-medium">$299 MXN</p>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setShowPaymentHistoryDialog(true)}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Ver Historial de Pagos
                  </Button>
                </>
              )}
              
              {!subscription && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    No hay información de facturación disponible
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Dominios</CardTitle>
              <CardDescription>
                Compra o transfiere tu dominio personalizado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Dialog open={showDomainDialog} onOpenChange={setShowDomainDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Globe className="w-4 h-4 mr-2" />
                    Comprar Dominio
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Comprar Dominio Personalizado</DialogTitle>
                    <DialogDescription>
                      Ingresa el dominio que quieres comprar para tu tienda. Solo disponible: .com, .mx, .store
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="domain">Nombre del Dominio</Label>
                      <Input
                        id="domain"
                        value={domainName}
                        onChange={(e) => setDomainName(e.target.value)}
                        placeholder="mitienda.com"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Extensiones disponibles: .com, .mx, .store
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDomainDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleDomainSubmit}>
                      Verificar y Comprar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Gift className="w-4 h-4 mr-2" />
                    Transferir Dominio
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Transferir Dominio Existente</DialogTitle>
                    <DialogDescription>
                      Transfiere tu dominio desde otro proveedor. Necesitas tu código EPP (código de autorización).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="transfer-domain">Dominio a Transferir</Label>
                      <Input
                        id="transfer-domain"
                        value={domainName}
                        onChange={(e) => setDomainName(e.target.value)}
                        placeholder="mitienda.com"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Solo .com, .mx, .store
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="transfer-code">Código EPP (Código de Autorización)</Label>
                      <Input
                        id="transfer-code"
                        value={transferCode}
                        onChange={(e) => setTransferCode(e.target.value)}
                        placeholder="ABC123XYZ789"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Obtén este código desde tu proveedor de dominios actual
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleTransferSubmit}>
                      Iniciar Transferencia
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        {/* Plan Features */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Características del Plan</CardTitle>
            <CardDescription>
              Todo lo que incluye tu plan actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentPlan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  {feature.included ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-gray-400" />
                  )}
                  <span 
                    className={`text-sm ${
                      feature.included ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {feature.name}
                  </span>
                  {!feature.included && !isBasicPlan && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      Basic
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            
            {/* Cancel Plan Button for Pro Users */}
            {isProPlan && (
              <div className="border-t pt-4 mt-4">
                <Button
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                  onClick={() => setShowCancelModal(true)}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Cancelar Plan Basic
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estado del Plan */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {isBasicPlan ? 'Estado del Plan' : 'Mejorar Plan'}
            </CardTitle>
            <CardDescription>
              {isBasicPlan 
                ? 'Ya tienes acceso a todas las funcionalidades premium' 
                : 'Desbloquea todas las funcionalidades premium'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isBasicPlan && (
              <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Crown className="w-4 h-4 mr-2" />
                    Ver Planes Premium
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Planes de Membresía</DialogTitle>
                    <DialogDescription>
                      Elige el plan que mejor se adapte a tu negocio
                    </DialogDescription>
                  </DialogHeader>
                  <MembershipPricing onPlanSelect={handlePlanSelect} />
                </DialogContent>
              </Dialog>
            )}
            {isBasicPlan && (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Todas las funcionalidades premium están activas en tu cuenta
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Flujo de selección de dominio antes del pago */}
      <Dialog open={showDomainChoiceDialog} onOpenChange={setShowDomainChoiceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>¿Cómo quieres configurar tu dominio?</DialogTitle>
            <DialogDescription>
              Elige una opción para continuar con la activación del Plan Basic.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <RadioGroup value={domainOption} onValueChange={setDomainOption}>
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <RadioGroupItem value="keep" id="opt-keep" />
                <Label htmlFor="opt-keep" className="cursor-pointer">
                  <div className="font-medium">Mantener subdominio .toogo.store</div>
                  <div className="text-sm text-muted-foreground">Puedes conectar o comprar un dominio más tarde.</div>
                </Label>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <RadioGroupItem value="buy" id="opt-buy" />
                <Label htmlFor="opt-buy" className="cursor-pointer">
                  <div className="font-medium">Comprar un dominio</div>
                  <div className="text-sm text-muted-foreground">Busca y compra un dominio para tu tienda.</div>
                </Label>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <RadioGroupItem value="transfer" id="opt-transfer" />
                <Label htmlFor="opt-transfer" className="cursor-pointer">
                  <div className="font-medium">Transferir mi dominio</div>
                  <div className="text-sm text-muted-foreground">Traslada tu dominio existente con código EPP.</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDomainChoiceDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!selectedPlan?.id) return;
                if (domainOption === 'keep') {
                  preparePurchaseBreakdown('keep');
                } else if (domainOption === 'buy') {
                  setShowDomainChoiceDialog(false);
                  setShowDomainDialog(true);
                } else {
                  setShowDomainChoiceDialog(false);
                  setShowTransferDialog(true);
                }
              }}
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Preview Modal with Embedded Payment */}
      <PurchasePreviewModal
        open={showPurchasePreview}
        onOpenChange={setShowPurchasePreview}
        breakdown={purchaseBreakdown}
        purchaseData={purchaseData}
        onConfirm={handlePaymentSuccess}
        onGoBack={() => {
          setShowPurchasePreview(false);
          setShowDomainChoiceDialog(true);
        }}
        isLoading={isLoading}
      />

      {/* Payment History Dialog */}
      <Dialog open={showPaymentHistoryDialog} onOpenChange={setShowPaymentHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial de Pagos</DialogTitle>
            <DialogDescription>
              Tus últimos 10 pagos realizados
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {paymentHistory.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No hay pagos registrados
                </p>
              </div>
            )}
            
            {paymentHistory.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {payment.order_type === 'plan_upgrade' ? 'Plan Basic' : 'Compra'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.created_at).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${payment.total_mxn} MXN</p>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    Pagado
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Plan Modal */}
      {currentTenantId && (
        <CancelPlanModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          tenantId={currentTenantId}
        />
      )}
    </div>
  );
};