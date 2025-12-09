import { useState, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import { ProductVariablesManager } from './ProductVariablesManager';
import { ProductsTutorialModal } from "./ProductsTutorialModal";
import { Button } from "@/components/ui/button";

export const VariablesTab = () => {
  const [showVariablesTutorial, setShowVariablesTutorial] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('variables-tutorial-dismissed');
    if (!dismissed) {
      setShowVariablesTutorial(true);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Variables de Producto</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowVariablesTutorial(true)}
            className="text-purple-600 hover:bg-purple-100 rounded-full w-8 h-8 p-0"
            title="Ver tutorial de variables"
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-muted-foreground">
          Gestiona las variables personalizables de tus productos como tallas, colores, materiales, etc.
        </p>
      </div>
      
      <ProductVariablesManager showSelection={false} />

      <ProductsTutorialModal 
        isOpen={showVariablesTutorial}
        onClose={() => setShowVariablesTutorial(false)}
        step={2}
      />
    </div>
  );
};