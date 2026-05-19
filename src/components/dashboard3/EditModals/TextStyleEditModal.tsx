import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Generic per-element text editor used by Indico's hero so each element
 * (eyebrow, title, message, cta1, cta2) can be edited independently:
 * text content + font family + size + color.
 *
 * The parent decides which element to open by passing elementKey + the
 * current values, and receives the new ones in onSave(elementKey, …).
 */

export interface TextStyle {
  fontFamily?: string;
  fontSize?: number; // px
  color?: string;
}

interface TextStyleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  elementLabel: string; // "Título", "Mensaje", "Botón principal", etc.
  elementKey: string; // 'title' | 'message' | 'cta1' | 'cta2' | 'eyebrow' | 'navMenu' …
  initialText: string;
  initialStyle?: TextStyle;
  defaultText: string; // shown as placeholder
  multiline?: boolean;
  /** Hide the text input (use for elements whose content comes from elsewhere, e.g. nav categories). */
  hideText?: boolean;
  /** Hide the live preview block. */
  hidePreview?: boolean;
  /** Optional info note rendered after the controls (e.g. "if too many → hamburger"). */
  infoText?: string;
  onSave: (elementKey: string, text: string, style: TextStyle) => void;
}

const FONT_OPTIONS = [
  { value: "default", label: "Default (heredar)" },
  { value: "sans", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Monospace" },
];

export const TextStyleEditModal = ({
  isOpen,
  onClose,
  elementLabel,
  elementKey,
  initialText,
  initialStyle,
  defaultText,
  multiline,
  hideText,
  hidePreview,
  infoText,
  onSave,
}: TextStyleEditModalProps) => {
  const [text, setText] = useState("");
  const [fontFamily, setFontFamily] = useState("default");
  const [fontSize, setFontSize] = useState<number>(0);
  const [color, setColor] = useState<string>("#000000");

  useEffect(() => {
    if (!isOpen) return;
    setText(initialText || "");
    setFontFamily(initialStyle?.fontFamily || "default");
    setFontSize(initialStyle?.fontSize || 0);
    setColor(initialStyle?.color || "#000000");
  }, [isOpen, initialText, initialStyle]);

  const handleSave = () => {
    onSave(elementKey, text, {
      fontFamily: fontFamily === "default" ? undefined : fontFamily,
      fontSize: fontSize > 0 ? fontSize : undefined,
      color: color && color !== "#000000" ? color : initialStyle?.color,
    });
    onClose();
  };

  const previewStyle: React.CSSProperties = {
    fontFamily:
      fontFamily === "serif"
        ? "ui-serif, Georgia, serif"
        : fontFamily === "mono"
          ? "ui-monospace, SFMono-Regular, monospace"
          : fontFamily === "sans"
            ? "ui-sans-serif, system-ui, sans-serif"
            : undefined,
    fontSize: fontSize > 0 ? `${fontSize}px` : undefined,
    color: color || undefined,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {elementLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!hideText && (
            <div className="space-y-2">
              <Label htmlFor="text-content">Texto</Label>
              {multiline ? (
                <Textarea
                  id="text-content"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={defaultText}
                  rows={3}
                />
              ) : (
                <Input
                  id="text-content"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={defaultText}
                />
              )}
              <p className="text-[10px] text-muted-foreground">Vacío para usar el texto por defecto.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Fuente</Label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Tamaño</Label>
              <span className="text-xs text-muted-foreground">
                {fontSize > 0 ? `${fontSize}px` : "default"}
              </span>
            </div>
            <Slider
              value={[fontSize]}
              onValueChange={(v) => setFontSize(v[0])}
              min={0}
              max={96}
              step={1}
            />
            <p className="text-[10px] text-muted-foreground">0 = usar tamaño por defecto.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="text-color">Color</Label>
            <div className="flex items-center gap-2">
              <input
                id="text-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 rounded border cursor-pointer"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#000000"
                className="font-mono text-xs"
              />
            </div>
          </div>

          {!hidePreview && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Vista previa</p>
              <div style={previewStyle} className="break-words">
                {text || defaultText}
              </div>
            </div>
          )}

          {infoText && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {infoText}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
