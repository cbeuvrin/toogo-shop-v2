import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, X, GripVertical, Crown, ImageIcon, Loader2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImageGalleryManagerProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  allowUrlInput?: boolean;
  tenantId?: string;
}

interface SortableImageItemProps {
  id: string;
  image: string;
  index: number;
  onRemove: (index: number) => void;
  isPrimary: boolean;
}

const SortableImageItem = ({ id, image, index, onRemove, isPrimary }: SortableImageItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group bg-white border-2 rounded-lg overflow-hidden ${
        isPrimary ? 'border-yellow-400 shadow-lg' : 'border-gray-200'
      }`}
    >
      {/* Primary Badge */}
      {isPrimary && (
        <Badge className="absolute top-2 left-2 z-10 bg-yellow-500 text-yellow-900 text-xs font-semibold">
          <Crown className="w-3 h-3 mr-1" />
          Principal
        </Badge>
      )}

      {/* Order Number */}
      <Badge 
        variant="secondary" 
        className="absolute top-2 right-8 z-10 bg-black/70 text-white text-xs"
      >
        {index + 1}
      </Badge>

      {/* Remove Button */}
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2 z-10 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(index)}
      >
        <X className="w-3 h-3" />
      </Button>

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute bottom-2 right-2 z-10 p-1 bg-black/50 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4 text-white" />
      </div>

      {/* Image */}
      <div className="aspect-square">
        <img
          src={image}
          alt={`Imagen ${index + 1}`}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export const ImageGalleryManager = ({
  images,
  onImagesChange,
  maxImages = 6,
  allowUrlInput = true,
  tenantId,
}: ImageGalleryManagerProps) => {
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = images.findIndex((_, index) => `image-${index}` === active.id);
      const newIndex = images.findIndex((_, index) => `image-${index}` === over?.id);

      onImagesChange(arrayMove(images, oldIndex, newIndex));
    }
  };

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${tenantId || 'unknown'}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading image:', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      return null;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const remainingSlots = maxImages - images.length;
    const filesToProcess = Math.min(files.length, remainingSlots);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < filesToProcess; i++) {
        const file = files[i];
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "Archivo muy grande",
            description: `${file.name} excede el límite de 5MB`,
            variant: "destructive"
          });
          continue;
        }

        const url = await uploadFileToStorage(file);
        if (url) {
          uploadedUrls.push(url);
        }
      }

      if (uploadedUrls.length > 0) {
        onImagesChange([...images, ...uploadedUrls]);
        toast({
          title: "Imágenes subidas",
          description: `${uploadedUrls.length} imagen(es) subida(s) correctamente`
        });
      }
    } catch (error) {
      toast({
        title: "Error al subir",
        description: "No se pudieron subir algunas imágenes",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleAddFromUrl = () => {
    if (urlInput.trim() && images.length < maxImages) {
      // Validate URL format
      try {
        new URL(urlInput.trim());
        onImagesChange([...images, urlInput.trim()]);
        setUrlInput("");
      } catch {
        toast({
          title: "URL inválida",
          description: "Por favor ingresa una URL válida",
          variant: "destructive"
        });
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Información principal */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ImageIcon className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Imagen Principal</h4>
            <p className="text-sm text-blue-700">
              La primera imagen será la que se muestre en el catálogo y tienda. 
              Puedes arrastrar las imágenes para cambiar el orden.
            </p>
          </div>
        </div>
      </div>

      {/* Galería de imágenes */}
      {images.length > 0 && (
        <div>
          <Label className="text-sm font-medium">
            Imágenes del producto ({images.length}/{maxImages})
          </Label>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images.map((_, index) => `image-${index}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                {images.map((image, index) => (
                  <SortableImageItem
                    key={`image-${index}`}
                    id={`image-${index}`}
                    image={image}
                    index={index}
                    onRemove={handleRemoveImage}
                    isPrimary={index === 0}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Controles de carga */}
      {images.length < maxImages && (
        <div className="space-y-3">
          {/* Upload de archivos */}
          <div>
            <Label htmlFor="file-upload" className="text-sm font-medium">
              Subir imágenes
            </Label>
            <div className="mt-1">
              <label
                htmlFor="file-upload"
                className={`relative cursor-pointer bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-gray-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="text-center">
                  {isUploading ? (
                    <Loader2 className="mx-auto h-8 w-8 text-blue-500 animate-spin" />
                  ) : (
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  )}
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      {isUploading ? (
                        "Subiendo imágenes..."
                      ) : (
                        <>
                          <span className="font-medium text-blue-600 hover:text-blue-500">
                            Haz clic para subir
                          </span>
                          {" o arrastra y suelta"}
                        </>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, WEBP hasta 5MB (máximo {maxImages - images.length} imágenes)
                    </p>
                  </div>
                </div>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {/* Input de URL */}
          {allowUrlInput && (
            <div>
              <Label htmlFor="url-input" className="text-sm font-medium">
                O agregar desde URL
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="url-input"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddFromUrl}
                  disabled={!urlInput.trim() || images.length >= maxImages}
                  size="sm"
                >
                  Agregar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mensaje cuando se alcanza el límite */}
      {images.length >= maxImages && (
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Has alcanzado el límite máximo de {maxImages} imágenes por producto.
          </p>
        </div>
      )}
    </div>
  );
};