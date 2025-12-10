import { useState, useEffect } from "react";
import { useTenantAuth } from "@/hooks/useTenantAuth";
import { useTenantContext } from "@/contexts/TenantContext";
import DashboardOnboarding from "@/components/dashboard/DashboardOnboarding";
import { ChatBotContainer } from "@/components/ChatBotContainer";
import { useTenantUrl } from "@/hooks/useTenantUrl";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { DashboardProductsAndCategories } from "@/components/dashboard/DashboardProductsAndCategories";
import { DashboardPayments } from "@/components/dashboard/DashboardPayments";
import { DashboardAnalytics } from "@/components/dashboard/DashboardAnalytics";
import { DashboardVisualEditor } from "@/components/dashboard3/DashboardVisualEditor";
import { DashboardMiPerfil } from "@/components/dashboard/DashboardMiPerfil";
import { DashboardSocial } from "@/components/dashboard/DashboardSocial";
import { DashboardOrders } from "@/components/dashboard/DashboardOrders";
import DashboardShipping from "@/components/dashboard/DashboardShipping";
import { Home, Store, Package, CreditCard, Globe, BarChart3, LogOut, ExternalLink, Brush, User, ChevronDown, ShoppingCart, Truck, Tag, Users, Share2, Shield, MessageSquare } from "lucide-react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenantSelector } from "@/components/dashboard/TenantSelector";
import { supabase } from "@/integrations/supabase/client";
import { useFavicon } from "@/hooks/useFavicon";
type DashboardSection = "resumen" | "productos" | "ordenes" | "pagos" | "envios" | "analytics" | "editor-visual" | "compartir" | "mi-perfil";
const Dashboard3 = () => {
  const {
    isAuthenticated,
    isLoading,
    user,
    tenant
  } = useTenantAuth();
  const {
    tenantUrl
  } = useTenantUrl();
  const {
    isSuperAdmin,
    currentTenantId,
    setCurrentTenantId,
    isLoading: tenantLoading
  } = useTenantContext();
  const navigate = useNavigate();
  const { progress } = useOnboardingProgress();
  const [completedSteps, setCompletedSteps] = useState(0);
  const [hideOnboarding, setHideOnboarding] = useState(false);
  const [profileSubTab, setProfileSubTab] = useState<"mis-datos" | "usuarios" | "mi-plan" | "cupones" | "whatsapp-bot" | "legal">("mis-datos");
  const [logoUrl, setLogoUrl] = useState<string>('');

  // Determine if onboarding is complete (only when user clicks "Ver Tienda")
  const isOnboardingComplete = progress?.step_5_confirmed || false;

  // Set initial active tab based on onboarding status
  const getInitialTab = (): DashboardSection => {
    return isOnboardingComplete ? "mi-perfil" : "resumen";
  };
  const [activeTab, setActiveTab] = useState<DashboardSection>(getInitialTab());

  // Auto-redirect and hide onboarding when complete
  useEffect(() => {
    if (isOnboardingComplete) {
      setHideOnboarding(true);
      if (activeTab === "resumen") {
        setActiveTab("mi-perfil");
      }
    }
  }, [isOnboardingComplete, activeTab]);

  // Load tenant logo
  useEffect(() => {
    if (tenant?.id) {
      supabase.from('tenant_settings').select('logo_url').eq('tenant_id', tenant.id).single().then(({
        data
      }) => {
        if (data?.logo_url) setLogoUrl(data.logo_url);
      });
    }
  }, [tenant?.id]);

  // Set favicon for Basic/Premium plans
  useFavicon({
    logoUrl,
    plan: tenant?.plan
  });

  // Simple authentication guard using useTenantAuth
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('User not authenticated for this tenant, redirecting to auth');
      navigate('/auth?reason=unauthorized', {
        replace: true
      });
    } else if (!isLoading && isAuthenticated && tenant) {
      console.log('User authenticated for tenant:', tenant.name);
      // Set the current tenant ID to match the domain
      if (currentTenantId !== tenant.id) {
        setCurrentTenantId(tenant.id);
      }
    }
  }, [isAuthenticated, isLoading, tenant, currentTenantId, setCurrentTenantId, navigate]);

  // Show loading state
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">Cargando dashboard...</p>
      </div>
    </div>;
  }

  // Show auth redirect if not authenticated for this tenant
  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">Redirigiendo a autenticación...</p>
      </div>
    </div>;
  }

  // Generate tabs based on onboarding status
  const getVisibleTabItems = () => {
    const allTabs = [{
      id: "resumen" as const,
      icon: Home,
      label: "Configuración"
    }, {
      id: "editor-visual" as const,
      icon: Brush,
      label: "Editor Visual"
    }, {
      id: "compartir" as const,
      icon: Share2,
      label: "Compartir"
    }, {
      id: "productos" as const,
      icon: Package,
      label: "Mis Productos"
    }, {
      id: "ordenes" as const,
      icon: ShoppingCart,
      label: "Órdenes"
    }, {
      id: "pagos" as const,
      icon: CreditCard,
      label: "Pagos"
    }, {
      id: "envios" as const,
      icon: Truck,
      label: "Envíos"
    }, {
      id: "analytics" as const,
      icon: BarChart3,
      label: "Analytics"
    }, {
      id: "mi-perfil" as const,
      icon: User,
      label: "Mi Perfil"
    }];
    if (isOnboardingComplete) {
      // Remove "resumen" and put "mi-perfil" first
      const tabsWithoutResumen = allTabs.filter(tab => tab.id !== "resumen");
      const miPerfilTab = tabsWithoutResumen.find(tab => tab.id === "mi-perfil");
      const otherTabs = tabsWithoutResumen.filter(tab => tab.id !== "mi-perfil");
      return miPerfilTab ? [miPerfilTab, ...otherTabs] : tabsWithoutResumen;
    }
    return allTabs;
  };
  const tabItems = getVisibleTabItems();
  const profileSubItems = [{
    id: "mis-datos" as const,
    icon: User,
    label: "Mis Datos"
  }, {
    id: "usuarios" as const,
    icon: Users,
    label: "Usuarios"
  }, {
    id: "mi-plan" as const,
    icon: CreditCard,
    label: "Mi Plan"
  }, {
    id: "cupones" as const,
    icon: Tag,
    label: "Cupones"
  }, {
    id: "whatsapp-bot" as const,
    icon: MessageSquare,
    label: "WhatsApp Bot"
  }, {
    id: "legal" as const,
    icon: Shield,
    label: "Legal"
  }];
  return <div className="min-h-screen bg-background">
    {/* Header */}
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-4">
          <h1 className="text-base md:text-lg font-semibold">Dashboard</h1>
          <TenantSelector />
          <span className="hidden md:inline text-sm text-muted-foreground">{user.email}</span>
        </div>


        <div className="flex items-center gap-2 md:gap-4">
          <Button asChild variant="ghost" className="text-black hover:bg-gray-100 rounded-[30px] text-xs md:text-sm" disabled={!tenantUrl}>
            <a href={tenantUrl || '#'} target="_blank" rel="noopener noreferrer" className={!tenantUrl ? 'pointer-events-none opacity-50' : ''}>
              <ExternalLink className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Ver Tienda</span>
              <span className="md:hidden">Ver tienda</span>
            </a>
          </Button>

          {isSuperAdmin && (
            <Button asChild variant="secondary" className="rounded-[30px] text-xs md:text-sm">
              <Link to="/admin">
                <Shield className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Admin</span>
                <span className="md:hidden">Admin</span>
              </Link>
            </Button>
          )}

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <Button variant="ghost" onClick={() => {
              supabase.auth.signOut();
              navigate('/auth', {
                replace: true
              });
            }} className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs md:text-sm">
              <LogOut className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Cerrar Sesión</span>
              <span className="md:hidden">Salir</span>
            </Button>
          </div>
        </div>
      </div>
    </header>


    {/* Main Content */}
    <main className="w-full md:w-[80%] mx-auto px-4 md:px-6 py-4 md:py-6">
      {/* Onboarding Header - appears above tabs when steps are incomplete */}
      {!hideOnboarding && completedSteps < 5 && <div className="bg-[#F5F0FA] py-3 w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mb-6">
        <div className="w-full md:w-[80%] mx-auto flex items-center justify-between px-2 md:px-0">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-medium text-xs md:text-sm">?</span>
            </div>
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <h1 className="text-sm md:text-xl font-semibold truncate">
                Configuración inicial ({completedSteps}/5)
              </h1>
              <div className="w-16 md:w-32 h-2 bg-white rounded-full overflow-hidden flex-shrink-0">
                <div className="h-full bg-purple-600 transition-all duration-300 ease-out" style={{
                  width: `${completedSteps / 5 * 100}%`
                }} />
              </div>
            </div>
          </div>
          <Button variant="ghost" className="text-black hover:bg-gray-100 rounded-[30px] text-xs md:text-sm px-2 md:px-4" onClick={() => setHideOnboarding(true)}>
            Ocultar
          </Button>
        </div>
      </div>}

      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as DashboardSection)}>
        {/* Tab Navigation */}
        <div className="relative">
          <TabsList className={`grid w-full ${isOnboardingComplete ? 'grid-cols-8' : 'grid-cols-9'} mb-4 bg-gray-100 p-2 rounded-[30px] h-auto gap-1`}>
            {tabItems.map(tab => <TabsTrigger key={tab.id} value={tab.id} className="flex items-center justify-center rounded-[25px] px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700 transition-all duration-200">
              <tab.icon className="w-4 h-4 md:w-4 md:h-4 flex-shrink-0" />
              <span className="hidden lg:inline md:ml-2">{tab.label}</span>
            </TabsTrigger>)}
          </TabsList>

          {/* Triangle indicator for "Mis Productos" tab */}
          {activeTab === "productos" && <div className={`absolute -bottom-2 transform -translate-x-1/2 ${isOnboardingComplete ? 'left-[42.86%]' // 3rd position out of 7 tabs (42.86%)
            : 'left-[37.5%]' // 3rd position out of 8 tabs (37.5%)
            }`}>
            <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-purple-600"></div>
          </div>}
        </div>

        {/* Profile Sub-menu - appears below main tabs when Mi Perfil is active */}
        {activeTab === "mi-perfil" && <div className="relative mb-8">
          {/* Visual indicator pointing to Mi Perfil tab */}
          <div className="absolute -top-2 right-[8.33%] transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-purple-600"></div>
          </div>

          {/* Sub-menu container */}
          <div className="bg-purple-50 border border-purple-200 rounded-[30px] p-3 shadow-sm">
            <div className="flex items-center gap-1 justify-center">
              {profileSubItems.map(item => <Button key={item.id} variant={profileSubTab === item.id ? "default" : "ghost"} size="sm" onClick={() => setProfileSubTab(item.id)} className={`text-xs md:text-sm rounded-[30px] ${profileSubTab === item.id ? "bg-purple-600 text-white hover:bg-purple-700" : "text-purple-700 hover:bg-purple-100"}`}>
                <item.icon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                {item.label}
              </Button>)}
            </div>
          </div>
        </div>}

        {/* Tab Contents */}
        {!isOnboardingComplete && <TabsContent value="resumen">
          <DashboardOnboarding onTabChange={tab => setActiveTab(tab as DashboardSection)} onProgressChange={(completed, total) => setCompletedSteps(completed)} />
        </TabsContent>}

        <TabsContent value="productos">
          <DashboardProductsAndCategories onNavigateToUpgrade={() => {
            setActiveTab("mi-perfil");
            setProfileSubTab("mi-plan");
          }} />
        </TabsContent>

        <TabsContent value="ordenes">
          <DashboardOrders />
        </TabsContent>

        <TabsContent value="editor-visual">
          <DashboardVisualEditor />
        </TabsContent>

        <TabsContent value="compartir">
          <DashboardSocial />
        </TabsContent>

        <TabsContent value="pagos">
          <DashboardPayments />
        </TabsContent>

        <TabsContent value="envios">
          <DashboardShipping />
        </TabsContent>

        <TabsContent value="analytics">
          <DashboardAnalytics />
        </TabsContent>

        <TabsContent value="mi-perfil">
          <DashboardMiPerfil activeSubTab={profileSubTab} onSubTabChange={setProfileSubTab} />
        </TabsContent>
      </Tabs>
    </main>
    <ChatBotContainer />
  </div>;
};
export default Dashboard3;