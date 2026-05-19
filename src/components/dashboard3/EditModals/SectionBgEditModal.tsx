import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface SectionBgEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionLabel: string;
  sectionKey: string;
  initialBgColor?: string;
  onSave: (sectionKey: string, bgColor: string | null) => void;
}

export const SectionBgEditModal = ({
  isOpen,
  onClose,
  sectionLabel,
  sectionKey,
  initialBgColor,
  onSave,
}: SectionBgEditModalProps) => {
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  const [useDefault, setUseDefault] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    if (initialBgColor) {
      setBgColor(initialBgColor);
      setUseDefault(false);
    } else {
      setBgColor("#ffffff");
      setUseDefault(true);
    }
  }, [isOpen, initialBgColor]);

  const handleSave = () => {
    onSave(sectionKey, useDefault ? null : bgColor);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Fondo de {sectionLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="section-bg">Color del fondo</Label>
            <div className="flex items-center gap-2">
              <input
                id="section-bg"
                type="color"
                value={bgColor}
                onChange={(e) => { setBgColor(e.target.value); setUseDefault(false); }}
                className="h-10 w-14 rounded border cursor-pointer"
              />
              <Input
                value={bgColor}
                onChange={(e) => { setBgColor(e.target.value); setUseDefault(false); }}
                placeholder="#ffffff"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setUseDefault(true)}
            className={`text-xs ${useDefault ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'} underline`}
          >
            {useDefault ? '✓ Usar color por defecto' : 'Usar color por defecto'}
          </button>

          <div
            className="rounded-md border p-6 text-center text-xs"
            style={{ backgroundColor: useDefault ? 'transparent' : bgColor, backgroundImage: useDefault ? 'repeating-linear-gradient(45deg, #f0f0f0, #f0f0f0 6px, #fff 6px, #fff 12px)' : undefined }}
          >
            {useDefault ? 'Sin fondo personalizado' : 'Vista previa'}
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
