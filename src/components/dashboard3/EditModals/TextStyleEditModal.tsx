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
import { Switch } from "@/components/ui/switch";
import { HERO_FONT_OPTIONS, heroFontFamily } from "@/lib/heroFonts";

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
  // Button-specific (cta1, cta2): background color + visibility + action routing.
  bgColor?: string;
  enabled?: boolean;
  action?: 'catalog' | 'category' | 'link';
  categorySlug?: string;
  customUrl?: string;
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
  /** Render the button-specific Action section (visibility + catalog/category/link routing). */
  isButton?: boolean;
  /** Categories list for the "Ir a categoría" picker. */
  categories?: Array<{ id?: string; name: string; slug?: string }>;
  onSave: (elementKey: string, text: string, style: TextStyle) => void;
}

const FONT_OPTIONS = HERO_FONT_OPTIONS;

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
  isButton,
  categories = [],
  onSave,
}: TextStyleEditModalProps) => {
  const [text, setText] = useState("");
  const [fontFamily, setFontFamily] = useState("default");
  const [fontSize, setFontSize] = useState<number>(0);
  const [color, setColor] = useState<string>("#000000");
  const [bgColor, setBgColor] = useState<string>("");
  const [enabled, setEnabled] = useState(true);
  const [action, setAction] = useState<'catalog' | 'category' | 'link'>('catalog');
  const [categorySlug, setCategorySlug] = useState<string>("");
  const [customUrl, setCustomUrl] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    setText(initialText || "");
    setFontFamily(initialStyle?.fontFamily || "default");
    setFontSize(initialStyle?.fontSize || 0);
    setColor(initialStyle?.color || "#000000");
    setBgColor(initialStyle?.bgColor || "");
    setEnabled(initialStyle?.enabled !== false);
    setAction(initialStyle?.action || 'catalog');
    setCategorySlug(initialStyle?.categorySlug || "");
    setCustomUrl(initialStyle?.customUrl || "");
  }, [isOpen, initialText, initialStyle]);

  const handleSave = () => {
    onSave(elementKey, text, {
      fontFamily: fontFamily === "default" ? undefined : fontFamily,
      fontSize: fontSize > 0 ? fontSize : undefined,
      color: color && color !== "#000000" ? color : initialStyle?.color,
      ...(isButton && {
        bgColor: bgColor || undefined,
        enabled,
        action,
        categorySlug: action === 'category' ? categorySlug : undefined,
        customUrl: action === 'link' ? customUrl : undefined,
      }),
    });
    onClose();
  };

  const previewStyle: React.CSSProperties = {
    fontFamily: heroFontFamily(fontFamily),
    fontSize: fontSize > 0 ? `${fontSize}px` : undefined,
    color: color || undefined,
    ...(isButton && bgColor && {
      backgroundColor: bgColor,
      display: "inline-block",
      padding: "0.5rem 1rem",
      borderRadius: "0.25rem",
    }),
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
            <Label htmlFor="text-color">{isButton ? "Color de la letra" : "Color"}</Label>
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

          {isButton && (
            <div className="space-y-2">
              <Label htmlFor="btn-bg-color">Color de fondo</Label>
              <div className="flex items-center gap-2">
                <input
                  id="btn-bg-color"
                  type="color"
                  value={bgColor || "#000000"}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  placeholder="Por defecto"
                  className="font-mono text-xs"
                />
                {bgColor && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setBgColor("")}>
                    Quitar
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Vacío = usar el fondo por defecto de la plantilla.</p>
            </div>
          )}

          {isButton && (
            <div className="space-y-3 border rounded-md p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label htmlFor="btn-enabled">Mostrar botón</Label>
                <Switch
                  id="btn-enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>
              {enabled && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Acción al hacer click</Label>
                    <Select value={action} onValueChange={(v) => setAction(v as 'catalog' | 'category' | 'link')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="catalog">Ir al catálogo completo</SelectItem>
                        <SelectItem value="category">Ir a una categoría</SelectItem>
                        <SelectItem value="link">Enlace personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {action === 'category' && (
                    <div className="space-y-2">
                      <Label className="text-xs">Categoría</Label>
                      <Select value={categorySlug} onValueChange={setCategorySlug}>
                        <SelectTrigger><SelectValue placeholder="Elige una categoría" /></SelectTrigger>
                        <SelectContent>
                          {categories.length === 0 ? (
                            <SelectItem value="__none__" disabled>No hay categorías aún</SelectItem>
                          ) : (
                            categories.map((cat) => (
                              <SelectItem key={cat.id || cat.slug || cat.name} value={(cat.slug || cat.name).toLowerCase()}>
                                {cat.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {action === 'link' && (
                    <div className="space-y-2">
                      <Label htmlFor="custom-url" className="text-xs">URL</Label>
                      <Input
                        id="custom-url"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://ejemplo.com"
                      />
                      <p className="text-[10px] text-muted-foreground">Se abrirá en una nueva pestaña.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!hidePreview && (
            <div className="rounded-md border bg-muted/30 p-3 overflow-hidden">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Vista previa</p>
              <div style={previewStyle} className="break-words [overflow-wrap:anywhere] max-w-full leading-tight">
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
