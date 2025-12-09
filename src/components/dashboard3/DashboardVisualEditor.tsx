// @ts-nocheck
import React, { useState, useEffect } from "react";
import { StorePreview } from "./StorePreview";
import { EditableElement } from "./EditableElement";
import { LogoEditModal } from "./EditModals/LogoEditModal";
import { BannersEditModal } from "./EditModals/BannersEditModal";
import { ContactEditModal } from "./EditModals/ContactEditModal";
import { AllColorsEditModal } from "./EditModals/AllColorsEditModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit3, RefreshCw, Palette } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useProducts, type Product } from "@/hooks/useProducts";
import { useCategories, type Category } from "@/hooks/useCategories";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { useTenantContext } from "@/contexts/TenantContext";

// Visual editor product interface for compatibility
interface VisualEditorProduct {
  id: string;
  title: string;
  name: string;
  sku?: string;
  description: string;
  price_mxn: number;
  price: number;
  images: Array<{
    url: string;
  }>;
  categories?: Array<{
    id: string;
    name: string;
  }>;
  category: string;
}

// Visual editor category interface for compatibility
interface VisualEditorCategory {
  id: string;
  name: string;
  slug: string;
  showOnHome: boolean;
}
export interface EditorData {
  logo?: {
    url: string;
    alt?: string;
  };
  banners: Array<{
    id: string;
    imageUrl: string;
    sort: number;
  }>;
  products: VisualEditorProduct[];
  categories: VisualEditorCategory[];
  contact?: {
    whatsapp: string;
    email: string;
    address: string;
    facebook: string;
    instagram: string;
  };
  allColors: {
    backgroundColor: string;
    navbarColor: string;
    productCardBgColor: string;
    productCardHoverColor: string;
    footerColor: string;
    headerIconColor: string;
    headerIconScale: number;
    footerIconColor: string;
    footerIconScale: number;
  };
}
type EditModalType = 'logo' | 'banners' | 'contact' | 'all-colors' | null;

