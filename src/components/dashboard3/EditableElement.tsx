import React, { ReactNode, useState } from "react";
import { Edit2, Trash2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const getElementExplanation = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'banner':
    case 'banners':
      return "Los banners son imágenes grandes que aparecen en la parte superior de tu tienda. Úsalos para promocionar ofertas especiales, productos nuevos o eventos importantes. Son lo primero que ven tus clientes al entrar a tu tienda.";
    case 'logo':
      return "El logo es la imagen que representa tu marca. Debe ser claro y reconocible para que tus clientes identifiquen fácilmente tu tienda.";
    case 'contacto':
    case 'contact':
      return "La sección de contacto muestra información para que tus clientes puedan comunicarse contigo: teléfono, email, dirección, redes sociales, etc.";
    case 'producto':
    case 'product':
      return "Los productos son los artículos que vendes en tu tienda. Incluye buenas fotos, descripciones claras y precios para atraer a tus clientes.";
    case 'categoria':
    case 'category':
      return "Las categorías organizan tus productos en grupos. Ayudan a tus clientes a encontrar fácilmente lo que buscan en tu tienda.";
    default:
      return `Haz clic para editar este elemento de tu tienda y personalizarlo según tus necesidades.`;
  }
};

interface EditableElementProps {
  children: ReactNode;
  type: string;
  isEditorMode: boolean;
  onEdit: () => void;
  onDelete?: () => void;
  className?: string;
}

export const EditableElement = ({
  children,
  type,
  isEditorMode,
  onEdit,
  onDelete,
  className
}: EditableElementProps) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!isEditorMode) {
    return <div className={className}>{children}</div>;
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative group cursor-pointer transition-all duration-200",
          isHovered && "ring-2 ring-primary ring-offset-2",
          className
        )}
        data-tutorial-target={type}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        {children}
        
        {/* Overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
        )}
        
        {/* Edit Controls */}
        {isHovered && (
          <div className="absolute top-2 right-2 flex gap-1 z-10">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit2 className="w-3 h-3" />
            </Button>
            
            {onDelete && (
              <Button
                size="sm"
                variant="destructive"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
        
        {/* Edit Hint with Help Tooltip */}
        {isHovered && (
          <div className="absolute top-2 left-2 z-10">
            <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
              <span>Clic para editar {type}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle 
                    className="w-3 h-3 cursor-help hover:text-primary-foreground/80" 
                    onClick={(e) => e.stopPropagation()}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">{getElementExplanation(type)}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};