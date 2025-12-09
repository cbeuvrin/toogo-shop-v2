import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price_mxn: number;
  billing_cycle: 'monthly' | 'semi_annual' | 'annual';
}

interface PlanSelectorProps {
  onPlanSelect: (plan: Plan) => void;
  domainName: string;
  domainPrice: { usd: number; mxn: number } | null;
}

export const PlanSelector: React.FC<PlanSelectorProps> = ({
  onPlanSelect,
  domainName,
  domainPrice
}) => {
  const formatPrice = (price: number) => `$${price.toLocaleString()} MXN`;

  const plans: Plan[] = [
    {
      id: 'basic-monthly',
      name: 'Plan Basic',
      price_mxn: 299,
      billing_cycle: 'monthly'
    },
    {
      id: 'basic-semi-annual',
      name: 'Plan Basic',
      price_mxn: 1710,
      billing_cycle: 'semi_annual'
    },
    {
      id: 'basic-annual',
      name: 'Plan Basic',
      price_mxn: 3120,
      billing_cycle: 'annual'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Domain info */}
      <Card className="border border-muted bg-muted/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Dominio seleccionado</h4>
              <p className="text-sm text-muted-foreground">{domainName}</p>
              <p className="text-xs text-green-600 mt-1">
                * Gratis con plan anual
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{domainPrice ? formatPrice(domainPrice.mxn) : '$0 MXN'}</p>
              <p className="text-xs text-muted-foreground">Por 1 año</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan selection */}
      <div>
        <h3 className="text-lg font-semibold mb-4">¿Cómo quieres pagar tu Plan Basic?</h3>
        <div className="grid gap-4">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
              onClick={() => onPlanSelect(plan)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">
                        {plan.billing_cycle === 'monthly' ? 'Mensual' : plan.billing_cycle === 'semi_annual' ? 'Semestral' : 'Anual'}
                      </h4>
                      {plan.billing_cycle === 'semi_annual' && (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          1 mes gratis
                        </span>
                      )}
                      {plan.billing_cycle === 'annual' && (
                        <>
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            2 meses gratis
                          </span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            Dominio GRATIS
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {plan.billing_cycle === 'monthly' 
                        ? 'Facturación mensual' 
                        : plan.billing_cycle === 'semi_annual'
                        ? 'Facturación semestral - Ahorra $84 MXN'
                        : 'Facturación anual - Ahorra $459 MXN + Dominio gratis'
                      }
                    </p>
                    {plan.billing_cycle === 'semi_annual' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Equivale a $285 MXN por mes
                      </p>
                    )}
                    {plan.billing_cycle === 'annual' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Equivale a $260 MXN por mes
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {formatPrice(plan.price_mxn)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {plan.billing_cycle === 'monthly' ? '/mes' : '/año'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Incluye todas las funciones del Plan Basic:</p>
              <ul className="mt-1 text-xs space-y-0.5">
                <li>• Dominio personalizado</li>
                <li>• Productos ilimitados</li>
                <li>• Personalización completa</li>
                <li>• Analytics avanzados</li>
                <li>• Soporte prioritario</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};