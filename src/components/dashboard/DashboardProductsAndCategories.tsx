import { useState, useEffect } from "react";
import { DashboardCategories } from "./DashboardCategories";
import { DashboardProducts } from "./DashboardProducts";
import { VariablesTab } from "./VariablesTab";
import { ProductsTutorialModal } from "./ProductsTutorialModal";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Package, Settings, Tag, HelpCircle } from "lucide-react";

type ProductSection = "products" | "variables" | "categories";

interface DashboardProductsAndCategoriesProps {
  activeSubTab?: ProductSection;
  onSubTabChange?: (tab: ProductSection) => void;
  onNavigateToUpgrade?: () => void;
}

export const DashboardProductsAndCategories = ({ 
  activeSubTab = "categories", 
  onSubTabChange,
  onNavigateToUpgrade
}: DashboardProductsAndCategoriesProps) => {
  const [currentTab, setCurrentTab] = useState<ProductSection>(activeSubTab);
  const [showCategoryTutorial, setShowCategoryTutorial] = useState(false);
  const [showVariablesTutorial, setShowVariablesTutorial] = useState(false);
  const [showProductsTutorial, setShowProductsTutorial] = useState(false);

  const handleTabChange = (tab: ProductSection) => {
    setCurrentTab(tab);
    onSubTabChange?.(tab);
  };

  const handleOpenTutorial = (section: ProductSection) => {
    switch(section) {
      case 'categories':
        setShowCategoryTutorial(true);
        break;
      case 'variables':
        setShowVariablesTutorial(true);
        break;
      case 'products':
        setShowProductsTutorial(true);
        break;
    }
  };

  // Listen for custom events to change sub-tabs from onboarding
  useEffect(() => {
    const handleSetSubTab = (event: CustomEvent) => {
      const subTab = event.detail as ProductSection;
      handleTabChange(subTab);
    };

    window.addEventListener('setProductSubTab', handleSetSubTab as EventListener);
    return () => {
      window.removeEventListener('setProductSubTab', handleSetSubTab as EventListener);
    };
  }, []);

  const productSubItems = [
    { id: "categories" as const, icon: Tag, label: "Categorías" },
    { id: "variables" as const, icon: Settings, label: "Variables" },
    { id: "products" as const, icon: Package, label: "Mis Productos" },
  ];

  return (
    <div className="space-y-6">
      {/* Products Sub-menu with same style as profile */}
      <div className="relative mb-8">
        {/* Sub-menu container */}
        <div className="bg-purple-50 border border-purple-200 rounded-[30px] p-2 sm:p-3 shadow-sm">
          {/* Scrollable wrapper for mobile */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1 justify-start sm:justify-center min-w-max px-1">
              {productSubItems.map((item) => (
                <div key={item.id} className="relative inline-block flex-shrink-0">
                  <Button
                    variant={currentTab === item.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleTabChange(item.id)}
                    className={`text-xs sm:text-sm rounded-[30px] pr-3 sm:pr-8 whitespace-nowrap ${
                      currentTab === item.id 
                        ? "bg-purple-600 text-white hover:bg-purple-700" 
                        : "text-purple-700 hover:bg-purple-100"
                    }`}
                  >
                    <item.icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    {item.label}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenTutorial(item.id);
                    }}
                    className={`hidden sm:inline-flex absolute right-0.5 sm:right-1 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 p-0 rounded-full ${
                      currentTab === item.id 
                        ? "hover:bg-white/20 text-white" 
                        : "hover:bg-purple-200 text-purple-600"
                    }`}
                    title={`Ver tutorial de ${item.label}`}
                  >
                    <HelpCircle className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={(value) => handleTabChange(value as ProductSection)}>
        <TabsContent value="categories" className="mt-6">
          <DashboardCategories />
        </TabsContent>
        
        <TabsContent value="products" className="mt-6">
          <DashboardProducts 
            onNavigateToCategories={() => handleTabChange("categories")}
            onNavigateToVariables={() => handleTabChange("variables")}
            onNavigateToUpgrade={onNavigateToUpgrade}
          />
        </TabsContent>
        
        <TabsContent value="variables" className="mt-6">
          <VariablesTab />
        </TabsContent>
      </Tabs>

      <ProductsTutorialModal 
        isOpen={showCategoryTutorial}
        onClose={() => setShowCategoryTutorial(false)}
        step={1}
      />
      <ProductsTutorialModal 
        isOpen={showVariablesTutorial}
        onClose={() => setShowVariablesTutorial(false)}
        step={2}
      />
      <ProductsTutorialModal 
        isOpen={showProductsTutorial}
        onClose={() => setShowProductsTutorial(false)}
        step={3}
      />
    </div>
  );
};