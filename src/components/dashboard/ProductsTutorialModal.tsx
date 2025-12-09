import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tag, Settings, Package } from "lucide-react";
interface ProductsTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: 1 | 2 | 3;
}
const steps = [{
  step: 1,
  emoji: "🏷️",
  title: "1. Primero, ¡vamos a ordenar la casa!",
  icon: Tag,
  content: "Imagina que tu tienda es un supermercado. No pondrías la leche junto a los calcetines, ¿verdad? Las categorías son como los pasillos de tu tienda. Creas pasillos como 'Playeras', 'Pantalones' o 'Tazas' para que tus clientes no se pierdan y encuentren todo fácil y rápido. ¡Es el primer paso para que tu tienda se vea profesional!"
}, {
  step: 2,
  emoji: "🎨",
  title: "2. ¿Tu producto viene en varios tipos? (Opcional)",
  icon: Settings,
  content: "Piensa en una playera. La puedes tener en talla Chica, Mediana o Grande, y en color Rojo, Azul o Verde. Esas son las variaciones. Aquí es donde creas esas opciones. ¿Por qué hacerlo ahora? Para que luego no tengas que escribirlas una y otra vez con cada producto. Si tus productos son únicos (como un cuadro), ¡simplemente sáltate este paso!"
}, {
  step: 3,
  emoji: "📦",
  title: "3. Ahora sí, ¡a llenar la tienda!",
  icon: Package,
  content: "¡Esta es la parte divertida! Ahora vas a tomar cada uno de tus productos y a 'ponerlos en su estante'. Sube una foto bonita, ponle su nombre, su precio y una buena descripción. Luego, solo le dices en qué 'pasillo' (categoría) va y qué 'opciones' (tallas, colores) tiene. ¡Y listo! Tu producto ya está a la venta para que todo el mundo lo vea."
}];
export const ProductsTutorialModal = ({
  isOpen,
  onClose,
  step
}: ProductsTutorialModalProps) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const currentStepData = steps[step - 1];
  const Icon = currentStepData.icon;
  
  const localStorageKeys = {
    1: 'categories-tutorial-dismissed',
    2: 'variables-tutorial-dismissed',
    3: 'products-tutorial-dismissed'
  };
  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(localStorageKeys[step], 'true');
    }
    setDontShowAgain(false);
    onClose();
  };
  const handleDontShowAgainChange = (checked: boolean) => {
    setDontShowAgain(checked);
  };
  return <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[90vw] sm:max-w-[500px] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-2xl font-bold text-purple-600">
            Pasos para subir tus productos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          {/* Content */}
          <div className="space-y-4 text-center">
            {/* Icon */}
            <div className="flex justify-center">
              <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-purple-600" />
            </div>

            {/* Title */}
            <h3 className="text-base sm:text-xl font-semibold text-foreground">
              {currentStepData.title}
            </h3>

            {/* Content */}
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed px-2 sm:px-4">
              {currentStepData.content}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-4">
          {/* Don't show again checkbox */}
          <div className="flex items-center space-x-2 mr-auto">
            <Checkbox id="dontShowAgain" checked={dontShowAgain} onCheckedChange={handleDontShowAgainChange} />
            <label htmlFor="dontShowAgain" className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
              No ver de nuevo
            </label>
          </div>

          {/* Action button */}
          <Button onClick={handleClose} className="gap-2 bg-purple-600 hover:bg-purple-700 text-sm w-full sm:w-auto">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
};