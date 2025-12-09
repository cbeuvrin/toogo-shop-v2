import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Crown, 
  Globe, 
  Check, 
  Zap, 
  Star, 
  ArrowUp,
  ExternalLink,
  Gift,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MembershipPricing } from "./MembershipPricing";

interface PlanFeature {
  name: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
  current?: boolean;
}

export const DashboardPlan = () => {
  const { toast } = useToast();
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [isDomainDialogOpen, setIsDomainDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [transferCode, setTransferCode] = useState("");

  const plans: Plan[] = [
    {
      id: "free",
      name: "Plan Gratuito",
      price: "$0",
      period: "para siempre",
      description: "Perfecto para empezar",
      current: true,
      features: [
        { name: "Subdominio de Lovable", included: true },
        { name: "Hasta 10 productos", included: true },
        { name: "Soporte básico", included: true },
        { name: "SSL incluido", included: true },
        { name: "Dominio personalizado", included: false },
        { name: "Productos ilimitados", included: false },
        { name: "Soporte prioritario", included: false },
        { name: "Analytics avanzados", included: false }
      ]
    },
    {
      id: "pro",
      name: "Plan Basic",
      price: "$19",
      period: "por mes",
      description: "Para negocios en crecimiento",
      popular: true,
      features: [
        { name: "Dominio personalizado", included: true },
        { name: "Productos ilimitados", included: true },
        { name: "SSL incluido", included: true },
        { name: "Soporte prioritario", included: true },
        { name: "Analytics avanzados", included: true },
        { name: "Integración con redes sociales", included: true },
        { name: "Backup automático", included: true },
        { name: "Múltiples idiomas", included: true }
      ]
    },
    {
      id: "enterprise",
      name: "Plan Enterprise",
      price: "$99",
      period: "por mes",
      description: "Para empresas grandes",
      features: [
        { name: "Todo del Plan Basic", included: true },
        { name: "Múltiples dominios", included: true },
        { name: "Soporte 24/7", included: true },
        { name: "Manager dedicado", included: true },
        { name: "API personalizada", included: true },
        { name: "Integraciones custom", included: true },
        { name: "SLA garantizado", included: true },
        { name: "Onboarding personalizado", included: true }
      ]
    }
  ];

  const currentPlan = plans.find(plan => plan.current) || plans[0];

  const handleUpgrade = (planId: string) => {
    toast({
      title: "Upgrade iniciado",
      description: "Te redirigiremos al sistema de pagos...",
    });
    // Aquí iría la lógica para procesar el upgrade
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

    toast({
      title: "Dominio solicitado",
      description: `Tu dominio ${domainName} está siendo configurado. Te notificaremos cuando esté listo.`,
    });
    setIsDomainDialogOpen(false);
    setDomainName("");
  };

  const handleTransferSubmit = () => {
    if (!transferCode.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un código de transferencia válido",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Transferencia iniciada",
      description: "Tu dominio está siendo transferido. El proceso puede tomar hasta 7 días.",
    });
    setIsTransferDialogOpen(false);
    setTransferCode("");
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Header */}
      <Card className="border-2 border-primary bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Mi Plan Actual</CardTitle>
                <CardDescription>Gestiona tu suscripción y beneficios</CardDescription>
              </div>
            </div>
            <Badge variant="default" className="text-sm px-3 py-1">
              {currentPlan.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg border">
              <Globe className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold">Dominio</h3>
              <p className="text-sm text-muted-foreground">tutienda.lovable.app</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border">
              <Zap className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-semibold">Productos</h3>
              <p className="text-sm text-muted-foreground">
                {currentPlan.id === 'free' ? '3/10 productos' : 'Ilimitados'}
              </p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border">
              <Shield className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <h3 className="font-semibold">SSL</h3>
              <p className="text-sm text-muted-foreground">Certificado activo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Dominio Personalizado
            </CardTitle>
            <CardDescription>
              Conecta tu propio dominio para mayor profesionalismo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Dialog open={isDomainDialogOpen} onOpenChange={setIsDomainDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-[30px]">
                  <Globe className="w-4 h-4 mr-2" />
                  Conectar Dominio
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Conectar Dominio Personalizado</DialogTitle>
                  <DialogDescription>
                    Ingresa el dominio que quieres conectar a tu tienda (ej: mitienda.com)
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
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>• Requiere Plan Basic o superior</p>
                    <p>• Configuraremos automáticamente el SSL</p>
                    <p>• El proceso toma entre 24-48 horas</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDomainDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleDomainSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Conectar Dominio
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full rounded-[30px]">
                  <Gift className="w-4 h-4 mr-2" />
                  Transferir Dominio
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transferir Dominio Existente</DialogTitle>
                  <DialogDescription>
                    Transfiere tu dominio existente a Lovable para gestión completa
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="transfer-code">Código de Transferencia (EPP)</Label>
                    <Input
                      id="transfer-code"
                      value={transferCode}
                      onChange={(e) => setTransferCode(e.target.value)}
                      placeholder="ABC123XYZ789"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>• Obtén el código EPP de tu registrador actual</p>
                    <p>• El proceso puede tomar 5-7 días</p>
                    <p>• Incluye 1 año adicional de registro</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleTransferSubmit} className="bg-purple-600 hover:bg-purple-700 text-white">
                    Iniciar Transferencia
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUp className="w-5 h-5" />
              Mejorar Plan
            </CardTitle>
            <CardDescription>
              Accede a más funciones y capacidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-[30px]">
                  <Star className="w-4 h-4 mr-2" />
                  Ver Planes
                </Button>
              </DialogTrigger>
               <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                 <DialogHeader>
                   <DialogTitle>Planes de Membresía</DialogTitle>
                   <DialogDescription>
                     Elige el plan que mejor se adapte a tu negocio
                   </DialogDescription>
                 </DialogHeader>
                 <div className="py-6">
                   <MembershipPricing />
                 </div>
               </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Current Plan Features */}
      <Card>
        <CardHeader>
          <CardTitle>Características de tu Plan</CardTitle>
          <CardDescription>Lo que incluye tu plan actual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentPlan.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                <Check className={`w-5 h-5 ${feature.included ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className={feature.included ? '' : 'text-muted-foreground line-through'}>
                  {feature.name}
                </span>
                {!feature.included && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    Pro+
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};