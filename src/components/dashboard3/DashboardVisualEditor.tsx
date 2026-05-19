// @ts-nocheck
import React, { useState, useEffect } from "react";
import { StorePreview } from "./StorePreview";
import { EditableElement } from "./EditableElement";
import { LogoEditModal } from "./EditModals/LogoEditModal";
import { BannersEditModal } from "./EditModals/BannersEditModal";
import { ContactEditModal } from "./EditModals/ContactEditModal";
import { AllColorsEditModal } from "./EditModals/AllColorsEditModal";
import { AnnouncementEditModal } from "@/components/dashboard3/EditModals/AnnouncementEditModal";
import { TickerEditModal } from "@/components/dashboard3/EditModals/TickerEditModal";
import { TextBannerEditModal } from "@/components/dashboard3/EditModals/TextBannerEditModal";
import { FeaturedProductsEditModal } from "./EditModals/FeaturedProductsEditModal";
import { TestimonialsEditModal } from "./EditModals/TestimonialsEditModal";
import { HeroShapeEditModal } from "./EditModals/HeroShapeEditModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit3, RefreshCw, Palette, LayoutGrid } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useProducts, type Product } from "@/hooks/useProducts";
import { useCategories, type Category } from "@/hooks/useCategories";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { useTenantContext } from "@/contexts/TenantContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateSelector } from "./TemplateSelector";

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
  parent_id?: string | null;
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
    position?: string;
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
  announcement?: {
    text: string;
    enabled: boolean;
    link?: string;
  };
  ticker?: {
    text: string;
    enabled: boolean;
    fontSize?: number;
    animated?: boolean;
  };
  textBanner?: {
    text: string;
    isActive: boolean;
    imageUrl?: string;
    imagePosition?: string;
  };
  hero?: {
    title?: string;
    message?: string;
    shape?: string;
    scale?: number;
  };
  featuredProducts?: string[];
  testimonials?: any;
}
type EditModalType = 'logo' | 'banners' | 'contact' | 'all-colors' | 'announcement' | 'ticker' | 'text_banner' | 'featured_products' | 'testimonials' | 'hero_shape' | null;

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
  hero: {
    title: "Para Nuestros Atletas Híbridos",
    message: "Cuando lo das todo, tu equipo también debería hacerlo. Echa un vistazo a nuestros estilos más queridos."
  },
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
  },
  announcement: {
    text: "¡Nuevos estilos cada semana! Visita el catálogo y encuentra tu look 👯‍♀️",
    enabled: true
  },
  ticker: {
    text: "Nuevos estilos cada semana",
    enabled: true
  },
  textBanner: {
    text: "Sin Límites",
    isActive: true,
    imageUrl: ""
  },
  testimonials: {
    enabled: true,
    position: "beneath_hero",
    title: "Recomendaciones",
    list: [
      {
        id: "1",
        author: "Cliente Feliz",
        role: "Comprador verificado",
        company: "",
        text: "¡Un producto increíble, totalmente recomendado!",
        logo: "/placeholder.svg"
      }
    ]
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
  const [activeEditorTab, setActiveEditorTab] = useState<"editor" | "templates">("editor");

  // Cache-buster helper to force image refresh in editor
  const withCacheBuster = (url: string) => url ? `${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}` : url;
  useEffect(() => {
    if (!tenantLoading) {
      if (tenantId) {
        loadEditorData();
      } else {
        setIsLoading(false);
      }
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
      showOnHome: category.showOnHome || true,
      parent_id: category.parent_id
    }));
    setEditorData(prev => ({
      ...prev,
      products: visualProducts,
      categories: visualCategories
    }));
  }, [products, categories]);

  // Sync settings to local editor state
  useEffect(() => {
    if (settings) {
      setEditorData(prev => ({
        ...prev,
        allColors: {
          backgroundColor: settings.store_background_color || '#ffffff',
          navbarColor: settings.navbar_bg_color || '#ffffff',
          productCardBgColor: settings.product_card_bg_color || '#ffffff',
          productCardHoverColor: settings.product_card_hover_color || '#000000',
          footerColor: settings.footer_bg_color || '#ffffff',
          headerIconColor: settings.header_icon_color || '#6b7280',
          headerIconScale: settings.header_icon_scale || 1.0,
          footerIconColor: settings.footer_icon_color || '#1f2937',
          footerIconScale: settings.footer_icon_scale || 1.0
        }
      }));
    }
  }, [settings]);

  const loadEditorData = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    console.log('Loading editor data for tenant:', tenantId);
    try {
      const {
        data: visualData,
        error
      } = await supabase.from('visual_editor_data').select('*').eq('tenant_id', tenantId);
      if (error) throw error;

      const demo = getDemoTemplate(); // Get demo data for fallback

      // Initialize editor state - only logo, banners, and contact come from visual_editor_data
      // Products and categories come from their dedicated tables via hooks
      const newEditorData: Partial<EditorData> = {};

      // Check if we have any data
      const hasData = visualData && visualData.length > 0;
      if (hasData) {
        const logoItem = visualData.find(item => item.element_type === 'logo' && item.element_id === 'main_logo');
        const announcementItem = visualData.find(item => item.element_type === 'announcement' && item.element_id === 'top_bar');
        const contactItem = visualData.find(item => item.element_type === 'contact' && item.element_id === 'store_contact');
        const bannerItems = visualData.filter(item => item.element_type === 'banner');
        const tickerItem = visualData.find(item => item.element_type === 'ticker' && item.element_id === 'ticker_bar');
        const textBannerItem = visualData.find(item => item.element_type === 'text_banner' && item.element_id === 'main_text_banner');
        const heroItem = visualData.find(item => item.element_type === 'hero' && item.element_id === 'main_hero');
        const featuredProductsItem = visualData.find(item => item.element_type === 'featured_products' && item.element_id === 'featured_grid');
        const testimonialsItem = visualData.find(item => item.element_type === 'testimonials' && item.element_id === 'main_testimonials');

        const validBanners = bannerItems.map(item => ({
          id: item.element_id,
          imageUrl: withCacheBuster((item.data as any).imageUrl),
          sort: (item.data as any).sort,
          position: (item.data as any).position || 'center center',
        }));

        setEditorData(prev => ({
          ...prev,
          logo: logoItem ? (logoItem.data as any) : prev.logo,
          announcement: announcementItem ? (announcementItem.data as any) : prev.announcement,
          contact: contactItem ? (contactItem.data as any) : prev.contact,
          banners: validBanners.length > 0 ? validBanners : prev.banners,
          ticker: tickerItem ? (tickerItem.data as any) : prev.ticker,
          textBanner: textBannerItem ? (textBannerItem.data as any) : prev.textBanner,
          hero: heroItem ? (heroItem.data as any) : prev.hero,
          featuredProducts: featuredProductsItem ? (featuredProductsItem.data as any).productIds : prev.featuredProducts,
          testimonials: testimonialsItem ? (testimonialsItem.data as any) : prev.testimonials
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

      // Save announcement
      if (demoData.announcement) {
        promises.push(supabase.from('visual_editor_data').upsert({
          tenant_id: tenantId,
          element_type: 'announcement',
          element_id: 'top_bar',
          data: demoData.announcement
        }));
      }

      // Save ticker
      if (demoData.ticker) {
        promises.push(supabase.from('visual_editor_data').upsert({
          tenant_id: tenantId,
          element_type: 'ticker',
          element_id: 'ticker_bar',
          data: demoData.ticker
        }));
      }

      // Save text banner
      if (demoData.textBanner) {
        promises.push(supabase.from('visual_editor_data').upsert({
          tenant_id: tenantId,
          element_type: 'text_banner',
          element_id: 'main_text_banner',
          data: demoData.textBanner
        }));
      }

      // Save testimonials
      if (demoData.testimonials) {
        promises.push(supabase.from('visual_editor_data').upsert({
          tenant_id: tenantId,
          element_type: 'testimonials',
          element_id: 'main_testimonials',
          data: demoData.testimonials
        }));
      }

      // Products and categories will be handled by their dedicated hooks

      await Promise.all(promises);

      // Update only visual elements, preserve products/categories from hooks
      setEditorData(prev => ({
        ...prev,
        logo: demoData.logo,
        banners: demoData.banners,
        contact: demoData.contact,
        announcement: demoData.announcement,
        ticker: demoData.ticker,
        textBanner: demoData.textBanner,
        testimonials: demoData.testimonials
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
  }>, heroText?: { title: string; description: string }, heroShape?: string) => {
    if (!tenantId) return;
    console.log('handleSaveBanners called with', bannersData, heroText, heroShape);
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
          sort: banner.sort,
          position: (banner as any).position || 'center center',
        }
      }));
      await Promise.all(promises);

      // Save Hero Text if provided
      // Save Hero Text if provided
      if (heroText) {
        console.log("Saving hero text to visual_editor_data:", heroText);

        // Merge existing hero element
        const currentHero = editorData.hero || {};
        const mergedHero = {
          ...currentHero,
          title: heroText.title,
          message: heroText.description
        };

        await saveEditorData('hero', 'main_hero', mergedHero);

        console.log("Hero text saved successfully");
        // Update local state
        setEditorData(prev => ({
          ...prev,
          hero: mergedHero
        }));
      }

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
        title: "Banners y textos guardados",
        description: "Los cambios se han actualizado en el preview"
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

  const handleSaveFeaturedProducts = async (productIds: string[]) => {
    await saveEditorData('featured_products', 'featured_grid', { productIds });
    setEditorData(prev => ({
      ...prev,
      featuredProducts: productIds
    }));
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

      // Update local state immediately for instant preview
      setEditorData(prev => ({
        ...prev,
        allColors: colors
      }));

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

  const handleSaveAnnouncement = async (announcementData: any) => {
    await saveEditorData('announcement', 'top_bar', announcementData);
    setEditorData(prev => ({
      ...prev,
      announcement: announcementData
    }));
    setActiveModal(null);
  };

  const handleSaveTicker = async (tickerData: any) => {
    await saveEditorData('ticker', 'ticker_bar', tickerData);
    setEditorData(prev => ({
      ...prev,
      ticker: tickerData
    }));
    setActiveModal(null);
  };

  const handleSaveTextBanner = async (data: any) => {
    await saveEditorData('text_banner', 'main_text_banner', data);
    setEditorData(prev => ({
      ...prev,
      textBanner: data
    }));
    setActiveModal(null);
  };

  const handleSaveTestimonials = async (data: any) => {
    await saveEditorData('testimonials', 'main_testimonials', data);
    setEditorData(prev => ({
      ...prev,
      testimonials: data
    }));
    setActiveModal(null);
  };

  const handleSaveHeroShape = async (shape: string, newBanner?: any, scale?: number) => {
    try {
      setIsSaving(true);

      const currentHero = editorData.hero || {};
      const newHero = { ...currentHero, shape, scale: scale || 100 };

      // Update hero shape data directly in the JSON
      await saveEditorData('hero', 'main_hero', newHero);

      let updatedBanners = [...(editorData.banners || [])];

      if (newBanner) {
        if (updatedBanners.length === 0) {
          const bannerToSave = { ...newBanner, id: newBanner.id || 'banner_1', sort: 0 };
          updatedBanners = [bannerToSave];
          await saveEditorData('banner', bannerToSave.id, bannerToSave);
        } else {
          updatedBanners[0] = { ...updatedBanners[0], ...newBanner };
          await saveEditorData('banner', updatedBanners[0].id || 'banner_1', updatedBanners[0]);
        }
      }

      setEditorData(prev => ({
        ...prev,
        hero: newHero,
        ...(newBanner ? { banners: updatedBanners } : {})
      }));

      setActiveModal(null);
      toast({
        title: "Forma guardada",
        description: "La forma de la imagen se actualizó correctamente",
      });
    } catch (error) {
      console.error('Error saving hero shape:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la forma de la imagen",
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

  return (
    <div className="space-y-6">
      <Tabs value={activeEditorTab} onValueChange={(v) => setActiveEditorTab(v as "editor" | "templates")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editor">Editor Visual</TabsTrigger>
          <TabsTrigger value="templates">Galería de Plantillas</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-6">
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
                    <Button variant="default" size="sm" onClick={() => setActiveEditorTab("templates")} disabled={isLoading || isSaving} className="gap-2 text-xs bg-purple-600 hover:bg-purple-700">
                      <LayoutGrid className="w-4 h-4" />
                      <span className="hidden md:inline">Cambiar Plantilla</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Galería de 10 plantillas</p>
                  </TooltipContent>
                </Tooltip>

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
                    <Button variant="outline" size="sm" onClick={() => { loadEditorData(); loadSettings(); }} disabled={isLoading || isSaving} className="gap-2 text-xs">
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
            <StorePreview
              key={`preview-${editorData.logo?.url}-${editorData.banners?.map(b => b.imageUrl).join('-')}-${JSON.stringify(editorData.allColors)}`}
              data={editorData}
              isEditorMode={isEditorMode}
              onEditElement={handleEditElement}
              onDeleteProduct={() => { }}
              onDeleteCategory={() => { }}
              backgroundColor={editorData.allColors?.backgroundColor || settings?.store_background_color || '#ffffff'}
              navbarBgColor={editorData.allColors?.navbarColor || settings?.navbar_bg_color || '#ffffff'}
              productCardBgColor={editorData.allColors?.productCardBgColor || settings?.product_card_bg_color || '#ffffff'}
              productCardHoverColor={editorData.allColors?.productCardHoverColor || settings?.product_card_hover_color || '#000000'}
              footerBgColor={editorData.allColors?.footerColor || settings?.footer_bg_color || '#ffffff'}
              headerIconColor={editorData.allColors?.headerIconColor || settings?.header_icon_color || '#6b7280'}
              headerIconScale={editorData.allColors?.headerIconScale || settings?.header_icon_scale || 1.0}
              footerIconColor={editorData.allColors?.footerIconColor || settings?.footer_icon_color || '#1f2937'}
              footerIconScale={editorData.allColors?.footerIconScale || settings?.footer_icon_scale || 1.0}
              templateId={settings?.template_id}
              textBanner={editorData.textBanner}
              welcomeTitle={editorData.hero?.title}
              welcomeMessage={editorData.hero?.message}
              featuredProducts={editorData.featuredProducts}
              testimonials={editorData.testimonials}
            />
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <TemplateSelector onUpdate={() => loadSettings()} />
        </TabsContent>
      </Tabs>

      {/* Edit Modals */}
      <LogoEditModal isOpen={activeModal === 'logo'} onClose={() => setActiveModal(null)} onSave={handleSaveLogo} initialData={editorData.logo} />
      <BannersEditModal
        isOpen={activeModal === 'banners'}
        onClose={() => setActiveModal(null)}
        onSave={(banners, text, shape) => handleSaveBanners(banners, text, shape)}
        initialData={editorData.banners}
        initialHeroText={{
          title: editorData.hero?.title || settings?.welcome_title || "",
          description: editorData.hero?.message || settings?.welcome_message || ""
        }}
        initialHeroShape={settings?.hero_image_shape || "organic"}
        templateId={settings?.template_id}
      />
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
      <AnnouncementEditModal isOpen={activeModal === 'announcement'} onClose={() => setActiveModal(null)} onSave={handleSaveAnnouncement} initialData={editorData.announcement} />
      <TickerEditModal
        isOpen={activeModal === 'ticker'}
        onClose={() => setActiveModal(null)}
        onSave={handleSaveTicker}
        initialData={editorData.ticker}
      />

      <TextBannerEditModal
        isOpen={activeModal === 'text_banner'}
        onClose={() => setActiveModal(null)}
        onSave={handleSaveTextBanner}
        initialData={editorData.textBanner}
      />

      <FeaturedProductsEditModal
        isOpen={activeModal === 'featured_products'}
        onClose={() => setActiveModal(null)}
        onSave={handleSaveFeaturedProducts}
        initialProductIds={editorData.featuredProducts}
      />

      <TestimonialsEditModal
        isOpen={activeModal === 'testimonials'}
        onClose={() => setActiveModal(null)}
        onSave={handleSaveTestimonials}
        data={editorData.testimonials}
      />

      <HeroShapeEditModal
        isOpen={activeModal === 'hero_shape'}
        onClose={() => setActiveModal(null)}
        onSave={handleSaveHeroShape}
        initialShape={editorData.hero?.shape || 'organic'}
        initialBanner={editorData.banners?.[0]}
        initialScale={editorData.hero?.scale || 100}
      />
    </div>
  );
};