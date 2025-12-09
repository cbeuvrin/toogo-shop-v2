import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CategoryData {
  name: string;
  slug: string;
  showOnHome: boolean;
}

interface CategoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CategoryData) => void;
  initialData?: CategoryData;
}

export const CategoryEditModal = ({ isOpen, onClose, onSave, initialData }: CategoryEditModalProps) => {
  const [formData, setFormData] = useState<CategoryData>({
    name: "",
    slug: "",
    showOnHome: true
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: "",
        slug: "",
        showOnHome: true
      });
    }
  }, [initialData]);

  const handleInputChange = (field: keyof CategoryData, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-generate slug from name
      if (field === 'name' && typeof value === 'string') {
        newData.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .trim();
      }
      
      return newData;
    });
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar Categoría" : "Agregar Categoría"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la categoría</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Nombre de la categoría"
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleInputChange('slug', e.target.value)}
              placeholder="categoria-url"
            />
            <p className="text-xs text-muted-foreground">
              Se genera automáticamente desde el nombre
            </p>
          </div>

          {/* Show on Home */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-home">Mostrar en página principal</Label>
              <p className="text-xs text-muted-foreground">
                Solo se muestran máximo 5 categorías en la página principal
              </p>
            </div>
            <Switch
              id="show-home"
              checked={formData.showOnHome}
              onCheckedChange={(checked) => handleInputChange('showOnHome', checked)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!formData.name.trim()}>
            {initialData ? "Actualizar" : "Agregar"} Categoría
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};