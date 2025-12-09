import { useEffect, useState } from "react";
import mascotOjos from "@/assets/mascot-ojos.png";
import { useTenantUrl } from "@/hooks/useTenantUrl";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useOnboardingInteraction } from "@/hooks/useOnboardingInteraction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Store, 
  Package, 
  CreditCard, 
  Globe,
  Eye,
  TrendingUp,
  Check,
  Palette
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  icon: any;
  action?: () => void;
}

interface DashboardOnboardingProps {
  onTabChange?: (tab: string) => void;
  onProgressChange?: (completed: number, total: number) => void;
}

interface StoreStats {
  products: number;
  visitsToday: number;
  status: 'draft' | 'published';
  domain: string;
}

const DashboardOnboarding = ({ onTabChange, onProgressChange }: DashboardOnboardingProps) => {
  const { tenantUrl } = useTenantUrl();
  const { progress, stats, loading, error, refreshProgress } = useOnboardingProgress();
  const { markPublishConfirmed } = useOnboardingInteraction();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);

  // Create steps based on real progress data
  useEffect(() => {
    if (!progress) return;

    const onboardingSteps: OnboardingStep[] = [
      {
        id: 'customize',
        title: 'Personalizar tienda',
        description: 'Sube tu logo y configura los colores de tu marca',
        completed: progress.step_1_logo,
        icon: Palette,
        action: () => onTabChange?.('editor-visual')
      },
      {
        id: 'category',
        title: 'Crear categoría',
        description: 'Organiza tus productos en categorías',
        completed: progress.step_2_products,
        icon: Package,
        action: () => {
          onTabChange?.('productos');
          // After navigation, set the categories sub-tab
          setTimeout(() => {
            const event = new CustomEvent('setProductSubTab', { detail: 'categories' });
            window.dispatchEvent(event);
          }, 100);
        }
      },
      {
        id: 'product',
        title: 'Crear producto',
        description: 'Agrega tu primer producto a la tienda',
        completed: progress.step_3_branding,
        icon: Store,
        action: () => {
          onTabChange?.('productos');
          // After navigation, set the products sub-tab
          setTimeout(() => {
            const event = new CustomEvent('setProductSubTab', { detail: 'products' });
            window.dispatchEvent(event);
          }, 100);
        }
      },
      {
        id: 'payments',
        title: 'Configurar pagos',
        description: 'Elige cómo recibir pagos',
        completed: progress.step_4_payments,
        icon: CreditCard,
        action: () => onTabChange?.('pagos')
      },
      {
        id: 'publish',
        title: 'Publicar tienda',
        description: 'Haz tu tienda visible al público',
        completed: progress.step_5_publish,
        icon: Globe,
        action: async () => {
          console.log('Ver Tienda clicked, marking as confirmed...');
          const success = await markPublishConfirmed();
          if (success) {
            console.log('Successfully marked as confirmed, refreshing progress...');
            await refreshProgress();
            if (tenantUrl) {
              console.log('Opening store URL:', tenantUrl);
              window.open(tenantUrl, '_blank');
            }
          } else {
            console.error('Failed to mark as confirmed');
          }
        }
      }
    ];

    setSteps(onboardingSteps);
  }, [progress, onTabChange, tenantUrl, markPublishConfirmed, refreshProgress]);

  // Notify parent about progress changes
  useEffect(() => {
    if (progress) {
      onProgressChange?.(progress.total_progress, 5);
    }
  }, [progress, onProgressChange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Error cargando datos de configuración</p>
      </div>
    );
  }

  const completedSteps = progress?.total_progress || 0;
  const totalSteps = 5;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className="w-full mx-auto space-y-8">
      {/* Main Configuration Card */}
      <Card className="rounded-[30px] bg-[#F5F0FA] w-full">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm">
                <img src={mascotOjos} alt="Mascot" className="w-12 h-12 object-contain" />
              </div>
              <div>
                <CardTitle className="text-[15px] md:text-[20px]">Configuración inicial de tu tienda</CardTitle>
                <p className="text-[12px] md:text-[15px] text-muted-foreground">
                  Completa estos pasos para tener tu tienda lista para vender
                </p>
              </div>
            </div>
          </div>
          
          <Progress value={progressPercentage} className="w-full bg-white" />
          
          <div className="flex justify-end">
            <Badge variant="secondary" className="text-[12px] md:text-sm">
              {completedSteps}/{totalSteps} completados
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 p-4 md:p-6">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 rounded-[30px] transition-all duration-200 gap-4 ${
                step.completed 
                  ? 'bg-green-100 border border-green-200' 
                  : 'bg-gray-50 border border-gray-200 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {step.completed ? (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 md:w-6 md:h-6 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white font-bold text-sm md:text-base">{index + 1}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-base md:text-lg ${step.completed ? 'text-green-800' : 'text-gray-900'}`}>
                    {step.title}
                  </h3>
                  <p className={`text-sm ${step.completed ? 'text-green-700' : 'text-gray-600'}`}>
                    {step.description}
                  </p>
                </div>
              </div>
              
              <div className="flex-shrink-0 w-full md:w-auto">
                {!step.completed && step.id !== 'publish' && (
                  <Button 
                    size="lg" 
                    onClick={step.action}
                    className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white rounded-[30px] px-6 md:px-8 py-3 font-semibold text-sm md:text-base"
                  >
                    Completar
                  </Button>
                )}
                
                {step.completed && step.action && step.id !== 'publish' && (
                  <Button 
                    size="lg" 
                    onClick={step.action}
                    className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white rounded-[30px] px-4 md:px-6 py-3 text-sm md:text-base font-semibold"
                  >
                    Ver
                  </Button>
                )}
                
                {step.id === 'publish' && !step.completed && (
                  <Button 
                    size="lg" 
                    disabled
                    className="w-full md:w-auto bg-gray-300 text-gray-500 rounded-[30px] px-6 md:px-8 py-3 cursor-not-allowed text-sm md:text-base"
                  >
                    Pendiente
                  </Button>
                )}
                
                {step.id === 'publish' && step.completed && (
                  <Button 
                    size="lg" 
                    onClick={step.action}
                    className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white rounded-[30px] px-6 md:px-8 py-3 font-semibold text-sm md:text-base"
                  >
                    Ver Tienda
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{stats.products}</div>
            <p className="text-sm text-muted-foreground">Productos</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <Package className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{stats.categories}</div>
            <p className="text-sm text-muted-foreground">Categorías</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold capitalize">{stats.canPublish ? 'Lista' : 'En progreso'}</div>
            <p className="text-sm text-muted-foreground">Estado</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <Globe className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">Subdominio</div>
            <p className="text-sm text-muted-foreground">Dominio</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOnboarding;