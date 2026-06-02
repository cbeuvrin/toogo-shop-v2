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
import { HamburgerButton } from "@/components/ui/HamburgerButton";

interface HamburgerStyleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCount?: number;
  initialThickness?: number;
  initialSize?: number;
  onSave: (count: number, thickness: number, size: number) => void;
}

export const HamburgerStyleEditModal = ({
  isOpen,
  onClose,
  initialCount = 3,
  initialThickness = 2,
  initialSize = 24,
  onSave,
}: HamburgerStyleEditModalProps) => {
  const [count, setCount] = useState<number>(initialCount);
  const [thickness, setThickness] = useState<number>(initialThickness);
  const [size, setSize] = useState<number>(initialSize);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCount(initialCount);
    setThickness(initialThickness);
    setSize(initialSize);
    setPreviewOpen(false);
  }, [isOpen, initialCount, initialThickness, initialSize]);

  const handleSave = () => {
    onSave(count, thickness, size);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Estilo del botón hamburguesa</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Live preview — click to toggle open/close so the animation is visible */}
          <div className="flex flex-col items-center justify-center gap-2 p-6 border rounded-md bg-muted/30">
            <HamburgerButton
              isOpen={previewOpen}
              onClick={() => setPreviewOpen(!previewOpen)}
              count={count}
              thickness={thickness}
              size={size}
            />
            <p className="text-[11px] text-muted-foreground">Click para ver la animación de apertura / cierre.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Cantidad de líneas</Label>
              <span className="text-xs text-muted-foreground">{count}</span>
            </div>
            <Slider value={[count]} onValueChange={(v) => setCount(v[0])} min={2} max={5} step={1} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Grosor de línea</Label>
              <span className="text-xs text-muted-foreground">{thickness}px</span>
            </div>
            <Slider value={[thickness]} onValueChange={(v) => setThickness(v[0])} min={1} max={5} step={1} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tamaño total</Label>
              <span className="text-xs text-muted-foreground">{size}px</span>
            </div>
            <Slider value={[size]} onValueChange={(v) => setSize(v[0])} min={18} max={48} step={1} />
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
