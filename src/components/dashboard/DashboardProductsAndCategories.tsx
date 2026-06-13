import { useState, useEffect } from "react";
import { DashboardCategories } from "./DashboardCategories";
import { DashboardProducts } from "./DashboardProducts";
import { VariablesTab } from "./VariablesTab";
import { ProductsTutorialModal } from "./ProductsTutorialModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lightbulb, X } from "lucide-react";

const INTRO_DISMISSED_KEY = "products-section-intro-dismissed";

interface DashboardProductsAndCategoriesProps {
  onNavigateToUpgrade?: () => void;
}

/**
 * "Mis Productos" section. The old Categorías/Productos/Variables sub-tabs were
 * collapsed into a single products list: categories and variables are support
 * tools, so they now open as modals from buttons next to "Nuevo Producto"
 * (they can also still be created inline from the product form).
 */
export const DashboardProductsAndCategories = ({
  onNavigateToUpgrade,
}: DashboardProductsAndCategoriesProps) => {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [showCategoryTutorial, setShowCategoryTutorial] = useState(false);
  const [showVariablesTutorial, setShowVariablesTutorial] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  // First-visit intro popup (dismissable for good)
  useEffect(() => {
    if (!localStorage.getItem(INTRO_DISMISSED_KEY)) {
      setShowIntro(true);
    }
  }, []);

  const dismissIntroForever = () => {
    localStorage.setItem(INTRO_DISMISSED_KEY, "true");
    setShowIntro(false);
  };

  // Onboarding still dispatches this event ('categories' | 'products' | 'variables');
  // categories/variables now open their modal, products is already the main view.
  useEffect(() => {
    const handleSetSubTab = (event: CustomEvent) => {
      const subTab = event.detail as string;
      if (subTab === "categories") setCategoriesOpen(true);
      if (subTab === "variables") setVariablesOpen(true);
    };
    window.addEventListener("setProductSubTab", handleSetSubTab as EventListener);
    return () => {
      window.removeEventListener("setProductSubTab", handleSetSubTab as EventListener);
    };
  }, []);

  return (
    <div className="space-y-6">
      <DashboardProducts
        onNavigateToCategories={() => setCategoriesOpen(true)}
        onNavigateToVariables={() => setVariablesOpen(true)}
        onNavigateToUpgrade={onNavigateToUpgrade}
        onCategoriesHelp={() => setShowCategoryTutorial(true)}
        onVariablesHelp={() => setShowVariablesTutorial(true)}
      />

      {/* Categories manager modal */}
      <Dialog open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle>Mis Categorías</DialogTitle>
            <DialogClose className="absolute right-0 top-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity">
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </DialogClose>
          </DialogHeader>
          <DashboardCategories />
        </DialogContent>
      </Dialog>

      {/* Variables manager modal */}
      <Dialog open={variablesOpen} onOpenChange={setVariablesOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle>Mis Variables</DialogTitle>
            <DialogClose className="absolute right-0 top-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity">
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </DialogClose>
          </DialogHeader>
          <VariablesTab />
        </DialogContent>
      </Dialog>

      {/* "?" tutorials (reuse the existing step content) */}
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

      {/* First-visit intro */}
      <Dialog open={showIntro} onOpenChange={(open) => { if (!open) setShowIntro(false); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-purple-600" />
              Todo en un solo lugar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Aquí está tu <strong className="text-foreground">catálogo de productos</strong>. Para empezar solo
              necesitas el botón <strong className="text-foreground">"Nuevo Producto"</strong>.
            </p>
            <p>
              ¿Y las categorías o variables (tallas, colores…)? Las puedes crear
              <strong className="text-foreground"> mientras creas tu producto</strong>, o gestionarlas cuando quieras
              con los botones <strong className="text-foreground">"Categorías"</strong> y
              <strong className="text-foreground"> "Variables"</strong> de arriba.
            </p>
            <p className="text-xs">
              Si tienes dudas, toca el símbolo <strong className="text-foreground">?</strong> junto a cada botón.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={dismissIntroForever}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-[30px]"
            >
              ¡Entendido, no volver a mostrar!
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowIntro(false)}
              className="flex-1 rounded-[30px]"
            >
              Cerrar por ahora
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
