import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Menu, Heart, MessageCircle, Mail, MapPin } from "lucide-react";
export interface AllColorsData {
  backgroundColor: string;
  navbarColor: string;
  productCardBgColor: string;
  productCardHoverColor: string;
  footerColor: string;
  headerIconColor: string;
  headerIconScale: number;
  footerIconColor: string;
  footerIconScale: number;
}
interface AllColorsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (colors: AllColorsData) => void;
  initialData: AllColorsData;
}
export const AllColorsEditModal = ({
  isOpen,
  onClose,
  onSave,
  initialData
}: AllColorsEditModalProps) => {
  const [colors, setColors] = useState<AllColorsData>(initialData);
  useEffect(() => {
    setColors(initialData);
  }, [initialData]);
  const handleColorChange = (field: keyof AllColorsData, value: string | number) => {
    setColors(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSave = () => {
    onSave(colors);
  };
  const handleResetAll = () => {
    setColors({
      backgroundColor: '#ffffff',
      navbarColor: '#ffffff',
      productCardBgColor: '#ffffff',
      productCardHoverColor: '#000000',
      footerColor: '#ffffff',
      headerIconColor: '#6b7280',
      headerIconScale: 1.0,
      footerIconColor: '#1f2937',
      footerIconScale: 1.0
    });
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Personalización de Colores</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Color de Fondo de Página */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🖼️</span>
                <Label className="text-base font-semibold">Color de Fondo de Página</Label>
              </div>
              <div className="flex items-center gap-3">
                <input type="color" value={colors.backgroundColor} onChange={e => handleColorChange('backgroundColor', e.target.value)} className="h-12 w-20 border border-gray-300 cursor-pointer rounded-none" />
                <div className="flex-1">
                  <input type="text" value={colors.backgroundColor} onChange={e => handleColorChange('backgroundColor', e.target.value)} placeholder="#ffffff" className="w-full px-3 py-2 border border-gray-300 rounded-3xl" />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                ℹ️ Este es el color de fondo principal de tu tienda
              </p>
              <div style={{
              backgroundColor: colors.backgroundColor
            }} className="h-16 border-2 border-gray-300 rounded-3xl" />
            </div>

            {/* Color de Barra de Menú */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📱</span>
                <Label className="text-base font-semibold">Color de Barra de Menú</Label>
              </div>
              <div className="flex items-center gap-3">
                <input type="color" value={colors.navbarColor} onChange={e => handleColorChange('navbarColor', e.target.value)} className="h-12 w-20 border border-gray-300 cursor-pointer rounded-none" />
                <div className="flex-1">
                  <input type="text" value={colors.navbarColor} onChange={e => handleColorChange('navbarColor', e.target.value)} placeholder="#ffffff" className="w-full px-3 py-2 border border-gray-300 rounded-3xl" />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                ℹ️ Color del menú de navegación superior
              </p>
              <div style={{
              backgroundColor: colors.navbarColor
            }} className="h-16 border-2 border-gray-300 flex items-center px-4 rounded-3xl">
                <div className="text-sm font-semibold">Mi Tienda</div>
              </div>
            </div>

            {/* Colores del Card de Producto */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛍️</span>
                <Label className="text-base font-semibold">Colores del Card de Producto</Label>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">• Color base</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input type="color" value={colors.productCardBgColor} onChange={e => handleColorChange('productCardBgColor', e.target.value)} className="h-12 w-20 border border-gray-300 cursor-pointer rounded-none" />
                    <div className="flex-1">
                      <input type="text" value={colors.productCardBgColor} onChange={e => handleColorChange('productCardBgColor', e.target.value)} placeholder="#ffffff" className="w-full px-3 py-2 border border-gray-300 rounded-3xl" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">• Color al pasar el mouse (hover)</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input type="color" value={colors.productCardHoverColor} onChange={e => handleColorChange('productCardHoverColor', e.target.value)} className="h-12 w-20 border border-gray-300 cursor-pointer rounded-none" />
                    <div className="flex-1">
                      <input type="text" value={colors.productCardHoverColor} onChange={e => handleColorChange('productCardHoverColor', e.target.value)} placeholder="#000000" className="w-full px-3 py-2 border border-gray-300 rounded-3xl" />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500">
                ℹ️ Colores de las tarjetas de productos y su efecto al pasar el mouse
              </p>
              <div className="flex gap-4">
                <div style={{
                backgroundColor: colors.productCardBgColor
              }} className="flex-1 h-16 border-2 border-gray-300 flex items-center justify-center rounded-3xl">
                  <span className="text-xs">Normal</span>
                </div>
                <div style={{
                backgroundColor: colors.productCardHoverColor
              }} className="flex-1 h-16 border-2 border-gray-300 flex items-center justify-center rounded-3xl">
                  <span className="text-xs text-white">Hover</span>
                </div>
              </div>
            </div>

            {/* Color del Footer */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📞</span>
                <Label className="text-base font-semibold">Color de Fondo del Footer</Label>
              </div>
              <div className="flex items-center gap-3">
                <input type="color" value={colors.footerColor} onChange={e => handleColorChange('footerColor', e.target.value)} className="h-12 w-20 rounded border border-gray-300 cursor-pointer" />
                <div className="flex-1">
                  <input type="text" value={colors.footerColor} onChange={e => handleColorChange('footerColor', e.target.value)} placeholder="#ffffff" className="w-full px-3 py-2 border border-gray-300 rounded-3xl" />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                ℹ️ Color de fondo del pie de página
              </p>
              <div style={{
              backgroundColor: colors.footerColor
            }} className="h-16 border-2 border-gray-300 flex items-center px-4 rounded-3xl">
                <div className="text-sm text-gray-900">Footer / Contacto</div>
              </div>
            </div>

            {/* NUEVA SECCIÓN: Header Icons */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                <Label className="text-base font-semibold">Menú Superior (Buscador e Iconos)</Label>
              </div>
              
              <div>
                <Label className="text-sm mb-2">Color</Label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={colors.headerIconColor}
                    onChange={(e) => handleColorChange('headerIconColor', e.target.value)}
                    className="h-10 w-20 rounded cursor-pointer"
                  />
                  <Input 
                    type="text" 
                    value={colors.headerIconColor}
                    onChange={(e) => handleColorChange('headerIconColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-sm">Tamaño</Label>
                  <span className="text-sm font-medium text-gray-600">
                    {Math.round(colors.headerIconScale * 100)}%
                  </span>
                </div>
                <Slider
                  value={[colors.headerIconScale * 100]}
                  onValueChange={(value) => handleColorChange('headerIconScale', value[0] / 100)}
                  min={50}
                  max={200}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>50%</span>
                  <span>200%</span>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <p className="text-xs text-gray-500 mb-2">Vista previa:</p>
                <div 
                  className="relative w-full rounded-lg bg-white"
                  style={{ 
                    height: `${40 * colors.headerIconScale}px`,
                    border: `2px solid ${colors.headerIconColor}`,
                    borderRadius: `${8 * colors.headerIconScale}px`
                  }}
                >
                  <Search 
                    style={{ 
                      color: colors.headerIconColor,
                      width: `${20 * colors.headerIconScale}px`,
                      height: `${20 * colors.headerIconScale}px`
                    }}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2"
                  />
                  <input 
                    placeholder="Buscar productos..."
                    disabled
                    style={{
                      color: colors.headerIconColor,
                      fontSize: `${14 * colors.headerIconScale}px`,
                      paddingLeft: `${40 * colors.headerIconScale}px`
                    }}
                    className="w-full h-full bg-transparent border-0 outline-none placeholder:opacity-50"
                  />
                </div>
                <div className="flex gap-4 justify-end">
                  <Heart 
                    style={{ 
                      color: colors.headerIconColor,
                      width: `${20 * colors.headerIconScale}px`,
                      height: `${20 * colors.headerIconScale}px`
                    }}
                  />
                  <Menu 
                    style={{ 
                      color: colors.headerIconColor,
                      width: `${20 * colors.headerIconScale}px`,
                      height: `${20 * colors.headerIconScale}px`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* NUEVA SECCIÓN: Footer Icons */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📞</span>
                <Label className="text-base font-semibold">Footer - Iconos de Contacto</Label>
              </div>
              
              <div>
                <Label className="text-sm mb-2">Color</Label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={colors.footerIconColor}
                    onChange={(e) => handleColorChange('footerIconColor', e.target.value)}
                    className="h-10 w-20 rounded cursor-pointer"
                  />
                  <Input 
                    type="text" 
                    value={colors.footerIconColor}
                    onChange={(e) => handleColorChange('footerIconColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-sm">Tamaño</Label>
                  <span className="text-sm font-medium text-gray-600">
                    {Math.round(colors.footerIconScale * 100)}%
                  </span>
                </div>
                <Slider
                  value={[colors.footerIconScale * 100]}
                  onValueChange={(value) => handleColorChange('footerIconScale', value[0] / 100)}
                  min={50}
                  max={200}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>50%</span>
                  <span>200%</span>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-3">Vista previa:</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div 
                      className="rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2"
                      style={{
                        width: `${64 * colors.footerIconScale}px`,
                        height: `${64 * colors.footerIconScale}px`
                      }}
                    >
                      <MessageCircle 
                        style={{
                          color: colors.footerIconColor,
                          width: `${32 * colors.footerIconScale}px`,
                          height: `${32 * colors.footerIconScale}px`
                        }}
                      />
                    </div>
                    <h3 
                      className="font-semibold mb-1"
                      style={{ 
                        color: colors.footerIconColor,
                        fontSize: `${16 * colors.footerIconScale}px`
                      }}
                    >
                      WhatsApp
                    </h3>
                    <p 
                      style={{ 
                        color: colors.footerIconColor,
                        fontSize: `${14 * colors.footerIconScale}px`
                      }}
                    >
                      +54 11 1234
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div 
                      className="rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2"
                      style={{
                        width: `${64 * colors.footerIconScale}px`,
                        height: `${64 * colors.footerIconScale}px`
                      }}
                    >
                      <Mail 
                        style={{
                          color: colors.footerIconColor,
                          width: `${32 * colors.footerIconScale}px`,
                          height: `${32 * colors.footerIconScale}px`
                        }}
                      />
                    </div>
                    <h3 
                      className="font-semibold mb-1"
                      style={{ 
                        color: colors.footerIconColor,
                        fontSize: `${16 * colors.footerIconScale}px`
                      }}
                    >
                      Email
                    </h3>
                    <p 
                      style={{ 
                        color: colors.footerIconColor,
                        fontSize: `${14 * colors.footerIconScale}px`
                      }}
                    >
                      contacto@...
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div 
                      className="rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2"
                      style={{
                        width: `${64 * colors.footerIconScale}px`,
                        height: `${64 * colors.footerIconScale}px`
                      }}
                    >
                      <MapPin 
                        style={{
                          color: colors.footerIconColor,
                          width: `${32 * colors.footerIconScale}px`,
                          height: `${32 * colors.footerIconScale}px`
                        }}
                      />
                    </div>
                    <h3 
                      className="font-semibold mb-1"
                      style={{ 
                        color: colors.footerIconColor,
                        fontSize: `${16 * colors.footerIconScale}px`
                      }}
                    >
                      Dirección
                    </h3>
                    <p 
                      style={{ 
                        color: colors.footerIconColor,
                        fontSize: `${14 * colors.footerIconScale}px`
                      }}
                    >
                      Calle 123
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleResetAll}>
            Restablecer Todos
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
};