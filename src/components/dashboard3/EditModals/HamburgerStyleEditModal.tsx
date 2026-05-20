import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  initialSize?: number;
  onSave: (variant: HamburgerVariant, size: number) => void;
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
  initialSize = 24,
  onSave,
}: HamburgerStyleEditModalProps) => {
  const [selected, setSelected] = useState<HamburgerVariant>(initialVariant);
  const [size, setSize] = useState<number>(initialSize);
  // Each variant card animates between open/closed so the user previews the
  // effect on hover/focus without having to actually toggle anything.
  const [hoverOpen, setHoverOpen] = useState<Record<HamburgerVariant, boolean>>({
    classic: false, dots: false, plus: false, grid: false,
  });

  useEffect(() => {
    if (!isOpen) return;
    setSelected(initialVariant);
    setSize(initialSize);
  }, [isOpen, initialVariant, initialSize]);

  const handleSave = () => {
    onSave(selected, size);
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

        <div className="space-y-2 pt-3 border-t">
          <div className="flex items-center justify-between">
            <Label>Tamaño</Label>
            <span className="text-xs text-muted-foreground">{size}px</span>
          </div>
          <Slider
            value={[size]}
            onValueChange={(v) => setSize(v[0])}
            min={18}
            max={48}
            step={1}
          />
          <div className="flex items-center justify-center pt-2">
            <HamburgerButton isOpen={false} onClick={() => {}} variant={selected} size={size} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