// Template Demo data for preloading
const getDemoTemplate = (): EditorData => ({
  logo: {
    url: "/placeholder.svg",
    alt: "Store Logo"
  },
  banners: [{
    id: "banner_1",
    imageUrl: "/placeholder.svg",
    sort: 0
  }, {
    id: "banner_2",
    imageUrl: "/placeholder.svg",
    sort: 1
  }, {
    id: "banner_3",
    imageUrl: "/placeholder.svg",
    sort: 2
  }],
  products: [],
  categories: [],
  contact: {
    whatsapp: "+1234567890",
    email: "contacto@mitienda.com",
    address: "123 Calle Principal, Ciudad",
    facebook: "https://facebook.com/mitienda",
    instagram: "https://instagram.com/mitienda"
  },
  allColors: {
    backgroundColor: '#ffffff',
    navbarColor: '#ffffff',
    productCardBgColor: '#ffffff',
    productCardHoverColor: '#000000',
    footerColor: '#ffffff',
    headerIconColor: '#6b7280',
    headerIconScale: 1.0,
    footerIconColor: '#1f2937',
    footerIconScale: 1.0
  }
});
export const DashboardVisualEditor = () => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    products
  } = useProducts();
  const {
    categories
  } = useCategories();
  const {
    uploadLogo,
    settings,
    updateSettings,
    loadSettings
  } = useTenantSettings();
  const {
    currentTenantId: tenantId,
    isLoading: tenantLoading
  } = useTenantContext();
  const [editorData, setEditorData] = useState<EditorData>({
    banners: [],
    products: [],
    categories: [],
    allColors: {
      backgroundColor: '#ffffff',
      navbarColor: '#ffffff',
      productCardBgColor: '#ffffff',
      productCardHoverColor: '#000000',
      footerColor: '#ffffff',
      headerIconColor: '#6b7280',
      headerIconScale: 1.0,
      footerIconColor: '#1f2937',
      footerIconScale: 1.0
    }
  });
  const [activeModal, setActiveModal] = useState<EditModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isEditorMode, setIsEditorMode] = useState(true);
  const storePreviewRef = React.useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPreloaded, setHasPreloaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cache-buster helper to force image refresh in editor
  const withCacheBuster = (url: string) => url ? `${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}` : url;
  useEffect(() => {
    if (!tenantLoading && tenantId) {
      loadEditorData();
    }
  }, [tenantId, tenantLoading]);
  useEffect(() => {
    // Convert products and categories from hooks to visual editor format
    const visualProducts: VisualEditorProduct[] = products.map(product => {
      // Map product categories correctly using the category relationships
      const productCategories = (product.categories || []).map(cat => ({
        id: cat.id,
        name: cat.name
      }));
      return {
        id: product.id,
        title: product.title,
        name: product.title,
        sku: product.sku,
        description: product.description || "",
        price: product.price_usd,
        price_mxn: product.price_mxn,
        images: (product.images || []).map(img => ({
          url: img
        })),
        categories: productCategories,
        category: productCategories.length > 0 ? productCategories[0].name : 'General'
      };
    });
    const visualCategories: VisualEditorCategory[] = categories.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      showOnHome: category.showOnHome || true
    }));
    setEditorData(prev => ({
      ...prev,
      products: visualProducts,
      categories: visualCategories
    }));
  }, [products, categories]);
  const loadEditorData = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    console.log('Loading editor data for tenant:', tenantId);
    try {
      const {
        data,
        error
      } = await supabase.from('visual_editor_data').select('*').eq('tenant_id', tenantId);
      if (error) throw error;

      // Initialize editor state - only logo, banners, and contact come from visual_editor_data
      // Products and categories come from their dedicated tables via hooks
      const newEditorData: Partial<EditorData> = {};

      // Check if we have any data
      const hasData = data && data.length > 0;
      if (hasData) {
        data.forEach(item => {
          if (item.element_type === 'logo') {
            newEditorData.logo = item.data as any;
          } else if (item.element_type === 'banner') {
            if (!newEditorData.banners) newEditorData.banners = [];
            newEditorData.banners.push({
              id: item.element_id,
              ...(item.data as any)
            });
          } else if (item.element_type === 'contact') {
            newEditorData.contact = item.data as any;
          }
          // Note: Products and categories are now loaded from dedicated tables via hooks
          // Legacy product/category data in visual_editor_data is ignored
        });

        // Update only the visual elements, preserve products/categories from hooks
        setEditorData(prev => ({
          ...prev,
          ...newEditorData,
          banners: (newEditorData.banners || []).map(b => ({
            ...b,
            imageUrl: withCacheBuster((b as any).imageUrl)
          }))
        }));
      } else {
        // No data found, preload demo template for visual elements only
        await preloadDemoTemplate();
      }
    } catch (error) {
      console.error('Error loading editor data:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar los datos del editor",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const preloadDemoTemplate = async () => {
    if (!tenantId || hasPreloaded) return;
    try {
      const demoData = getDemoTemplate();

      // Save only visual elements to visual_editor_data
      const promises = [];

      // Save logo with 'main_logo' element_id to prevent future duplication
      if (demoData.logo) {
        promises.push(supabase.from('visual_editor_data').upsert({
          tenant_id: tenantId,
          element_type: 'logo',
          element_id: 'main_logo',
          data: demoData.logo
        }));
      }

      // Save banners
      demoData.banners.forEach(banner => {
        promises.push(supabase.from('visual_editor_data').upsert({
          tenant_id: tenantId,
          element_type: 'banner',
          element_id: banner.id,
          data: {
            imageUrl: banner.imageUrl,
            sort: banner.sort
          }
        }));
      });

      // Save contact
      if (demoData.contact) {
        promises.push(supabase.from('visual_editor_data').upsert({
          tenant_id: tenantId,
          element_type: 'contact',
          element_id: 'store_contact',
          data: demoData.contact
        }));
      }

      // Products and categories will be handled by their dedicated hooks

      await Promise.all(promises);

      // Update only visual elements, preserve products/categories from hooks
      setEditorData(prev => ({
        ...prev,
        logo: demoData.logo,
        banners: demoData.banners,
        contact: demoData.contact
      }));
      setHasPreloaded(true);
      toast({
        title: "Plantilla cargada",
        description: "Se ha precargado una plantilla demo para elementos visuales"
      });
    } catch (error) {
      console.error('Error preloading demo template:', error);
      toast({
        title: "Error",
        description: "No se pudo precargar la plantilla demo",
        variant: "destructive"
      });
    }
  };
  const saveEditorData = async (type: string, elementId: string, data: any) => {
    if (!tenantId) return;
    try {
      const {
        error
      } = await supabase.from('visual_editor_data').upsert({
        tenant_id: tenantId,
        element_type: type,
        element_id: elementId,
        data
      }, {
        onConflict: 'tenant_id,element_type,element_id'
      });
      if (error) throw error;
      toast({
        title: "Guardado exitoso",
        description: "Los cambios se han guardado correctamente"
      });
    } catch (error) {
      console.error('Error saving editor data:', error);
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    }
  };
  const handleEditElement = (type: EditModalType, item?: any) => {
    setActiveModal(type);
    setEditingItem(item);
  };
  const handleSaveLogo = async (logoData: {
    url: string;
    alt?: string;
  }) => {
    try {
      // Apply cache-busting for immediate visual refresh
      const refreshedLogo = {
        ...logoData,
        url: withCacheBuster(logoData.url)
      };

      // Update editorData immediately for visual feedback
      setEditorData(prev => ({
        ...prev,
        logo: refreshedLogo
      }));

      // Save to DB without cache-buster
      await saveEditorData('logo', 'main_logo', logoData);

      // Don't close modal - user will close manually

      toast({
        title: "Logo guardado",
        description: "El logo se ha actualizado en el preview"
      });
    } catch (error) {
      console.error('Error saving logo:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el logo",
        variant: "destructive"
      });
    }
  };
  const handleSaveBanners = async (bannersData: Array<{
    id: string;
    imageUrl: string;
    sort: number;
  }>) => {
    if (!tenantId) return;
    console.log('handleSaveBanners called with', bannersData);
    setIsSaving(true);
    try {
      // First, delete all existing banners for this tenant
      await supabase.from('visual_editor_data').delete().eq('tenant_id', tenantId).eq('element_type', 'banner');

      // Then insert the new banners
      const promises = bannersData.map(banner => supabase.from('visual_editor_data').insert({
        tenant_id: tenantId,
        element_type: 'banner',
        element_id: banner.id,
        data: {
          imageUrl: banner.imageUrl,
          sort: banner.sort
        }
      }));
      await Promise.all(promises);

      // Update local state immediately with cache-busting to force refresh
      const refreshed = bannersData.map(b => ({
        ...b,
        imageUrl: withCacheBuster(b.imageUrl)
      }));
      setEditorData(prev => ({
        ...prev,
        banners: refreshed
      }));

      // Don't close modal - user will close manually

      toast({
        title: "Banners guardados",
        description: "Los banners se han actualizado en el preview"
      });
      console.log('Banners saved and editor reloaded');
    } catch (error) {
      console.error('Error saving banners:', error);
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar los banners",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Removed product and category save handlers - now read-only from products table

  const handleSaveContact = async (contactData: any) => {
    await saveEditorData('contact', 'store_contact', contactData);
    setEditorData(prev => ({
      ...prev,
      contact: contactData
    }));
    setActiveModal(null);
  };
  const handleSaveAllColors = async (colors: {
    backgroundColor: string;
    navbarColor: string;
    productCardBgColor: string;
    productCardHoverColor: string;
    footerColor: string;
    headerIconColor: string;
    headerIconScale: number;
    footerIconColor: string;
    footerIconScale: number;
  }) => {
    try {
      setIsSaving(true);
      await updateSettings({
        store_background_color: colors.backgroundColor,
        navbar_bg_color: colors.navbarColor,
        product_card_bg_color: colors.productCardBgColor,
        product_card_hover_color: colors.productCardHoverColor,
        footer_bg_color: colors.footerColor,
        header_icon_color: colors.headerIconColor,
        header_icon_scale: colors.headerIconScale,
        footer_icon_color: colors.footerIconColor,
        footer_icon_scale: colors.footerIconScale
      });

      // Refrescar settings para actualizar el preview inmediatamente
      await loadSettings();
      toast({
        title: "Colores actualizados",
        description: "Los cambios se han guardado correctamente."
      });
      setActiveModal(null);
    } catch (error) {
      console.error('Error saving colors:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los colores",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Removed delete handlers - products/categories managed in "Mis Productos" section

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Cargando editor visual...</p>
        </div>
      </div>;
  }
  return <div className="space-y-6">
      {/* Instruction text */}
      <div className="text-center py-3">
        <p className="font-medium text-foreground text-sm">
          Editor Visual - Personaliza el diseño de tu tienda
        </p>
        <p className="text-muted-foreground text-xs">
          Los productos se gestionan en la sección "Mis Productos"
        </p>
      </div>

      {/* Editor Toolbar */}
      <div className="flex items-center justify-between p-4 bg-background/95 backdrop-blur border rounded-lg">
        <div className="flex items-center gap-4">
          <Badge variant={isEditorMode ? "default" : "secondary"}>
            {isEditorMode ? "Modo Edición" : "Modo Vista Previa"}
          </Badge>
        </div>
        
        <TooltipProvider>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setActiveModal('all-colors')} disabled={isLoading || isSaving} className="gap-2 text-xs">
                  <Palette className="w-4 h-4" />
                  <span className="hidden md:inline">Tamaños y Colores</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tamaños y Colores</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => loadEditorData()} disabled={isLoading || isSaving} className="gap-2 text-xs">
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden md:inline">Recargar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Recargar Vista Previa</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setIsEditorMode(!isEditorMode)} className="gap-2">
                  {isEditorMode ? (
                    <>
                      <Eye className="w-4 h-4" />
                      <span className="hidden md:inline">Vista Previa</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" />
                      <span className="hidden md:inline">Editar</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isEditorMode ? "Vista Previa" : "Editar"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Store Preview */}
      <div ref={storePreviewRef} className="border rounded-lg overflow-hidden relative min-h-[600px]">
        <StorePreview key={`preview-${editorData.logo?.url}-${editorData.banners.map(b => b.imageUrl).join('-')}`} data={editorData} isEditorMode={isEditorMode} onEditElement={handleEditElement} onDeleteProduct={() => {}} // No-op - aesthetic only
      onDeleteCategory={() => {}} // No-op - aesthetic only
      backgroundColor={settings?.store_background_color || '#ffffff'} navbarBgColor={settings?.navbar_bg_color || '#ffffff'} productCardBgColor={settings?.product_card_bg_color || '#ffffff'} productCardHoverColor={settings?.product_card_hover_color || '#000000'} footerBgColor={settings?.footer_bg_color || '#ffffff'} headerIconColor={settings?.header_icon_color || '#6b7280'} headerIconScale={settings?.header_icon_scale || 1.0} footerIconColor={settings?.footer_icon_color || '#1f2937'} footerIconScale={settings?.footer_icon_scale || 1.0} />
        
      </div>

      {/* Edit Modals */}
      <LogoEditModal isOpen={activeModal === 'logo'} onClose={() => setActiveModal(null)} onSave={handleSaveLogo} initialData={editorData.logo} />

      <BannersEditModal isOpen={activeModal === 'banners'} onClose={() => setActiveModal(null)} onSave={handleSaveBanners} initialData={editorData.banners} />

      {/* Removed ProductEditModal and CategoryEditModal - aesthetic editor only */}

      <ContactEditModal isOpen={activeModal === 'contact'} onClose={() => setActiveModal(null)} onSave={handleSaveContact} initialData={editorData.contact} />

      <AllColorsEditModal isOpen={activeModal === 'all-colors'} onClose={() => setActiveModal(null)} onSave={handleSaveAllColors} initialData={{
      backgroundColor: settings?.store_background_color || '#ffffff',
      navbarColor: settings?.navbar_bg_color || '#ffffff',
      productCardBgColor: settings?.product_card_bg_color || '#ffffff',
      productCardHoverColor: settings?.product_card_hover_color || '#000000',
      footerColor: settings?.footer_bg_color || '#ffffff',
      headerIconColor: settings?.header_icon_color || '#6b7280',
      headerIconScale: settings?.header_icon_scale || 1.0,
      footerIconColor: settings?.footer_icon_color || '#1f2937',
      footerIconScale: settings?.footer_icon_scale || 1.0
    }} />
    </div>;
};