import React, { useState, useEffect } from "react";
import { Package, DollarSign, Hash, Tag, Settings, Plus, Info, Lightbulb, Eye, Camera, Edit, ShoppingCart, MessageSquare, Star, HelpCircle, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageGalleryManager } from "@/components/ui/image-gallery-manager";
import { ProductVariablesManager } from "@/components/dashboard/ProductVariablesManager";
import { ProductVariationsManager, ProductVariation } from "@/components/dashboard/ProductVariationsManager";
import { useProductVariables } from "@/hooks/useProductVariables";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { ImageCropperModal } from "@/components/ui/ImageCropperModal";
import { fileToDataUrl } from "@/utils/cropImage";
interface ProductData {
  name: string;
  description: string;
  price_mxn: number;
  sale_price_mxn: number;
  stock: number;
  sku: string;
  features: string[];
  status: string;
  images: string[];
  category: string;
  product_type: 'simple' | 'variable';
  variables?: string[];
  variations?: ProductVariation[];
}
interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    showOnHome: boolean;
  }>;
  onNavigateToCategories?: () => void;
  onNavigateToVariables?: () => void;
}
export const ProductEditModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories,
  onNavigateToCategories,
  onNavigateToVariables
}: ProductEditModalProps) => {
  const isMobile = useIsMobile();
  const { currentTenantId: tenantId } = useTenantContext();
  const {
    variables,
    getProductVariables
  } = useProductVariables();
  const {
    toast
  } = useToast();
  const [formData, setFormData] = useState<ProductData>({
    name: "",
    description: "",
    price_mxn: 0,
    sale_price_mxn: 0,
    stock: 0,
    sku: "",
    features: [],
    status: "active",
    images: [],
    category: "",
    product_type: 'simple',
    variables: [],
    variations: []
  });
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("upload");
  const [isUploading, setIsUploading] = useState(false);

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    console.log('🚀 [ProductEditModal] === INICIO UPLOAD ===');
    console.log('🚀 [ProductEditModal] Archivo:', file.name, 'Tamaño:', file.size, 'Tipo:', file.type);
    console.log('🚀 [ProductEditModal] tenantId actual:', tenantId);
    
    // Verificar autenticación antes de subir
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ [ProductEditModal] No hay sesión activa');
      toast({
        title: "Sesión expirada",
        description: "Por favor, recarga la página e inicia sesión nuevamente",
        variant: "destructive"
      });
      return null;
    }
    console.log('✅ [ProductEditModal] Sesión activa:', session.user.email);
    
    // Verificar tenantId
    if (!tenantId) {
      console.error('❌ [ProductEditModal] No se pudo obtener tenantId');
      toast({
        title: "Error de configuración",
        description: "No se pudo identificar la tienda. Recarga la página.",
        variant: "destructive"
      });
      return null;
    }
    
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${tenantId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      console.log('🚀 [ProductEditModal] fileName generado:', fileName);
      console.log('🚀 [ProductEditModal] Subiendo a bucket: product-images');
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ [ProductEditModal] Error en upload:', error);
        console.error('❌ [ProductEditModal] Error message:', error.message);
        toast({
          title: "Error de subida",
          description: `Error: ${error.message}`,
          variant: "destructive"
        });
        throw error;
      }

      console.log('✅ [ProductEditModal] Upload exitoso, data:', data);
      console.log('✅ [ProductEditModal] Path guardado:', data.path);

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      console.log('✅ [ProductEditModal] URL pública generada:', urlData.publicUrl);
      console.log('🚀 [ProductEditModal] === FIN UPLOAD ===');
      
      toast({
        title: "Imagen subida",
        description: "La imagen se guardó en el servidor correctamente"
      });
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ [ProductEditModal] Upload failed completamente:', error);
      return null;
    }
  };

  const handleImageUpload = async (index: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo excede el límite de 5MB",
        variant: "destructive"
      });
      return;
    }

    // Convert file to data URL and open cropper
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageToCrop(dataUrl);
      setCurrentImageIndex(index);
      setCropperOpen(true);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Error",
        description: "Error al leer la imagen",
        variant: "destructive"
      });
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const index = currentImageIndex;
    
    setIsUploading(true);
    try {
      // Convert blob to file for upload
      const file = new File([croppedBlob], `product_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = await uploadFileToStorage(file);
      if (url) {
        const newImages = [...formData.images];
        newImages[index] = url;
        handleImagesChange(newImages.filter(Boolean));
        toast({
          title: "Imagen subida",
          description: "La imagen se subió correctamente"
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo subir la imagen",
          variant: "destructive"
        });
      }
    } finally {
      setIsUploading(false);
    }
  };
  useEffect(() => {
    const loadData = async () => {
      if (initialData) {
        // Load product variables if editing
        const productVariables = initialData.id ? await getProductVariables(initialData.id) : [];
        setFormData({
          name: initialData.title || "",
          description: initialData.description || "",
          price_mxn: initialData.price_mxn || 0,
          sale_price_mxn: initialData.sale_price_mxn || 0,
          stock: initialData.stock || 0,
          sku: initialData.sku || "",
          features: initialData.features || [],
          status: initialData.status || "active",
          images: initialData.images || [],
          category: initialData.categories?.[0]?.id || "",
          product_type: initialData.product_type || 'simple',
          variables: productVariables.map(v => v.id) || [],
          variations: initialData.variations || []
        });
        setSelectedVariables(productVariables.map(v => v.id) || []);
      } else {
        setFormData({
          name: "",
          description: "",
          price_mxn: 0,
          sale_price_mxn: 0,
          stock: 0,
          sku: "",
          features: [],
          status: "active",
          images: [],
          category: "",
          product_type: 'simple',
          variables: [],
          variations: []
        });
        setSelectedVariables([]);
      }
    };
    if (isOpen) {
      loadData();
    }
  }, [isOpen, initialData?.id]);
  const handleInputChange = (field: keyof ProductData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSave = () => {
    // Validación de nombre (siempre requerido)
    if (!formData.name.trim()) {
      toast({
        title: "Campo requerido",
        description: "El nombre del producto es obligatorio",
        variant: "destructive"
      });
      return;
    }
    
    // Validación de imágenes (siempre requerido)
    if (!formData.images || formData.images.length === 0) {
      toast({
        title: "Imagen requerida",
        description: "Debes subir al menos una imagen del producto",
        variant: "destructive"
      });
      return;
    }
    
    // Validación condicional según tipo de producto
    if (formData.product_type === 'simple') {
      // Para productos simples: precio es obligatorio
      if (!formData.price_mxn || formData.price_mxn <= 0) {
        toast({
          title: "Precio requerido",
          description: "El precio debe ser mayor a $0 para productos simples",
          variant: "destructive"
        });
        return;
      }
    } else if (formData.product_type === 'variable') {
      // Para productos variables: validar que haya variaciones
      if (!formData.variations || formData.variations.length === 0) {
        toast({
          title: "Variaciones requeridas",
          description: "Los productos variables necesitan al menos una variación configurada",
          variant: "destructive"
        });
        return;
      }
    }
    
    const productToSave = {
      title: formData.name,
      description: formData.description,
      // Para productos variables, enviar precio 0
      price_mxn: formData.product_type === 'variable' ? 0 : formData.price_mxn,
      sale_price_mxn: formData.product_type === 'variable' ? 0 : (formData.sale_price_mxn || 0),
      // Para productos variables, enviar stock 0
      stock: formData.product_type === 'variable' ? 0 : formData.stock,
      // Para productos variables, enviar SKU null
      sku: formData.product_type === 'variable' ? null : formData.sku,
      features: formData.features,
      status: formData.status,
      images: formData.images,
      categories: formData.category && formData.category.trim() !== "" 
        ? [formData.category] 
        : [],
      product_type: formData.product_type,
      variables: selectedVariables,
      variations: formData.variations
    };
    
    console.log('[ProductEditModal] Guardando producto:', {
      product_type: productToSave.product_type,
      price_mxn: productToSave.price_mxn,
      stock: productToSave.stock,
      sku: productToSave.sku,
      hasVariations: productToSave.variations?.length || 0
    });
    
    onSave(productToSave);
  };
  const handleImagesChange = (images: string[]) => {
    setFormData(prev => ({
      ...prev,
      images
    }));
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'w-[98vw] h-[98vh] max-w-none' : 'sm:max-w-6xl w-[95vw] max-h-[95vh]'} !grid !grid-rows-[auto_1fr_auto] !gap-0`}>
        <DialogHeader className={`${isMobile ? 'px-4 py-3' : 'px-6 py-4'} border-b`}>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {initialData ? "Editar Producto" : "Agregar Producto"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Tab Navigation */}
          <div className={`${isMobile ? 'p-3' : 'p-6'} border-b bg-muted/30`}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-[85%] mx-auto grid-cols-3 ${isMobile ? 'h-10' : 'h-12'} bg-gray-100 rounded-[30px] p-1 gap-1`}>
                <TabsTrigger value="upload" className={`flex items-center justify-center gap-1.5 rounded-[26px] ${isMobile ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'} font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm`}>
                  <Camera className="h-4 w-4" />
                  {isMobile ? (
                    <span className="text-xs font-medium">Paso 1</span>
                  ) : (
                    <span>Paso 1: Foto</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="info" className={`flex items-center justify-center gap-1.5 rounded-[26px] ${isMobile ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'} font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm`}>
                  <Edit className="h-4 w-4" />
                  {isMobile ? (
                    <span className="text-xs font-medium">Paso 2</span>
                  ) : (
                    <span>Paso 2: Info</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="preview" className={`flex items-center justify-center gap-1.5 rounded-[26px] ${isMobile ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'} font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm`}>
                  <Eye className="h-4 w-4" />
                  {isMobile ? (
                    <span className="text-xs font-medium">Paso 3</span>
                  ) : (
                    <span>Paso 3: Vista</span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Upload Tab */}
              <TabsContent value="upload" className={isMobile ? 'mt-3' : 'mt-6'}>
                <div className={`${isMobile ? 'w-[90%] mx-auto px-1' : 'p-6'}`}>
                  <Card>
                    <CardHeader className={isMobile ? 'pb-2 px-3 pt-3' : 'pb-3'}>
                      <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} flex items-center gap-2`}>
                        <Camera className="h-4 w-4" />
                        Imágenes del Producto
                      </CardTitle>
                    </CardHeader>
                    <CardContent className={isMobile ? 'pb-2 px-3' : 'pb-3'}>
                      <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 md:grid-cols-4 gap-3'}`}>
                        {[0, 1, 2, 3].map(index => <div key={index} className={`aspect-square border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors ${formData.images[index] ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'} ${isUploading ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => {
                        if (isUploading) return;
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = e => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            handleImageUpload(index, file);
                          }
                        };
                        input.click();
                      }}>
                            {formData.images[index] ? <div className="relative w-full h-full">
                                <img src={formData.images[index]} alt={`Producto ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                                {index === 0 && <div className="absolute top-1 left-1 bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-xs font-medium">
                                    Principal
                                  </div>}
                                <button onClick={e => {
                            e.stopPropagation();
                            const newImages = [...formData.images];
                            newImages[index] = '';
                            handleImagesChange(newImages.filter(Boolean));
                          }} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center hover:bg-destructive/90 transition-colors text-xs">
                                  ×
                                </button>
                              </div> : <div className="text-center p-2">
                                {isUploading ? (
                                  <Loader2 className="h-6 w-6 md:h-8 md:w-8 mx-auto text-primary animate-spin mb-1" />
                                ) : (
                                  <Plus className="h-6 w-6 md:h-8 md:w-8 mx-auto text-muted-foreground mb-1" />
                                )}
                                {index === 0 && <p className="text-xs md:text-sm text-primary font-medium">{isUploading ? 'Subiendo...' : 'Principal'}</p>}
                                {index > 0 && <p className="text-xs text-muted-foreground hidden md:block">{isUploading ? 'Subiendo...' : `Foto ${index + 1}`}</p>}
                              </div>}
                          </div>)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Info Tab */}
              <TabsContent value="info" className={isMobile ? 'mt-3' : 'mt-6'}>
                <div className={`${isMobile ? 'w-[90%] mx-auto px-1 space-y-3' : 'p-6 space-y-6'}`}>
                  {/* Basic Info Section */}
                  <Card>
                    <CardHeader className={isMobile ? 'pb-2 px-3 pt-3' : 'pb-3'}>
                      <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} flex items-center gap-2`}>
                        <Package className="h-4 w-4" />
                        Información Básica
                      </CardTitle>
                    </CardHeader>
                    <CardContent className={`${isMobile ? 'space-y-3 px-3 pb-3' : 'space-y-4'}`}>
                      <div className={`grid grid-cols-1 ${isMobile ? 'gap-3' : 'md:grid-cols-2 gap-4'}`}>
                        <div className="md:col-span-2">
                          <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">NOMBRE DEL PRODUCTO *</Label>
                          <Input id="name" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} placeholder="ej. iPhone 15 Pro Max" className="mt-1" />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="description" className="text-xs font-medium text-muted-foreground">DESCRIPCIÓN</Label>
                          <Textarea id="description" value={formData.description} onChange={e => handleInputChange('description', e.target.value)} placeholder="Describe las características principales del producto..." rows={3} className="mt-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Classification Section */}
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className={isMobile ? 'pb-2 px-3 pt-3' : 'pb-3'}>
                      <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} flex items-center gap-2`}>
                        <Tag className="h-4 w-4 text-primary" />
                        Clasificación
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Organiza tus productos por categoría y tipo</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className={isMobile ? 'px-3' : ''}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                              <Label htmlFor="category" className="text-xs font-medium text-primary">CATEGORÍA</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs max-w-xs">Las categorías te ayudan a organizar tus productos (ej: Ropa, Electrónicos, Accesorios). Los clientes pueden filtrar por categoría en tu tienda.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-muted-foreground hover:text-primary" onClick={() => {
                            onClose();
                            onNavigateToCategories?.();
                            toast({
                              title: "Navegando a Categorías",
                              description: "Ahora puedes crear una nueva categoría para organizar tus productos."
                            });
                          }}>
                              <Plus className="h-3 w-3 mr-1" />
                              Crear Categoría
                            </Button>
                          </div>
                          <Select value={formData.category} onValueChange={value => handleInputChange('category', value)}>
                            <SelectTrigger className="mt-1 border-primary/30 focus:ring-primary/20">
                              <SelectValue placeholder={categories.length === 0 ? "No hay categorías - Crear una primero" : "Seleccionar categoría"} />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.filter(category => category.showOnHome !== false) // Solo mostrar categorías activas
                            .map(category => <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                              <Label htmlFor="product_type" className="text-xs font-medium text-primary">TIPO DE PRODUCTO</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs max-w-xs space-y-1">
                                      <p><strong>Simple:</strong> Un producto con un solo precio y sin variaciones (ej: un libro, una taza básica).</p>
                                      <p><strong>Variable:</strong> Un producto con diferentes opciones que el cliente puede elegir, como tallas, colores o materiales, cada una con su propio precio y stock.</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-muted-foreground hover:text-primary" onClick={() => {
                            onClose();
                            onNavigateToVariables?.();
                            toast({
                              title: "Navegando a Variables",
                              description: "Ahora puedes crear variables como tallas, colores o materiales para productos con opciones."
                            });
                          }}>
                              <Plus className="h-3 w-3 mr-1" />
                              Crear Variables
                            </Button>
                          </div>
                          <Select value={formData.product_type} onValueChange={(value: 'simple' | 'variable') => handleInputChange('product_type', value)}>
                            <SelectTrigger className="mt-1 border-primary/30 focus:ring-primary/20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="simple">Simple</SelectItem>
                              <SelectItem value="variable">Variable</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pricing & Inventory Section for Simple Products */}
                  {formData.product_type === 'simple' && <Card>
                      <CardHeader className={isMobile ? 'pb-2 px-3 pt-3' : 'pb-3'}>
                        <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} flex items-center gap-2`}>
                          <DollarSign className="h-4 w-4" />
                          Precios e Inventario
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Estos campos solo aplican para productos simples. Si cambias a variable, se ignorarán.
                        </p>
                      </CardHeader>
                      <CardContent className={isMobile ? 'px-3' : ''}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <Label htmlFor="price_mxn" className="text-xs font-medium text-muted-foreground">PRECIO MXN *</Label>
                            <Input id="price_mxn" type="number" min="0" step="0.01" value={formData.price_mxn || ''} onChange={e => handleInputChange('price_mxn', parseFloat(e.target.value) || 0)} placeholder="0.00" className="mt-1" />
                          </div>
                          <div>
                            <Label htmlFor="sale_price_mxn" className="text-xs font-medium text-muted-foreground">PRECIO DE OFERTA MXN (Opcional)</Label>
                            <Input id="sale_price_mxn" type="number" min="0" step="0.01" value={formData.sale_price_mxn || ''} onChange={e => handleInputChange('sale_price_mxn', parseFloat(e.target.value) || 0)} placeholder="Deja en 0 si no hay oferta" className="mt-1" />
                          </div>
                          <div>
                            <Label htmlFor="sku" className="text-xs font-medium text-muted-foreground">SKU</Label>
                            <Input id="sku" value={formData.sku} onChange={e => handleInputChange('sku', e.target.value)} placeholder="ej. IPH15PM128" className="mt-1" />
                            <p className="text-xs text-muted-foreground mt-1">
                              Opcional. Si lo dejas vacío, se generará uno automático.
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="stock" className="text-xs font-medium text-muted-foreground">CANTIDAD EN STOCK</Label>
                            <Input id="stock" type="number" min="0" value={formData.stock || ''} onChange={e => handleInputChange('stock', parseInt(e.target.value) || 0)} placeholder="0" className="mt-1" />
                          </div>
                          <div>
                            <Label htmlFor="status" className="text-xs font-medium text-muted-foreground">ESTADO</Label>
                            <Select value={formData.status} onValueChange={value => handleInputChange('status', value)}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Activo</SelectItem>
                                <SelectItem value="inactive">Inactivo</SelectItem>
                                <SelectItem value="draft">Borrador</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>}

                  {/* Variables Section for Variable Products */}
                  {formData.product_type === 'variable' && <>
                      <Card className="border-primary/20 bg-primary/5">
                        <CardHeader className={isMobile ? 'pb-2 px-3 pt-3' : 'pb-3'}>
                          <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} flex items-center gap-2`}>
                            <Settings className="h-4 w-4 text-primary" />
                            Variables del Producto
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs max-w-xs">Las variables son las opciones que puede elegir el cliente (ej: Talla: S,M,L,XL o Color: Rojo, Azul, Verde). Cada combinación tendrá su propio precio y stock.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className={isMobile ? 'px-3' : ''}>
                          <ProductVariablesManager selectedVariables={selectedVariables} onVariableSelect={setSelectedVariables} showSelection={true} />
                        </CardContent>
                      </Card>

                      {selectedVariables.length > 0 && <Card className="border-blue-200 bg-blue-50">
                          <CardHeader className={isMobile ? 'pb-2 px-3 pt-3' : 'pb-3'}>
                            <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} flex items-center gap-2`}>
                              <Settings className="h-4 w-4 text-blue-600" />
                              Variaciones Generadas
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-3 w-3 text-blue-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Configura precio y stock para cada combinación de variables</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className={isMobile ? 'px-3' : ''}>
                            <ProductVariationsManager variables={variables} selectedVariables={selectedVariables} variations={formData.variations || []} onVariationsChange={variations => handleInputChange('variations', variations)} />
                          </CardContent>
                        </Card>}
                    </>}
                </div>
              </TabsContent>

              {/* Preview Tab */}
              <TabsContent value="preview" className={isMobile ? 'mt-3' : 'mt-6'}>
                <div className={`${isMobile ? 'w-[90%] mx-auto px-1' : 'p-6'}`}>
                  {formData.name ? <Card>
                      <CardContent className="p-0">
                        <div className={`grid grid-cols-1 ${isMobile ? 'gap-4 p-4' : 'md:grid-cols-2 gap-6 p-6'}`}>
                          {/* Product Image */}
                          <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
                            <div className={`${isMobile ? 'aspect-[4/3]' : 'aspect-square'} rounded-lg overflow-hidden bg-muted border`}>
                              {formData.images[0] ? <img src={formData.images[0]} alt={formData.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">
                                  <Package className={`${isMobile ? 'h-16 w-16' : 'h-20 w-20'} text-muted-foreground`} />
                                </div>}
                            </div>
                            {formData.images.length > 1 && <div className="flex gap-2">
                                {formData.images.slice(1, 4).map((image, index) => <div key={index} className="w-16 h-16 rounded-md overflow-hidden border bg-muted">
                                    <img src={image} alt={`Thumbnail ${index + 2}`} className="w-full h-full object-cover" />
                                  </div>)}
                              </div>}
                          </div>

                          {/* Product Details */}
                          <div className="space-y-4">
                            <div>
                              <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
                                {formData.name}
                                {formData.sale_price_mxn > 0 && formData.sale_price_mxn < formData.price_mxn && (
                                  <span className="text-xs font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full">
                                    -{Math.round(((formData.price_mxn - formData.sale_price_mxn) / formData.price_mxn) * 100)}% OFF
                                  </span>
                                )}
                              </h1>
                              {formData.description && <p className="text-muted-foreground mt-2">{formData.description}</p>}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                {formData.sale_price_mxn > 0 && formData.sale_price_mxn < formData.price_mxn ? (
                                  <span className="text-3xl font-bold">${formData.sale_price_mxn} MXN</span>
                                ) : (
                                  <span className="text-3xl font-bold">${formData.price_mxn} MXN</span>
                                )}
                              </div>
                              {formData.sale_price_mxn > 0 && formData.sale_price_mxn < formData.price_mxn && (
                                <p className="text-lg line-through text-muted-foreground">${formData.price_mxn} MXN</p>
                              )}
                            </div>

                            {/* Features */}
                            {formData.features.length > 0 && <div className="space-y-2">
                                <h3 className="font-semibold">Características:</h3>
                                <ul className="space-y-1">
                                  {formData.features.map((feature, index) => <li key={index} className="flex items-center gap-2 text-sm">
                                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                      {feature}
                                    </li>)}
                                </ul>
                              </div>}

                            {/* Rating (Visual only) */}
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map(star => <Star key={star} className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} fill-yellow-400 text-yellow-400`} />)}
                              </div>
                              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>(4.8) 124 reseñas</span>
                            </div>

                            {/* Stock info */}
                            {formData.product_type === 'simple' && formData.stock > 0 && <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-green-600`}>✓ {formData.stock} disponibles</p>}

                            {/* Variables */}
                            {formData.product_type === 'variable' && selectedVariables.length > 0 && <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
                                {variables.filter(v => selectedVariables.includes(v.id)).map(variable => <div key={variable.id} className={isMobile ? 'space-y-1' : 'space-y-2'}>
                                    <Label className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>{variable.name}:</Label>
                                    <div className="flex flex-wrap gap-2">
                                      {variable.values.map(value => <Badge key={value.id} variant="outline" className={`cursor-not-allowed ${isMobile ? 'text-xs px-2 py-0.5' : ''}`}>
                                          {value.value}
                                        </Badge>)}
                                    </div>
                                  </div>)}
                              </div>}

                            {/* Action Buttons (Non-functional) */}
                            <div className={`${isMobile ? 'space-y-2 pt-3' : 'space-y-3 pt-4'}`}>
                              <Button className={`w-full cursor-not-allowed ${isMobile ? 'h-9 text-xs' : ''}`} disabled>
                                <ShoppingCart className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-2`} />
                                Agregar al carrito
                              </Button>
                              <Button variant="outline" className={`w-full cursor-not-allowed ${isMobile ? 'h-9 text-xs' : ''}`} disabled>
                                <MessageSquare className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-2`} />
                                Consultar por WhatsApp
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card> : <div className={`text-center ${isMobile ? 'py-8' : 'py-12'}`}>
                      <Package className={`${isMobile ? 'h-16 w-16' : 'h-20 w-20'} mx-auto text-muted-foreground ${isMobile ? 'mb-2' : 'mb-4'}`} />
                      <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>Completa la información del producto para ver la vista previa</p>
                    </div>}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className={`${isMobile ? 'px-4 py-3' : 'px-6 py-4'} border-t`}>
          <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between'} w-full`}>
            <Button variant="outline" onClick={onClose} className={isMobile ? 'w-full' : ''}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={
                !formData.name.trim() ||
                (formData.product_type === 'simple'
                  ? formData.price_mxn <= 0
                  : (!formData.variations || formData.variations.length === 0))
              } 
              className={`${isMobile ? 'w-full' : 'min-w-[120px]'} rounded-3xl`}
            >
              {initialData ? "Actualizar" : "Agregar"} Producto
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropperOpen}
        onClose={() => setCropperOpen(false)}
        imageSrc={imageToCrop}
        aspectRatio={1}
        onCropComplete={handleCropComplete}
        title="Recortar Imagen de Producto"
      />
    </Dialog>;
};