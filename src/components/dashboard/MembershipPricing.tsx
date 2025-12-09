import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PricingPlan {
  id: string;
  name: string;
  price_mxn: number;
  period: string;
  billing_cycle: string;
  description: string;
  features: string[];
  popular?: boolean;
  current?: boolean;
  auto_billing?: boolean;
  savings_months?: number;
}

interface MembershipPricingProps {
  onPlanSelect?: (plan: PricingPlan) => void;
}

export const MembershipPricing = ({ onPlanSelect }: MembershipPricingProps = {}) => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'semi_annual' | 'annual'>('monthly');
  const { toast } = useToast();

  useEffect(() => {
    loadPricingData();
  }, []);

  const loadPricingData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-membership-settings');
      
      if (error) throw error;

      if (data.pricing?.plans) {
        const allPlans: PricingPlan[] = [
          {
            id: 'free',
            name: 'Plan Gratuito',
            price_mxn: 0,
            period: 'month',
            billing_cycle: 'none',
            description: 'Perfecto para empezar',
            features: [
              'Hasta 20 productos',
              'Subdominios .toogo.store',
              'Pagos por WhatsApp',
              'Analytics básico'
            ],
            current: true
          },
          {
            id: 'pro_monthly',
            name: 'Plan Basic',
            price_mxn: data.pricing.plans.basic_monthly?.price_mxn || 299,
            period: 'month',
            billing_cycle: 'monthly',
            description: 'Cobro automático mensual',
            auto_billing: true,
            features: [
              'Productos ilimitados',
              'Múltiples métodos de pago',
              'Dominio personalizado',
              'Analytics avanzado',
              'Soporte prioritario',
              'Cobro automático'
            ],
            popular: billingCycle === 'monthly'
          },
          {
            id: 'pro_semi_annual',
            name: 'Plan Basic',
            price_mxn: data.pricing.plans.basic_semi_annual?.price_mxn || 1710,
            period: '6_months',
            billing_cycle: 'semi_annual',
            description: 'Cobro automático semestral - 1 mes gratis',
            auto_billing: true,
            savings_months: 1,
            features: [
              'Productos ilimitados',
              'Múltiples métodos de pago',
              'Dominio personalizado',
              'Analytics avanzado',
              'Soporte prioritario',
              'Cobro automático',
              '1 mes gratis'
            ],
            popular: billingCycle === 'semi_annual'
          },
          {
            id: 'pro_annual',
            name: 'Plan Basic',
            price_mxn: data.pricing.plans.basic_annual?.price_mxn || 3120,
            period: 'year',
            billing_cycle: 'annual',
            description: 'Cobro automático anual - 2 meses gratis',
            auto_billing: true,
            savings_months: 2,
            features: [
              'Productos ilimitados',
              'Múltiples métodos de pago',
              'Dominio personalizado',
              'Analytics avanzado',
              'Soporte prioritario',
              'Cobro automático',
              '2 meses gratis'
            ],
            popular: billingCycle === 'annual'
          }
        ];
        setPlans(allPlans);
      } else {
        setFallbackPlans();
      }
    } catch (error) {
      console.error('Error loading pricing:', error);
      setFallbackPlans();
      
      toast({
        title: "Error",
        description: "No se pudieron cargar los precios",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setFallbackPlans = () => {
    const fallbackPlans: PricingPlan[] = [
      {
        id: 'free',
        name: 'Plan Gratuito',
        price_mxn: 0,
        period: 'month',
        billing_cycle: 'none',
        description: 'Perfecto para empezar',
        features: [
          'Hasta 20 productos',
          'Subdominios .toogo.store',
          'Pagos por WhatsApp',
          'Analytics básico'
        ],
        current: true
      },
      {
        id: 'pro_monthly',
        name: 'Plan Basic',
        price_mxn: 299,
        period: 'month',
        billing_cycle: 'monthly',
        description: 'Cobro automático mensual',
        auto_billing: true,
        features: [
          'Productos ilimitados',
          'Múltiples métodos de pago',
          'Dominio personalizado',
          'Analytics avanzado',
          'Soporte prioritario',
          'Cobro automático'
        ],
        popular: billingCycle === 'monthly'
      },
      {
        id: 'pro_semi_annual',
        name: 'Plan Basic',
        price_mxn: 1710,
        period: '6_months',
        billing_cycle: 'semi_annual',
        description: 'Cobro automático semestral - 1 mes gratis',
        auto_billing: true,
        savings_months: 1,
        features: [
          'Productos ilimitados',
          'Múltiples métodos de pago',
          'Dominio personalizado',
          'Analytics avanzado',
          'Soporte prioritario',
          'Cobro automático',
          '1 mes gratis'
        ],
        popular: billingCycle === 'semi_annual'
      },
      {
        id: 'pro_annual',
        name: 'Plan Basic',
        price_mxn: 3120,
        period: 'year',
        billing_cycle: 'annual',
        description: 'Cobro automático anual - 2 meses gratis',
        auto_billing: true,
        savings_months: 2,
        features: [
          'Productos ilimitados',
          'Múltiples métodos de pago',
          'Dominio personalizado',
          'Analytics avanzado',
          'Soporte prioritario',
          'Cobro automático',
          '2 meses gratis'
        ],
        popular: billingCycle === 'annual'
      }
    ];
    setPlans(fallbackPlans);
  };

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') return;

    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    if (onPlanSelect) {
      onPlanSelect(plan);
      return;
    }

    try {
      setProcessingPayment(planId);
      
      const { data, error } = await supabase.functions.invoke('process-plan-upgrade', {
        body: {
          plan_id: planId,
          billing_cycle: plan.billing_cycle
        }
      });

      if (error) throw error;

      if (!data.ok) {
        throw new Error(data.error || 'Error al procesar el upgrade');
      }

      // Redirect to MercadoPago payment page
      window.location.href = data.payment_url;
      
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar el pago. Por favor intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setProcessingPayment(null);
    }
  };

  const formatPrice = (plan: PricingPlan) => {
    if (plan.price_mxn === 0) return 'Gratis';
    
    if (plan.period === 'year') {
      const monthlyEquivalent = Math.round(plan.price_mxn / 12);
      return `$${plan.price_mxn.toLocaleString()} MXN/año (equivale a $${monthlyEquivalent} MXN/mes)`;
    }
    
    if (plan.period === '6_months') {
      const monthlyEquivalent = Math.round(plan.price_mxn / 6);
      return `$${plan.price_mxn.toLocaleString()} MXN/semestre (equivale a $${monthlyEquivalent} MXN/mes)`;
    }
    
    return `$${plan.price_mxn} MXN/mes`;
  };

  const getCurrentPlans = () => {
    return plans.filter(p => p.id === 'free' || p.billing_cycle === billingCycle);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Cargando precios...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Planes de Membresía</h2>
        <p className="text-muted-foreground">
          Elige el plan que mejor se adapte a tu negocio
        </p>
        
        {/* Billing Cycle Selector */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={billingCycle === 'monthly' ? 'default' : 'outline'}
            onClick={() => setBillingCycle('monthly')}
            className="rounded-full"
          >
            Mensual
          </Button>
          <Button
            variant={billingCycle === 'semi_annual' ? 'default' : 'outline'}
            onClick={() => setBillingCycle('semi_annual')}
            className="rounded-full"
          >
            Semestral
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
              1 mes gratis
            </Badge>
          </Button>
          <Button
            variant={billingCycle === 'annual' ? 'default' : 'outline'}
            onClick={() => setBillingCycle('annual')}
            className="rounded-full"
          >
            Anual
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
              2 meses gratis
            </Badge>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {getCurrentPlans().map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''} ${plan.current ? 'ring-2 ring-green-500' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-3 py-1">
                  Más Popular
                </Badge>
              </div>
            )}
            
            {plan.current && (
              <div className="absolute -top-3 right-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800 px-3 py-1">
                  Plan Actual
                </Badge>
              </div>
            )}

            <CardHeader className="text-center">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="text-3xl font-bold text-primary">
                {formatPrice(plan)}
              </div>
              {plan.auto_billing && (
                <Badge variant="outline" className="text-xs">
                  Cobro Automático
                </Badge>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-3">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => handleUpgrade(plan.id)}
                disabled={plan.current || processingPayment === plan.id}
                className={`w-full rounded-[30px] ${
                  plan.popular 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {processingPayment === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Procesando...
                  </>
                ) : plan.current ? (
                  'Plan Actual'
                ) : plan.id === 'free' ? (
                  'Plan Gratuito'
                ) : (
                  `Actualizar a ${plan.name}`
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>Todos los planes incluyen SSL, soporte técnico y actualizaciones automáticas.</p>
        <p>Puedes cambiar de plan en cualquier momento.</p>
        <p className="font-medium">Los planes Pro incluyen facturación automática con MercadoPago.</p>
      </div>
    </div>
  );
};