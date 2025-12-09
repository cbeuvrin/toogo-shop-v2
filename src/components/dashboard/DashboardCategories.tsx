import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Tag, Edit, Trash2, GripVertical, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCategories, type Category } from "@/hooks/useCategories";
import { useOnboardingInteraction } from "@/hooks/useOnboardingInteraction";
import { ProductsTutorialModal } from "./ProductsTutorialModal";

export const DashboardCategories = () => {
  const { toast } = useToast();
  const { categories, isLoading, saveCategory, deleteCategory, toggleShowOnHome } = useCategories();
  const { markCategoryStepCompleted } = useOnboardingInteraction();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryTutorial, setShowCategoryTutorial] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    showOnHome: true
  });

  useEffect(() => {
    const dismissed = localStorage.getItem('categories-tutorial-dismissed');
    if (!dismissed) {
      setShowCategoryTutorial(true);
    }
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      showOnHome: true
    });
    setEditingCategory(null);
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name)
    });
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      showOnHome: category.showOnHome
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la categoría es requerido.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const categoryData = {
        name: formData.name,
        slug: formData.slug,
        showOnHome: formData.showOnHome,
        sort: editingCategory?.sort || categories.length
      };

      await saveCategory(categoryData, editingCategory?.id);
      
      toast({
        title: editingCategory ? "Categoría actualizada" : "Categoría creada",
        description: editingCategory 
          ? "La categoría se ha actualizado correctamente."
          : "La categoría se ha agregado correctamente.",
      });

      // Mark category step as completed when creating new category
      if (!editingCategory) {
        markCategoryStepCompleted();
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un problema al guardar la categoría.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      toast({
        title: "Categoría eliminada",
        description: "La categoría se ha eliminado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un problema al eliminar la categoría.",
        variant: "destructive"
      });
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Gestión de Categorías</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCategoryTutorial(true)}
              className="text-purple-600 hover:bg-purple-100 rounded-full w-8 h-8 p-0"
              title="Ver tutorial de categorías"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Organiza tus productos en categorías
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-purple-600 hover:bg-purple-700 text-white rounded-[30px]">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory ? "Modifica los datos de la categoría" : "Crea una nueva categoría para organizar tus productos"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Nombre de la categoría"
                />
              </div>
              
              <div>
                <Label htmlFor="slug">URL amigable</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  placeholder="url-amigable"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Se genera automáticamente del nombre, pero puedes editarla
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show_on_home">Mostrar en página principal</Label>
                  <p className="text-xs text-muted-foreground">
                    La categoría aparecerá en la página de inicio
                  </p>
                </div>
                 <Switch
                   id="show_on_home"
                   checked={formData.showOnHome}
                   onCheckedChange={(checked) => setFormData({...formData, showOnHome: checked})}
                 />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-[30px]">
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-[30px]"
              >
                {isSaving ? "Guardando..." : editingCategory ? "Actualizar" : "Crear"} Categoría
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando categorías...</p>
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay categorías</h3>
            <p className="text-muted-foreground mb-4">
              Crea categorías para organizar mejor tus productos
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white rounded-[30px]">
              <Plus className="w-4 h-4 mr-2" />
              Crear Categoría
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Categorías ({categories.length})</CardTitle>
            <CardDescription>
              Arrastra para reordenar las categorías
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categories
                .sort((a, b) => a.sort - b.sort)
                .map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <GripVertical className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground cursor-grab" />
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base font-medium truncate">{category.name}</h4>
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Label htmlFor={`show-${category.id}`} className="text-xs sm:text-sm">
                          Mostrar
                        </Label>
                         <Switch
                           id={`show-${category.id}`}
                           checked={category.showOnHome}
                           onCheckedChange={() => toggleShowOnHome(category.id)}
                         />
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(category)}
                        className="rounded-[30px] h-8 w-8 p-0 sm:h-9 sm:w-9"
                      >
                        <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                      
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDelete(category.id)}
                        className="rounded-[30px] h-8 w-8 p-0 sm:h-9 sm:w-9"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ProductsTutorialModal 
        isOpen={showCategoryTutorial}
        onClose={() => setShowCategoryTutorial(false)}
        step={1}
      />
    </div>
  );
};