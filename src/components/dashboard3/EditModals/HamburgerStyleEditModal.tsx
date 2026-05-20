import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { HamburgerButton, HamburgerVariant } from "@/components/ui/HamburgerButton";

interface HamburgerStyleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVariant?: HamburgerVariant;
  onSave: (variant: HamburgerVariant) => void;
}

const VARIANTS: { id: HamburgerVariant; label: string; description: string }[] = [
  { id: 'classic', label: 'Clásica', description: 'Tres líneas → X' },
  { id: 'dots', label: 'Puntos', description: 'Tres puntos → X' },
  { id: 'plus', label: 'Plus', description: '+ rota a X' },
  { id: 'grid', label: 'Cuadrícula', description: '4 cuadros → X' },
];

export const HamburgerStyleEditModal = ({
  isOpen,
  onClose,
  initialVariant = 'classic',
  onSave,
}: HamburgerStyleEditModalProps) => {
  const [selected, setSelected] = useState<HamburgerVariant>(initialVariant);
  // Each variant card animates between open/closed so the user previews the
  // effect on hover/focus without having to actually toggle anything.
  const [hoverOpen, setHoverOpen] = useState<Record<HamburgerVariant, boolean>>({
    classic: false, dots: false, plus: false, grid: false,
  });

  useEffect(() => {
    if (!isOpen) return;
    setSelected(initialVariant);
  }, [isOpen, initialVariant]);

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Estilo del botón hamburguesa</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          {VARIANTS.map((v) => {
            const isSelected = selected === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelected(v.id)}
                onMouseEnter={() => setHoverOpen((s) => ({ ...s, [v.id]: true }))}
                onMouseLeave={() => setHoverOpen((s) => ({ ...s, [v.id]: false }))}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-md border-2 transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
              >
                <div className="flex items-center justify-center w-12 h-12">
                  <HamburgerButton
                    isOpen={hoverOpen[v.id]}
                    onClick={() => {}}
                    variant={v.id}
                    size={28}
                  />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold">{v.label}</div>
                  <div className="text-[10px] text-muted-foreground">{v.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Pasa el mouse sobre cada opción para ver la animación.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
