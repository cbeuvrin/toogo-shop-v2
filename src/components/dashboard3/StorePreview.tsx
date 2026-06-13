import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LogoDisplay } from "@/components/ui/LogoDisplay";
import { HamburgerButton } from "@/components/ui/HamburgerButton";
import { ContactSection } from "@/components/ui/ContactSection";
import { ProductCard } from "@/components/ui/ProductCard";
import { AutoCarousel } from "@/components/ui/AutoCarousel";
import { CardStyleContext } from "@/contexts/CardStyleContext";
import { pickFontSize, pickEnabled } from "@/hooks/useDeviceType";
import {
  ShoppingCart,
  Heart,
  Search,
  Menu,
  User,
  Star,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  Zap,
  X
} from "lucide-react";
import { EditableElement } from "./EditableElement";
import { EditorData } from "./DashboardVisualEditor";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { heroFontFamily } from "@/lib/heroFonts";
import { getHeroShapeRadius as sharedHeroShapeRadius } from "@/lib/heroShapes";

// Hero font tokens resolve via the shared picker (see src/lib/heroFonts.ts)
// so the editor preview and the live store always render the same family.
const heroStyleFontFamily = heroFontFamily;

interface StorePreviewProps {
  data: EditorData;
  isEditorMode: boolean;
  onEditElement: (type: any, item?: any) => void;
  onDeleteProduct: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  /** Active device toggle in the editor — controls per-device logo sizing inside the preview. */
  deviceMode?: 'desktop' | 'tablet' | 'mobile';
  backgroundColor?: string;
  productCardBgColor?: string;
  productCardHoverColor?: string;
  navbarBgColor?: string;
  footerBgColor?: string;
  headerIconColor?: string;
  headerIconScale?: number;
  footerIconColor?: string;
  footerIconScale?: number;
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
    bgColor?: string;
    textColor?: string;
  };
  textBanner?: {
    text: string;
    isActive: boolean;
    imageUrl?: string;
  };
  templateId?: string;
  welcomeTitle?: string;
  welcomeMessage?: string;
  featuredProducts?: string[];
  featuredProducts2?: string[];
  testimonials?: any;
}

export const StorePreview = ({
  data,
  isEditorMode,
  onEditElement,
  onDeleteProduct,
  onDeleteCategory,
  deviceMode = 'desktop',
  backgroundColor,
  productCardBgColor,
  productCardHoverColor,
  navbarBgColor,
  footerBgColor,
  headerIconColor = '#6b7280',
  headerIconScale = 1.0,
  footerIconColor = '#1f2937',
  footerIconScale = 1.0,
  templateId: propTemplateId,
  textBanner,
  welcomeTitle,
  welcomeMessage,
  featuredProducts,
  featuredProducts2,
  testimonials
}: StorePreviewProps) => {
  const { settings } = useTenantSettings();
  // Resolve per-device visibility (enabled / enabledTablet / enabledMobile) against
  // the editor's device tab, so every `styles[k].enabled !== false` check below
  // reflects the simulated device. Font size is resolved inside each style helper.
  {
    const _rs = data.hero?.styles || {};
    const _resolved: Record<string, any> = {};
    for (const k in _rs) _resolved[k] = { ..._rs[k], enabled: pickEnabled(_rs[k], deviceMode) };
    data = { ...data, hero: { ...(data.hero || {}), styles: _resolved } };
  }
  // Global card typography (font + size) + click-to-edit, applied to every inline
  // product-card title in the preview so edits show live in the editor.
  const _pcText = data.hero?.styles?.productCardText;
  const _pcSize = pickFontSize(_pcText, deviceMode);
  const cardNameStyle = (_pcText?.fontFamily || _pcSize)
    ? { fontFamily: heroStyleFontFamily(_pcText?.fontFamily), fontSize: _pcSize ? `${_pcSize}px` : undefined }
    : undefined;
  const cardNameClick = isEditorMode ? (e: any) => { e.stopPropagation(); onEditElement('hero_element', 'productCardText'); } : undefined;

  // Valores base para header (100% = default)
  const BASE_INPUT_HEIGHT = 40;
  const BASE_ICON_SIZE = 20;
  const BASE_TEXT_SIZE = 14;
  const BASE_BORDER_RADIUS = 8;
  const BASE_PADDING_LEFT = 40;

  // Aplicar escala
  const scaledInputHeight = BASE_INPUT_HEIGHT * headerIconScale;
  const scaledIconSize = BASE_ICON_SIZE * headerIconScale;
  const scaledTextSize = BASE_TEXT_SIZE * headerIconScale;
  const scaledBorderRadius = BASE_BORDER_RADIUS * headerIconScale;
  const scaledPaddingLeft = BASE_PADDING_LEFT * headerIconScale;

  // Get store colors from settings or props
  const bgColor = backgroundColor || settings?.store_background_color || '#ffffff';
  const cardBgColor = productCardBgColor || settings?.product_card_bg_color || '#ffffff';
  const hoverColor = productCardHoverColor || settings?.product_card_hover_color || '#000000';
  const navColor = navbarBgColor || settings?.navbar_bg_color || '#ffffff';
  const footColor = footerBgColor || settings?.footer_bg_color || '#1a1a1a';
  // Use banners from data, fallback to default banner if empty
  const banners = data.banners && data.banners.length > 0
    ? data.banners.sort((a, b) => a.sort - b.sort).map(banner => ({
      id: banner.id,
      image: banner.imageUrl,
      position: (banner as any).position || 'center center',
    }))
    : [
      {
        id: "default-banner-1",
        image: "/assets/default-banner.jpg",
        position: "center center",
      }
    ];

  // Use real products from data, fallback to demo if empty
  const bestSellers = data.products && data.products.length > 0
    ? data.products.slice(0, 5).map(product => ({
      id: product.id,
      name: product.title || product.name,
      sku: product.sku,
      price: product.price_mxn || product.price,
      originalPrice: null,
      image: product.images && product.images.length > 0 ? product.images[0].url : "/placeholder.svg",
      rating: 4.5,
      reviews: Math.floor(Math.random() * 200) + 50,
      description: product.description || product.title || product.name
    }))
    : [
      {
        id: 1,
        name: "Producto Demo",
        price: 199.99,
        originalPrice: 249.99,
        image: "/placeholder.svg",
        rating: 4.8,
        reviews: 124,
        description: "Producto de demostración para tu tienda"
      }
    ];

  // Group real products by categories
  const categories = data.categories && data.categories.length > 0 && data.products && data.products.length > 0
    ? data.categories
      .filter(category => category.showOnHome)
      .map(category => ({
        id: category.id,
        name: category.name,
        parent_id: category.parent_id,
        products: data.products
          .filter(product => product.categories?.some(cat => cat.id === category.id))
          .slice(0, 8)
          .map(product => ({
            id: product.id,
            name: product.title || product.name,
            sku: product.sku,
            price: product.price_mxn || product.price,
            image: product.images && product.images.length > 0 ? product.images[0].url : "/placeholder.svg",
            rating: 4.5,
            description: product.description || product.title || product.name
          }))
      }))
      .filter(category => category.products.length > 0)
    : [
      {
        id: "demo-cat",
        name: "Productos Demo",
        parent_id: null,
        products: [
          {
            id: 2,
            name: "Producto Demo 1",
            price: 299.99,
            image: "/placeholder.svg",
            rating: 4.7,
            description: "Producto de demostración para tu tienda"
          }
        ]
      }
    ];

  // State
  const [currentBanner, setCurrentBanner] = useState(0);
  const [cartItems, setCartItems] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auto-slide banners
  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  // Functions
  const toggleFavorite = (productId: string) => {
    setFavorites(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const addToCart = () => {
    setCartItems(prev => prev + 1);
  };

  const nextBanner = () => {
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  };

  const prevBanner = () => {
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const openProductModal = (product: any) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setSelectedProduct(null);
  };

  const sendWhatsAppMessage = (product: any) => {
    if (!settings?.whatsapp_number) {
      console.log('No WhatsApp number configured');
      return;
    }

    // Use custom message template if available, otherwise use default
    const messageTemplate = settings.whatsapp_message ||
      `Hola 👋, quisiera más información sobre\n\n📦 {product_name}\nSKU: {sku}\nPrecio: ${'{price}'} MXN\n\n¿Está disponible y cuáles son las formas de pago?`;

    // Process the template with product data
    const processedMessage = messageTemplate
      .replace(/{product_name}/g, product.name || product.title)
      .replace(/{sku}/g, (product.sku ?? '').toString().trim() || 'N/A')
      .replace(/{price}/g, String(product.price || product.price_mxn));

    const whatsappUrl = `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(processedMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Product Card Component
  const ProductCard = ({ product, showReviews = false, isBestSeller = false }: { product: any, showReviews?: boolean, isBestSeller?: boolean }) => (
    <Card
      className="group overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-white rounded-[30px] cursor-pointer"
      onClick={() => openProductModal(product)}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50 transition-colors duration-300 p-1 rounded-[30px]">
        <div className="w-[88%] h-[88%] mx-auto mt-[6%] aspect-square overflow-hidden rounded-[30px]">
          <img
            src={Array.isArray(product.image) ? (product.image[0]?.url || "/placeholder.svg") : (product.image || "/placeholder.svg")}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        {isBestSeller && (
          <Badge className="absolute top-2 left-2 bg-gray-900 text-white text-xs px-2 py-1 rounded-[30px]">
            Más vendido
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 bg-white/80 hover:bg-white shadow-sm transition-colors duration-300"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
        >
          <Heart
            className={`h-4 w-4 transition-colors duration-300 ${favorites.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
          />
        </Button>
      </div>

      <CardContent className="p-[12px] space-y-1.5">
        <h3 className="font-medium text-gray-900 transition-colors duration-300 text-[13px] md:text-[15px] leading-tight line-clamp-2">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-[10px] md:text-[13px] text-gray-600 transition-colors duration-300 line-clamp-1 leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-900 transition-colors duration-300">${product.price}</span>
            {product.originalPrice && (
              <span className="text-xs text-gray-500 transition-colors duration-300 line-through">
                ${product.originalPrice}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );


  // ... previous helper functions remain the same ..

  // --- LAYOUTS ---

  const DefaultLayoutPreview = () => {
    // Per-element style overrides (Indico-level editing for Atlántico/Default)
    const dfStyle = (k: string) => ({
      fontFamily: heroStyleFontFamily(data.hero?.styles?.[k]?.fontFamily),
      fontSize: pickFontSize(data.hero?.styles?.[k], deviceMode) ? `${pickFontSize(data.hero?.styles?.[k], deviceMode)}px` : undefined,
      color: data.hero?.styles?.[k]?.color || undefined,
    });
    const dfText = (k: string, fallback: string) => data.hero?.styles?.[k]?.text || fallback;
    return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor }}>
      {/* Header — background editable via sectionBg.navbar */}
      <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'navbar')}>
      <header
        className="sticky top-0 z-50 border-b border-gray-200"
        style={{ backgroundColor: data.hero?.sectionBg?.navbar || navColor }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <EditableElement
              type="logo"
              isEditorMode={isEditorMode}
              onEdit={() => onEditElement('logo')}
            >
              <LogoDisplay size="md" logoSize={(settings as any)?.logo_size} logoSizeMobile={(settings as any)?.logo_size_mobile} logoSizeTablet={(settings as any)?.logo_size_tablet} forceDevice={deviceMode} fallbackText="Mi Tienda" className="h-10 w-auto" />
            </EditableElement>

            <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'searchBar')} className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2"
                  style={{
                    color: headerIconColor,
                    width: `${scaledIconSize}px`,
                    height: `${scaledIconSize}px`
                  }}
                />
                <Input
                  placeholder={dfText('searchBar', 'Buscar productos...')}
                  style={{
                    height: `${scaledInputHeight}px`,
                    fontSize: data.hero?.styles?.searchBar?.fontSize ? `${data.hero.styles.searchBar.fontSize}px` : `${scaledTextSize}px`,
                    borderColor: headerIconColor,
                    color: data.hero?.styles?.searchBar?.color || headerIconColor,
                    fontFamily: heroStyleFontFamily(data.hero?.styles?.searchBar?.fontFamily),
                    borderRadius: `${scaledBorderRadius}px`,
                    paddingLeft: `${scaledPaddingLeft}px`,
                    backgroundColor: 'transparent'
                  }}
                  className="border-2"
                />
              </div>
            </EditableElement>

            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon">
                <Heart
                  style={{
                    color: headerIconColor,
                    width: `${scaledIconSize}px`,
                    height: `${scaledIconSize}px`
                  }}
                />
              </Button>
              <EditableElement type="botón hamburguesa" isEditorMode={isEditorMode} onEdit={() => onEditElement('hamburger_style')}>
                <HamburgerButton
                  isOpen={isMobileMenuOpen}
                  onClick={() => setIsMobileMenuOpen(true)}
                  count={data.hero?.hamburgerCount || 3}
                  thickness={data.hero?.hamburgerThickness || 2}
                  size={(data.hero?.hamburgerSize || 20) * (settings as any)?.header_icon_scale || scaledIconSize}
                  color={headerIconColor}
                />
              </EditableElement>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Menú</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-4">
                <nav className="space-y-4">
                  <a href="#" className="block py-3 text-lg text-gray-700 hover:text-gray-900 border-b border-gray-100">
                    Tienda
                  </a>
                  <a href="#" className="block py-3 text-lg text-gray-700 hover:text-gray-900 border-b border-gray-100">
                    Contacto
                  </a>
                  <a href="#" className="block py-3 text-lg text-gray-700 hover:text-gray-900 border-b border-gray-100">
                    Perfil de tienda
                  </a>
                </nav>
              </div>
            </div>
          </div>
        )}
      </header>
      </EditableElement>

      {/* Banner Slider */}
      <EditableElement
        type="banners"
        isEditorMode={isEditorMode}
        onEdit={() => onEditElement('banners')}
      >
        <section id="banners" className="relative w-full aspect-[16/9] sm:aspect-[16/10] lg:aspect-[8/3] overflow-hidden">
          <div className="relative w-full h-full">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-500 ${index === currentBanner ? "opacity-100" : "opacity-0"
                  }`}
                style={{
                  backgroundImage: `url(${banner.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: banner.position || "center"
                }}
              >
              </div>
            ))}
          </div>
        </section>
      </EditableElement>

      {/* Products area — background editable via sectionBg.section1 */}
      <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section1')}>
      <div style={{ backgroundColor: data.hero?.sectionBg?.section1 || undefined }}>
      {/* Más Vendidos — click to hand-pick which products show here */}
      <section id="bestsellers" className="relative -mt-20 z-10">
        <div className="w-full px-4">
          <div className="w-full pt-8 pb-4">
            <EditableElement type="featured_products" isEditorMode={isEditorMode} onEdit={() => onEditElement('featured_products')}>
            <div className="mb-6">
              <AutoCarousel
                title=""
                products={(featuredProducts && featuredProducts.length > 0)
                  ? featuredProducts.map((id: string) => bestSellers.find((p: any) => p.id === id) || data.products?.find((p: any) => p.id === id)).filter(Boolean)
                  : bestSellers}
                isBestSellers={true}
                onProductClick={openProductModal}
                onToggleFavorite={toggleFavorite}
                favorites={favorites}
                hoverColor={hoverColor}
                cardBgColor={cardBgColor}
              />
            </div>
            </EditableElement>
          </div>
        </div>
      </section>

      {/* Categories — section titles & "Ver más" editable */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {categories.map((category, categoryIndex) => {
            const titleKey = `sectionTitle_${category.id}`;
            return (
            <EditableElement key={categoryIndex} type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', titleKey)} className="block mb-12">
              <AutoCarousel
                title={dfText(titleKey, category.name)}
                products={category.products}
                onProductClick={openProductModal}
                onViewMore={() => onEditElement('hero_element', 'viewMore')}
                onToggleFavorite={toggleFavorite}
                favorites={favorites}
                hoverColor={hoverColor}
                cardBgColor={cardBgColor}
                titleStyle={dfStyle(titleKey)}
                viewMoreText={dfText('viewMore', 'Ver más')}
                viewMoreStyle={dfStyle('viewMore')}
              />
            </EditableElement>
            );
          })}
        </div>
      </section>
      </div>
      </EditableElement>

      {/* Contact Section — background editable via sectionBg.footer */}
      <EditableElement
        type="fondo sección"
        isEditorMode={isEditorMode}
        onEdit={() => onEditElement('section_bg', 'footer')}
      >
        <ContactSection
          contactData={data.contact}
          backgroundColor={data.hero?.sectionBg?.footer || footColor}
          iconColor={footerIconColor}
          iconScale={footerIconScale}
        />
      </EditableElement>
    </div>
    );
  };

  const SimpleLiveLayoutPreview = () => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
      if (scrollContainerRef.current) {
        const scrollAmount = direction === 'left' ? -300 : 300;
        scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    };

    // Filter products with new_arrival feature
    const newArrivals = data.products?.filter((p: any) => p.features?.includes("new_arrival")) || [];
    const productsToShow = newArrivals.length > 0 ? newArrivals : bestSellers;

    // Per-element style overrides (Indico-level editing for Simple Live)
    const slStyle = (k: string) => ({
      fontFamily: heroStyleFontFamily(data.hero?.styles?.[k]?.fontFamily),
      fontSize: pickFontSize(data.hero?.styles?.[k], deviceMode) ? `${pickFontSize(data.hero?.styles?.[k], deviceMode)}px` : undefined,
      color: data.hero?.styles?.[k]?.color || undefined,
      backgroundColor: data.hero?.styles?.[k]?.bgColor || undefined,
    });
    const slText = (k: string, fallback: string) => data.hero?.styles?.[k]?.text || fallback;

    return (
      <div className="min-h-screen font-sans text-black relative" style={{ backgroundColor: bgColor }}>
        {/* Top Bar */}
        {(data.announcement?.enabled !== false) && (
          <EditableElement type="announcement" isEditorMode={isEditorMode} onEdit={() => onEditElement('announcement')}>
            <div className={`bg-gray-100 py-2 text-center text-[10px] font-semibold tracking-wide ${isEditorMode ? 'cursor-pointer hover:bg-gray-200' : ''}`} style={{ ...(data.announcement?.bgColor ? { backgroundColor: data.announcement.bgColor } : {}), ...(data.announcement?.textColor ? { color: data.announcement.textColor } : {}) }}>
              {data.announcement?.text || "¡Nuevos estilos cada semana! Visita el catálogo y encuentra tu look 👯‍♀️"}
            </div>
          </EditableElement>
        )}

        {/* Header — background editable via sectionBg.navbar */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'navbar')}>
        <header className="sticky top-0 z-50 border-b border-transparent h-16 flex items-center justify-between px-4" style={{ backgroundColor: data.hero?.sectionBg?.navbar || data.allColors?.navbarColor || navColor }}>
          <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'navMenu')} className="hidden md:block">
          <nav className="flex gap-4 text-xs font-semibold text-gray-700" style={slStyle('navMenu')}>
            {categories.filter(c => !c.parent_id && c.show_on_home !== false).map((cat: any) => (
              <span key={cat.id || cat.name} className="uppercase cursor-pointer hover:text-black">{cat.name}</span>
            ))}
            {categories.filter(c => !c.parent_id).length === 0 && (
              <>
                <span>MUJER</span>
                <span>HOMBRE</span>
              </>
            )}
          </nav>
          </EditableElement>

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" style={{ color: headerIconColor }} />
          </Button>

          <div className="absolute left-1/2 -translate-x-1/2">
            <EditableElement type="logo" isEditorMode={isEditorMode} onEdit={() => onEditElement('logo')}>
              <LogoDisplay size="sm" logoSize={(settings as any)?.logo_size} logoSizeMobile={(settings as any)?.logo_size_mobile} logoSizeTablet={(settings as any)?.logo_size_tablet} forceDevice={deviceMode} fallbackText={settings?.store_name || "Mi Tienda"} className="text-xl font-extrabold uppercase" />
            </EditableElement>
          </div>

          <div className="flex items-center gap-4">
            <Search style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
            <ShoppingCart style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
          </div>
        </header>
        </EditableElement>

        {/* Hero — photo opens banners editor; title/message/button each editable */}
        <div className="relative w-full aspect-[4/3] md:aspect-[21/9] bg-gray-200 overflow-hidden">
          <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')} className="absolute inset-0">
            {banners.length > 0 ? (
              <img src={banners[0].image} className="w-full h-full object-cover" style={{ objectPosition: banners[0].position || 'center center' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300">Banner</div>
            )}
          </EditableElement>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-8 pointer-events-none">
            <div className="pointer-events-auto flex flex-col items-start gap-2">
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'title')}>
                <h1 className="text-white text-3xl font-extrabold uppercase" style={slStyle('title')}>
                  {data.hero?.title || "Para Nuestros Atletas Híbridos"}
                </h1>
              </EditableElement>
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'message')}>
                <p className="text-white/90 text-xs max-w-sm font-medium" style={slStyle('message')}>
                  {data.hero?.message || "Cuando lo das todo, tu equipo también debería hacerlo."}
                </p>
              </EditableElement>
              <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'cta1')}>
                {data.hero?.styles?.cta1?.enabled === false ? (
                  <div className="px-4 py-2 border border-dashed border-white/60 text-white/80 text-[11px] italic uppercase cursor-pointer">Botón oculto — click para activar</div>
                ) : (
                  <Button className="bg-white text-black text-xs px-8 py-4 rounded-full font-bold border-2 border-white uppercase tracking-wider" style={slStyle('cta1')}>
                    {data.hero?.cta1Label || 'TIENDA'}
                  </Button>
                )}
              </EditableElement>
            </div>
          </div>
        </div>

        {/* Product Ticker — keeps a placeholder in editor mode so users can re-enable a hidden bar */}
        {((data.ticker?.enabled !== false) || isEditorMode) && (
          <EditableElement type="ticker" isEditorMode={isEditorMode} onEdit={() => onEditElement('ticker')}>
            {data.ticker?.enabled === false ? (
              <div className="bg-gray-100 border border-dashed border-gray-300 text-gray-500 py-2 text-center text-[11px] italic cursor-pointer hover:bg-gray-200">
                Barra de noticias oculta — click para mostrarla
              </div>
            ) : (
              <div
                className={`bg-black text-white py-2 overflow-hidden ${isEditorMode ? 'cursor-pointer hover:bg-zinc-800' : ''}`}
                style={{
                  ...(data.ticker?.bgColor ? { backgroundColor: data.ticker.bgColor } : {}),
                  ...(data.ticker?.textColor ? { color: data.ticker.textColor } : {}),
                }}
              >
                <div
                  className={`flex justify-center font-bold uppercase tracking-widest ${data.ticker?.fontSize ? '' : 'text-[10px]'}`}
                  style={data.ticker?.fontSize ? { fontSize: `${data.ticker.fontSize}px` } : undefined}
                >
                  <span>{data.ticker?.text || "Nuevos estilos cada semana"}</span>
                </div>
              </div>
            )}
          </EditableElement>
        )}

        {/* Products — section background + heading/link editable */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section1')}>
        <div className="px-4 py-8" style={{ backgroundColor: data.hero?.sectionBg?.section1 || undefined }}>
          <div className="flex items-end justify-between mb-4">
            <div>
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionTitle1')}>
                <h2 className="text-xl font-extrabold uppercase mb-2" style={slStyle('sectionTitle1')}>{slText('sectionTitle1', 'Recién Llegados')}</h2>
              </EditableElement>
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionLink1')}>
                <span className="text-xs font-semibold underline underline-offset-4 hover:text-gray-600 cursor-pointer" style={slStyle('sectionLink1')}>{slText('sectionLink1', 'Ver todo')}</span>
              </EditableElement>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => scroll('left')} className="rounded-full border-gray-300 hover:bg-gray-100 h-8 w-8">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => scroll('right')} className="rounded-full border-gray-300 hover:bg-gray-100 h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div ref={scrollContainerRef} className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
            {productsToShow.map(product => (
              <div key={product.id} className="min-w-[180px] md:min-w-[220px] cursor-pointer" onClick={() => openProductModal(product)}>
                <div className="aspect-[3/4] rounded-sm overflow-hidden mb-2 relative group transition-colors duration-300" style={{ backgroundColor: cardBgColor }}>
                  <div className="absolute inset-0 transition-colors duration-300 opacity-0 group-hover:opacity-100" style={{ backgroundColor: hoverColor }} />
                  <img src={product.image} className="w-full h-full object-cover relative z-10 mix-blend-multiply" alt={product.name} />
                  {product.features?.includes("new_arrival") && (
                    <div className="absolute top-2 left-2 bg-white px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider z-20">Nuevo</div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white hover:bg-gray-100 z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(product.id);
                    }}
                  >
                    <Heart className={`w-3 h-3 ${favorites.includes(product.id) ? 'fill-black' : ''}`} />
                  </Button>
                </div>
                <h3 className="font-bold text-xs leading-tight mb-1 text-gray-900" style={cardNameStyle} onClick={cardNameClick}>{product.name}</h3>
                <span className="text-xs font-bold text-gray-700">${product.price}</span>
              </div>
            ))}
          </div>
        </div>
        </EditableElement>

        {/* Mid Banner */}
        {(data.textBanner?.isActive !== false) && (
          <EditableElement type="text_banner" isEditorMode={isEditorMode} onEdit={() => onEditElement('text_banner')}>
            <div className={`py-4 ${isEditorMode ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
              <div
                className="w-full h-64 bg-gray-900 relative flex flex-col items-center justify-center overflow-hidden gap-4"
              >
                {data.textBanner?.imageUrl ? (
                  <>
                    <img
                      src={data.textBanner.imageUrl}
                      className="absolute inset-0 w-full h-full object-cover opacity-80"
                      style={{ objectPosition: (data.textBanner as any).imagePosition || 'center center' }}
                      alt="Banner Background"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                  </>
                ) : null}
                <span className="text-white font-black text-4xl uppercase italic z-10 relative text-center px-4">
                  {data.textBanner?.text || "Sin Límites"}
                </span>
                <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'midBannerCta')} className="z-10 relative">
                  {data.hero?.styles?.midBannerCta?.enabled === false ? (
                    <div className="px-4 py-2 border border-dashed border-white/60 text-white/80 text-[11px] italic cursor-pointer">Botón oculto — click para activar</div>
                  ) : (
                    <Button className="bg-white text-black px-8 py-5 rounded-full font-bold" style={slStyle('midBannerCta')}>
                      {slText('midBannerCta', 'Ver Colección')}
                    </Button>
                  )}
                </EditableElement>
              </div>
            </div>
          </EditableElement>
        )}

        {/* Popular Grid — background + title editable; grid opens the product picker */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section2')}>
        <div className="px-4 py-8 md:py-12" style={{ backgroundColor: data.hero?.sectionBg?.section2 || undefined }}>
          <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionTitle2')}>
            <h2 className="text-xl md:text-2xl font-extrabold uppercase mb-6" style={slStyle('sectionTitle2')}>{slText('sectionTitle2', 'Popular en este momento')}</h2>
          </EditableElement>
          <EditableElement type="featured_products" isEditorMode={isEditorMode} onEdit={() => onEditElement('featured_products')}>
          <div className={`${isEditorMode ? 'hover:bg-gray-50 cursor-pointer' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Dynamic Featured Products */}
              {(featuredProducts && featuredProducts.length > 0) ? (
                featuredProducts.map(productId => {
                  const product = data.products.find(p => p.id === productId);
                  if (!product) return null;
                  return (
                    <div key={product.id} className="relative aspect-square md:aspect-[4/3] bg-gray-100 group overflow-hidden cursor-pointer" onClick={() => openProductModal(product)}>
                      <img src={product.images[0]?.url || "/placeholder.svg"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute bottom-8 left-8">
                        <h3 className="text-white text-2xl md:text-3xl font-bold uppercase mb-2 drop-shadow-md">{product.title}</h3>
                        <span className="text-white underline font-semibold drop-shadow-md">Ver Ahora</span>
                      </div>
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                    </div>
                  );
                })
              ) : (
                // Fallback if no products selected
                <>
                  <div className="relative aspect-square md:aspect-[4/3] bg-gray-100 group overflow-hidden cursor-pointer">
                    <img src="/placeholder.svg" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute bottom-8 left-8">
                      <h3 className="text-white text-2xl md:text-3xl font-bold uppercase mb-2">Sudaderas Hombre</h3>
                      <span className="text-white underline font-semibold">Ver Ahora</span>
                    </div>
                  </div>
                  <div className="relative aspect-square md:aspect-[4/3] bg-gray-100 group overflow-hidden cursor-pointer">
                    <img src="/placeholder.svg" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute bottom-8 left-8">
                      <h3 className="text-white text-2xl md:text-3xl font-bold uppercase mb-2">Mallas Mujer</h3>
                      <span className="text-white underline font-semibold">Ver Ahora</span>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
          </EditableElement>
        </div>
        </EditableElement>

        {/* Footer — background + headings editable */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'footer')}>
        <footer className="text-white pt-16 pb-8" style={{ backgroundColor: data.hero?.sectionBg?.footer || footColor }}>
          <div className="px-4 container mx-auto">
            <EditableElement type="contact" isEditorMode={isEditorMode} onEdit={() => onEditElement('contact')}>
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 ${isEditorMode ? 'cursor-pointer hover:bg-zinc-900 p-4 -m-4 rounded-lg transition-colors' : ''}`}>

                {/* Contact Column */}
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading1')}>
                    <h4 className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500" style={slStyle('footerHeading1')}>{slText('footerHeading1', 'Contacto')}</h4>
                  </EditableElement>
                  <ul className="space-y-4 text-sm font-medium">
                    {data.contact?.whatsapp && (
                      <li className="flex items-center gap-3">
                        <span className="text-gray-300">WhatsApp:</span> {data.contact.whatsapp}
                      </li>
                    )}
                    {data.contact?.email && (
                      <li className="flex items-center gap-3">
                        <span className="text-gray-300">Email:</span> {data.contact.email}
                      </li>
                    )}
                    {!data.contact?.whatsapp && !data.contact?.email && (
                      <li className="text-zinc-600 italic">Agrega tus datos de contacto</li>
                    )}
                  </ul>
                </div>

                {/* Location Column */}
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading2')}>
                    <h4 className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500" style={slStyle('footerHeading2')}>{slText('footerHeading2', 'Ubicación')}</h4>
                  </EditableElement>
                  <p className="text-sm font-medium leading-relaxed max-w-xs text-gray-300">
                    {data.contact?.address || <span className="text-zinc-600 italic">Configura tu dirección</span>}
                  </p>
                </div>

                {/* Socials Column */}
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading3')}>
                    <h4 className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500" style={slStyle('footerHeading3')}>{slText('footerHeading3', 'Síguenos')}</h4>
                  </EditableElement>
                  <div className="flex flex-col gap-3 text-sm">
                    {data.contact?.instagram && (
                      <a href={data.contact.instagram} className="hover:text-zinc-300 transition-colors" style={{ color: footerIconColor, fontSize: `${14 * footerIconScale}px` }}>Instagram</a>
                    )}
                    {data.contact?.facebook && (
                      <a href={data.contact.facebook} className="hover:text-zinc-300 transition-colors" style={{ color: footerIconColor, fontSize: `${14 * footerIconScale}px` }}>Facebook</a>
                    )}
                    {!data.contact?.instagram && !data.contact?.facebook && (
                      <span className="text-zinc-600 italic">Agrega tus redes sociales</span>
                    )}
                  </div>
                </div>

              </div>
            </EditableElement>

            <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-600 text-[10px] uppercase tracking-wider">
              <p>© {new Date().getFullYear()} {data.logo?.alt || "Tu Tienda"}. Todos los derechos reservados.</p>
              <p>Powered by Toogo</p>
            </div>
          </div>
        </footer>
        </EditableElement>
      </div>
    );
  };

  const MinimalLayoutPreview = () => {
    // Per-element style overrides (Indico-level editing for Mediterráneo)
    const mStyle = (k: string) => ({
      fontFamily: heroStyleFontFamily(data.hero?.styles?.[k]?.fontFamily),
      fontSize: pickFontSize(data.hero?.styles?.[k], deviceMode) ? `${pickFontSize(data.hero?.styles?.[k], deviceMode)}px` : undefined,
      color: data.hero?.styles?.[k]?.color || undefined,
      backgroundColor: data.hero?.styles?.[k]?.bgColor || undefined,
    });
    const mText = (k: string, fallback: string) => data.hero?.styles?.[k]?.text || fallback;
    const visibleCategories = categories.filter((c: any) => !c.parent_id && c.show_on_home !== false);
    const productsToShow = data.products?.length > 0 ? data.products : bestSellers;

    return (
    <div className="min-h-screen font-sans selection:bg-gray-200" style={{ backgroundColor: bgColor }}>
      {/* Header — background editable via sectionBg.navbar */}
      <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'navbar')}>
      <header className="px-6 py-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md md:static text-center" style={{ backgroundColor: data.hero?.sectionBg?.navbar || data.allColors?.navbarColor || navColor }}>
        {/* Desktop Navigation Links (Left) — font/size/color editable */}
        <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'navMenu')} className="hidden md:block md:flex-1">
        <nav className="flex justify-start gap-8 text-sm uppercase tracking-widest text-gray-500 font-medium" style={mStyle('navMenu')}>
          <button className="hover:text-black transition-colors">Catálogo</button>
          <button className="hover:text-black transition-colors">Contacto</button>
        </nav>
        </EditableElement>

        {/* Mobile Menu Trigger */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu className="h-6 w-6 stroke-1" style={{ color: headerIconColor }} />
        </Button>

        {/* Logo (Center) */}
        <div className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:flex-1 md:flex md:justify-center">
          <EditableElement type="logo" isEditorMode={isEditorMode} onEdit={() => onEditElement('logo')}>
            <div onClick={(e) => isEditorMode || e.preventDefault()} className="cursor-pointer">
              <LogoDisplay
                logoUrl={data.logo?.url}
                logoSize={(settings as any)?.logo_size}
                logoSizeMobile={(settings as any)?.logo_size_mobile}
                logoSizeTablet={(settings as any)?.logo_size_tablet}
                forceDevice={deviceMode}
                size="md"
                fallbackText="M I N I M A L"
                className="text-2xl md:text-3xl font-serif font-bold tracking-tighter"
              />
            </div>
          </EditableElement>
        </div>

        {/* Icons (Right) */}
        <div className="flex items-center gap-6 md:flex-1 md:justify-end">
          <Search className="h-5 w-5 stroke-1 hidden md:block" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
          <div className="relative">
            <ShoppingCart className="h-5 w-5 stroke-1" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
            {cartItems > 0 && <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] w-3 h-3 flex items-center justify-center rounded-full">{cartItems}</span>}
          </div>
        </div>
      </header>
      </EditableElement>

      {/* Hero — photo opens banners editor; title/message/button each editable */}
      <section className="mb-12 px-4 md:px-6">
        <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-gray-100">
          <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')} className="absolute inset-0">
            {banners[0]?.image ? (
              <img src={banners[0].image} className="w-full h-full object-cover" style={{ objectPosition: banners[0].position || 'center center' }} alt="Banner" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                <span className="text-5xl font-serif italic opacity-30">Nueva Colección</span>
              </div>
            )}
          </EditableElement>
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
            <div className="text-center text-white px-4 pointer-events-auto flex flex-col items-center gap-3">
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'title')}>
                <h2 className="text-3xl md:text-6xl font-serif drop-shadow-md" style={mStyle('title')}>{data.hero?.title || 'Esenciales de Temporada'}</h2>
              </EditableElement>
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'message')}>
                <p className="text-base md:text-lg font-light tracking-wide drop-shadow-md" style={mStyle('message')}>{data.hero?.message || 'Descubre la nueva colección minimalista.'}</p>
              </EditableElement>
              <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'cta1')}>
                {data.hero?.styles?.cta1?.enabled === false ? (
                  <div className="px-4 py-2 border border-dashed border-white/60 text-white/80 text-[11px] italic uppercase cursor-pointer">Botón oculto — click para activar</div>
                ) : (
                  <Button className="bg-white text-black hover:bg-white/90 rounded-none px-6 py-4 md:px-8 md:py-6 text-xs uppercase tracking-[0.2em]" style={mStyle('cta1')}>
                    {data.hero?.cta1Label || 'Ver colección'}
                  </Button>
                )}
              </EditableElement>
            </div>
          </div>
        </div>
      </section>

      {/* Categories filter bar — mirrors the live store */}
      <div className="container mx-auto px-4 md:px-6 mb-12 overflow-x-auto">
        <ul className="flex flex-nowrap md:flex-wrap items-center justify-start md:justify-center gap-8 text-sm uppercase tracking-widest text-gray-500 font-medium min-w-max md:min-w-0">
          <li><span className="text-black border-b border-black cursor-pointer">Todo</span></li>
          {visibleCategories.map((cat: any) => (
            <li key={cat.id}><span className="hover:text-black transition-colors cursor-pointer">{cat.name}</span></li>
          ))}
        </ul>
      </div>

      {/* Products — single grid, mirrors the live store; background editable */}
      <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section1')}>
      <main className="px-4 md:px-6 pb-16" style={{ backgroundColor: data.hero?.sectionBg?.section1 || undefined }}>
        <div className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-8 md:gap-y-16">
          {productsToShow.slice(0, 8).map((product: any) => (
            <div key={product.id} className="group cursor-pointer" onClick={() => openProductModal(product)}>
              <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden mb-4">
                <img src={product.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={product.name} />
              </div>
              <div className="text-center">
                <h3 className="text-sm text-gray-900 font-medium mb-1 line-clamp-1" style={cardNameStyle} onClick={cardNameClick}>{product.name}</h3>
                <span className="text-gray-500 font-light">${product.price}</span>
              </div>
            </div>
          ))}
        </div>
        </div>
      </main>
      </EditableElement>

      {/* Editorial banner (banners[1]) — placeholder visible in editor mode */}
      {(banners[1]?.image || isEditorMode) && (
        <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')}>
          <section className="mb-16 px-4 md:px-6">
            <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-gray-100">
              {banners[1]?.image ? (
                <img src={banners[1].image} className="w-full h-full object-cover" style={{ objectPosition: banners[1].position || 'center center' }} alt="Banner editorial" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm italic">
                  Banner editorial — sube la "Foto 2" en Imágenes de la Plantilla
                </div>
              )}
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'midBannerTitle')}>
                  <h2 className="text-3xl md:text-5xl font-serif text-white drop-shadow-md text-center px-4" style={mStyle('midBannerTitle')}>
                    {mText('midBannerTitle', 'Hecho para durar')}
                  </h2>
                </EditableElement>
              </div>
            </div>
          </section>
        </EditableElement>
      )}

      {/* Destacados — hand-picked featured products */}
      <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section2')}>
      <section className="px-4 md:px-6 pb-20" style={{ backgroundColor: data.hero?.sectionBg?.section2 || undefined }}>
        <div className="container mx-auto">
          <div className="text-center mb-10 pt-4">
            <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionTitle2')}>
              <h2 className="text-3xl font-serif mb-2" style={mStyle('sectionTitle2')}>{mText('sectionTitle2', 'Destacados')}</h2>
            </EditableElement>
            <div className="w-12 h-0.5 bg-black mx-auto"></div>
          </div>
          <EditableElement type="featured_products" isEditorMode={isEditorMode} onEdit={() => onEditElement('featured_products')}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-8">
              {((featuredProducts && featuredProducts.length > 0)
                ? featuredProducts.map((id: string) => data.products?.find((p: any) => p.id === id)).filter(Boolean)
                : productsToShow.slice(0, 4)
              ).map((product: any) => (
                <div key={product.id} className="group cursor-pointer">
                  <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden mb-4">
                    <img src={product.image || (typeof product.images?.[0] === 'object' ? product.images[0]?.url : product.images?.[0]) || '/placeholder.svg'} className="w-full h-full object-cover" alt={product.name} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm text-gray-900 font-medium mb-1 line-clamp-1" style={cardNameStyle} onClick={cardNameClick}>{product.name}</h3>
                    <span className="text-gray-500 font-light">${product.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </EditableElement>
        </div>
      </section>
      </EditableElement>

      {/* Footer — 3 columns, mirrors the live store; background + headings editable */}
      <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'footer')}>
      <footer className="border-t border-gray-100 py-16 px-6" style={{ backgroundColor: data.hero?.sectionBg?.footer || footColor }}>
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-center md:text-left">
          <div>
            <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading1')}>
              <h3 className="uppercase text-xs tracking-widest font-bold mb-4" style={mStyle('footerHeading1')}>{mText('footerHeading1', 'Nosotros')}</h3>
            </EditableElement>
            <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerAbout')}>
              <p className="text-sm text-gray-500 font-light leading-relaxed max-w-xs mx-auto md:mx-0" style={mStyle('footerAbout')}>
                {mText('footerAbout', 'Una selección curada de esenciales minimalistas para el estilo de vida moderno.')}
              </p>
            </EditableElement>
          </div>
          <div>
            <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading2')}>
              <h3 className="uppercase text-xs tracking-widest font-bold mb-4" style={mStyle('footerHeading2')}>{mText('footerHeading2', 'Contacto')}</h3>
            </EditableElement>
            <EditableElement type="contact" isEditorMode={isEditorMode} onEdit={() => onEditElement('contact')}>
              <div>
                {data.contact?.email && <p className="text-sm text-gray-500 font-light mb-1">{data.contact.email}</p>}
                {(data.contact?.phone || data.contact?.whatsapp) && <p className="text-sm text-gray-500 font-light">{data.contact?.phone || data.contact?.whatsapp}</p>}
                {!data.contact?.email && !data.contact?.phone && !data.contact?.whatsapp && <p className="text-sm text-gray-400 font-light italic cursor-pointer">Agrega tus datos de contacto</p>}
              </div>
            </EditableElement>
          </div>
          <div>
            <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading3')}>
              <h3 className="uppercase text-xs tracking-widest font-bold mb-4" style={mStyle('footerHeading3')}>{mText('footerHeading3', 'Síguenos')}</h3>
            </EditableElement>
            <EditableElement type="contact" isEditorMode={isEditorMode} onEdit={() => onEditElement('contact')}>
              <div className="flex justify-center md:justify-start gap-4">
                {data.contact?.instagram && <span className="text-sm" style={{ color: footerIconColor }}>Instagram</span>}
                {data.contact?.facebook && <span className="text-sm" style={{ color: footerIconColor }}>Facebook</span>}
                {!data.contact?.instagram && !data.contact?.facebook && <span className="text-sm text-gray-400 font-light italic cursor-pointer">Agrega tus redes sociales</span>}
              </div>
            </EditableElement>
          </div>
        </div>
        <div className="mt-12 text-center text-xs text-gray-300">
          &copy; {new Date().getFullYear()} {data.logo?.alt || 'Tu Tienda'}. Todos los derechos reservados. Powered by TOOGO.
        </div>
      </footer>
      </EditableElement>
    </div>
    );
  };

  const TrendyFashionLayoutPreview = () => {
    const productsToShow = data.products?.length > 0 ? data.products.slice(0, 8) : bestSellers;
    const getHeroShapeRadius = sharedHeroShapeRadius;
    const heroShape = data.hero?.shape || settings?.hero_image_shape || 'organic';
    // Functional hero carousel in the preview, mirroring the live template.
    const [heroIdx, setHeroIdx] = useState(0);
    const heroSlides = Math.max(banners.length || 1, 1);
    const heroBanner = banners[heroIdx % heroSlides] || banners[0];

    // Per-element style overrides (Indico-level editing for Trendy)
    const tfStyle = (k: string) => ({
      fontFamily: heroStyleFontFamily(data.hero?.styles?.[k]?.fontFamily),
      fontSize: pickFontSize(data.hero?.styles?.[k], deviceMode) ? `${pickFontSize(data.hero?.styles?.[k], deviceMode)}px` : undefined,
      color: data.hero?.styles?.[k]?.color || undefined,
      backgroundColor: data.hero?.styles?.[k]?.bgColor || undefined,
    });
    const tfText = (k: string, fallback: string) => data.hero?.styles?.[k]?.text || fallback;

    return (
      <div className="min-h-screen font-sans text-gray-900" style={{ backgroundColor: bgColor || '#e8f0ef' }}>
        {/* Announcement bar — editable */}
        {data.announcement?.enabled !== false && (
          <EditableElement type="announcement" isEditorMode={isEditorMode} onEdit={() => onEditElement('announcement')}>
            <div className="bg-gray-800 text-white text-center py-2 text-xs font-medium tracking-wide" style={{ ...(data.announcement?.bgColor ? { backgroundColor: data.announcement.bgColor } : {}), ...(data.announcement?.textColor ? { color: data.announcement.textColor } : {}) }}>
              {data.announcement?.text || "¡Envío gratis en tu primera compra! 🎉"}
            </div>
          </EditableElement>
        )}

        {/* Header — background editable via sectionBg.navbar (falls back to global navbar color) */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'navbar')}>
        <header className="px-6 py-4 flex items-center justify-between relative z-50" style={{ backgroundColor: data.hero?.sectionBg?.navbar || data.allColors?.navbarColor || settings?.navbar_bg_color || 'transparent' }}>
          <EditableElement type="logo" isEditorMode={isEditorMode} onEdit={() => onEditElement('logo')}>
            <LogoDisplay size="md" logoSize={(settings as any)?.logo_size} logoSizeMobile={(settings as any)?.logo_size_mobile} logoSizeTablet={(settings as any)?.logo_size_tablet} forceDevice={deviceMode} fallbackText="Fashion" className="text-2xl font-serif font-bold tracking-tight text-gray-900" />
          </EditableElement>
          <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'navMenu')} className="hidden md:block">
          <nav className="flex items-center gap-6 text-sm font-medium text-gray-700" style={tfStyle('navMenu')}>
            {categories.filter(c => !c.parent_id && c.show_on_home !== false).slice(0, 5).map((cat: any) => (
              <span key={cat.id} className="hover:text-gray-900 cursor-pointer">{cat.name}</span>
            ))}
            {categories.length === 0 && (<><span>Belleza</span><span>Hombre</span><span>Mujer</span><span>Niños</span><span>Nosotros</span></>)}
          </nav>
          </EditableElement>
          <div className="flex items-center gap-3">
            <ShoppingCart style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
            <Heart style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
            <button className="hidden md:flex items-center gap-2 bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-full">Contacto</button>
          </div>
        </header>
        </EditableElement>

        {/* Hero — background + each text element editable separately */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'hero')}>
          <section className={`relative w-full min-h-[75vh] flex items-center px-6 lg:px-16 py-8 ${deviceMode === 'mobile' ? 'flex-col' : 'flex-col lg:flex-row'}`} style={{ backgroundColor: data.hero?.sectionBg?.hero || undefined }}>
            {/* Left text */}
            <div className={`w-full flex flex-col justify-center py-10 z-10 gap-4 ${deviceMode === 'mobile' ? 'order-1' : 'lg:w-1/2 order-2 lg:order-1'}`}>
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'title')}>
                <h1 className="text-4xl lg:text-5xl font-serif font-bold leading-tight text-gray-900 whitespace-pre-line" style={tfStyle('title')}>
                  {data.hero?.title || 'Los Mejores Productos\npara Tu Estilo\nPersonal'}
                </h1>
              </EditableElement>
              <div className="flex gap-4 flex-wrap">
                <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'cta1')}>
                  {data.hero?.styles?.cta1?.enabled === false ? (
                    <div className="px-4 py-2 border border-dashed border-gray-300 text-gray-400 text-[11px] italic cursor-pointer hover:bg-gray-50">Botón principal oculto — click para activar</div>
                  ) : (
                    <button className="bg-gray-900 text-white px-7 py-2.5 text-xs font-semibold" style={tfStyle('cta1')}>{data.hero?.cta1Label || 'Ver Ahora'}</button>
                  )}
                </EditableElement>
                <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'cta2')}>
                  {data.hero?.styles?.cta2?.enabled === false ? (
                    <div className="px-4 py-2 border border-dashed border-gray-300 text-gray-400 text-[11px] italic cursor-pointer hover:bg-gray-50">Botón secundario oculto — click para activar</div>
                  ) : (
                    <button className="border border-gray-900 text-gray-900 px-7 py-2.5 text-xs font-semibold" style={tfStyle('cta2')}>{data.hero?.cta2Label || 'Nueva Colección'}</button>
                  )}
                </EditableElement>
              </div>
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'promoText')}>
                <p className="text-sm text-gray-600" style={tfStyle('promoText')}>
                  {data.hero?.styles?.promoText?.text
                    ? data.hero.styles.promoText.text
                    : (<>¡Ahorra <span className="text-xl font-bold text-gray-900">20% Ahora!</span></>)}
                </p>
              </EditableElement>
            </div>
            {/* Right image */}
            <div className={`w-full flex items-center justify-center relative ${deviceMode === 'mobile' ? 'order-2' : 'lg:w-1/2 order-1 lg:order-2'}`}>
              {/* Rotating badge */}
              <div className="absolute top-6 right-6 z-20 w-20 h-20">
                <svg viewBox="0 0 100 100" className="w-full h-full" style={{ animation: 'rotate-text 10s linear infinite' }}>
                  <style>{`@keyframes rotate-text { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
                  <defs><path id="tft-circle" d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" /></defs>
                  <text className="fill-gray-600" fontSize="10.5" letterSpacing="3">
                    <textPath href="#tft-circle">Fashion • Fashion • Fashion • </textPath>
                  </text>
                  <circle cx="50" cy="50" r="8" fill="#f5e6d3" />
                </svg>
              </div>
              {/* Organic shaped image — click opens the 3-photo carousel editor;
                  the shape/size modal gets its own button below. */}
              <div className="relative w-64 h-80 lg:w-72 lg:h-96 flex items-center justify-center">
                <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')} className="w-full h-full">
                  <div
                    className="w-full h-full overflow-hidden shadow-xl transition-transform duration-300"
                    style={{
                      borderRadius: getHeroShapeRadius(heroShape),
                      backgroundColor: '#f5e6d3',
                      transform: `scale(${(data.hero?.scale || 100) / 100})`
                    }}
                  >
                    {heroBanner?.image ? (
                      <img key={heroIdx} src={heroBanner.image} alt="Hero" className="w-full h-full object-cover animate-in fade-in" style={{ objectPosition: heroBanner.position || 'center center' }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">Fotos del carrusel</div>
                    )}
                  </div>
                </EditableElement>
                {isEditorMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditElement('hero_shape'); }}
                    className="absolute -bottom-9 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-white border border-gray-300 shadow-sm text-gray-700 text-[11px] font-semibold px-3 py-1.5 rounded-full hover:bg-gray-50"
                    title="Cambiar la forma y el tamaño del marco"
                  >
                    ✨ Forma y tamaño
                  </button>
                )}
              </div>
              {/* Slide counter */}
              <div className="absolute bottom-2 right-0 text-right">
                <p className="text-sm font-semibold text-gray-600">0{(heroIdx % heroSlides) + 1}/ {String(heroSlides).padStart(2, '0')}</p>
              </div>
              {heroSlides > 1 && (
                <div className="absolute bottom-2 right-16 flex gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); setHeroIdx(prev => (prev - 1 + heroSlides) % heroSlides); }} className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs"><ChevronLeft className="w-3 h-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setHeroIdx(prev => (prev + 1) % heroSlides); }} className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs"><ChevronRight className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          </section>
        </EditableElement>

        {/* Ticker — editable */}
        {data.ticker?.enabled !== false && (
          <EditableElement type="ticker" isEditorMode={isEditorMode} onEdit={() => onEditElement('ticker')}>
            <div className="border-y border-gray-300 bg-white py-3 overflow-hidden" style={data.ticker?.bgColor ? { backgroundColor: data.ticker.bgColor } : undefined}>
              <div className="flex justify-center whitespace-nowrap">
                <span className={`font-bold uppercase tracking-widest text-gray-500 ${data.ticker?.fontSize ? '' : 'text-xs'}`} style={{ ...(data.ticker?.fontSize ? { fontSize: `${data.ticker.fontSize}px` } : {}), ...(data.ticker?.textColor ? { color: data.ticker.textColor } : {}) }}>
                  {data.ticker?.text || 'NUEVA COLECCIÓN • ENVÍO GRATIS • CALIDAD PREMIUM'}
                </span>
              </div>
            </div>
          </EditableElement>
        )}

        {/* Products — section background + heading/link editable */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section1')}>
        <section style={{ backgroundColor: data.hero?.sectionBg?.section1 || undefined }}>
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionTitle1')}>
                <h2 className="text-3xl font-serif font-bold" style={tfStyle('sectionTitle1')}>{tfText('sectionTitle1', 'Nueva Colección')}</h2>
              </EditableElement>
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionSubtitle1')}>
                <p className="text-gray-500 text-sm mt-1" style={tfStyle('sectionSubtitle1')}>{tfText('sectionSubtitle1', 'Los mejores estilos de temporada')}</p>
              </EditableElement>
            </div>
            <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionLink1')}>
              <span className="text-sm font-semibold underline underline-offset-4 text-gray-600 cursor-pointer" style={tfStyle('sectionLink1')}>{tfText('sectionLink1', 'Ver todo')}</span>
            </EditableElement>
          </div>
          {/* Click the grid to hand-pick which products show here */}
          <EditableElement type="featured_products" isEditorMode={isEditorMode} onEdit={() => onEditElement('featured_products')}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {((featuredProducts && featuredProducts.length > 0)
              ? featuredProducts.map((id: string) => data.products?.find((p: any) => p.id === id)).filter(Boolean)
              : productsToShow.slice(0, 4)
            ).map((product: any) => (
              <div key={product.id} className="group cursor-pointer">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl mb-3" style={{ backgroundColor: cardBgColor }}>
                  <img src={product.image || (typeof product.images?.[0] === 'object' ? product.images[0]?.url : product.images?.[0]) || '/placeholder.svg'} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <h3 className="font-medium text-sm text-gray-900" style={cardNameStyle} onClick={cardNameClick}>{product.name}</h3>
                <span className="font-bold text-sm">${product.price}</span>
              </div>
            ))}
          </div>
          </EditableElement>
        </div>
        </section>
        </EditableElement>

        {/* Footer — background + headings editable */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'footer')}>
        <footer className="text-white pt-12 pb-8" style={{ backgroundColor: data.hero?.sectionBg?.footer || footColor }}>
          <div className="container mx-auto px-6">
            <EditableElement type="contact" isEditorMode={isEditorMode} onEdit={() => onEditElement('contact')}>
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-10 mb-12 ${isEditorMode ? 'cursor-pointer hover:bg-white/5 p-4 rounded-lg transition-colors' : ''}`}>
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading1')}>
                    <h4 className="font-bold uppercase mb-4 text-xs tracking-widest text-zinc-500" style={tfStyle('footerHeading1')}>{tfText('footerHeading1', 'Contacto')}</h4>
                  </EditableElement>
                  {data.contact?.whatsapp && <p className="text-sm text-gray-300">{data.contact.whatsapp}</p>}
                  {data.contact?.email && <p className="text-sm text-gray-300">{data.contact.email}</p>}
                  {!data.contact?.whatsapp && !data.contact?.email && <p className="text-zinc-600 italic text-sm">Agrega tus datos de contacto</p>}
                </div>
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading2')}>
                    <h4 className="font-bold uppercase mb-4 text-xs tracking-widest text-zinc-500" style={tfStyle('footerHeading2')}>{tfText('footerHeading2', 'Ubicación')}</h4>
                  </EditableElement>
                  <p className="text-sm text-gray-300">{data.contact?.address || <span className="text-zinc-600 italic">Configura tu dirección</span>}</p>
                </div>
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading3')}>
                    <h4 className="font-bold uppercase mb-4 text-xs tracking-widest text-zinc-500" style={tfStyle('footerHeading3')}>{tfText('footerHeading3', 'Síguenos')}</h4>
                  </EditableElement>
                  <div className="flex flex-col gap-2 text-sm">
                    {data.contact?.instagram && <a href={data.contact.instagram} style={{ color: footerIconColor, fontSize: `${14 * footerIconScale}px` }}>Instagram</a>}
                    {data.contact?.facebook && <a href={data.contact.facebook} style={{ color: footerIconColor, fontSize: `${14 * footerIconScale}px` }}>Facebook</a>}
                    {!data.contact?.instagram && !data.contact?.facebook && <span className="text-zinc-600 italic">Agrega tus redes sociales</span>}
                  </div>
                </div>
              </div>
            </EditableElement>
            <div className="border-t border-zinc-800 pt-6 flex flex-col md:flex-row justify-between text-zinc-600 text-[10px] uppercase tracking-wider gap-3">
              <p>© {new Date().getFullYear()} {data.logo?.alt || 'Tu Tienda'}. Todos los derechos reservados.</p>
              <p>Powered by Toogo</p>
            </div>
          </div>
        </footer>
        </EditableElement>
      </div>
    );
  };

  const FashionLayoutPreview = () => {
    // Collect all products for Just Dropped section
    const productsToShow = data.products?.length > 0 ? data.products : bestSellers;

    // Per-element style overrides (Indico-level editing for Adriático)
    const fStyle = (k: string) => ({
      fontFamily: heroStyleFontFamily(data.hero?.styles?.[k]?.fontFamily),
      fontSize: pickFontSize(data.hero?.styles?.[k], deviceMode) ? `${pickFontSize(data.hero?.styles?.[k], deviceMode)}px` : undefined,
      color: data.hero?.styles?.[k]?.color || undefined,
      backgroundColor: data.hero?.styles?.[k]?.bgColor || undefined,
    });
    const fText = (k: string, fallback: string) => data.hero?.styles?.[k]?.text || fallback;

    return (
      <div className="min-h-screen font-sans bg-white text-black">
        {/* Header — background editable via sectionBg.navbar */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'navbar')}>
        <header className="px-6 py-4 flex flex-col gap-4 border-b border-gray-200 sticky top-0 z-50 bg-white md:static" style={{ backgroundColor: data.hero?.sectionBg?.navbar || data.allColors?.navbarColor || settings?.navbar_bg_color || '#ffffff' }}>
          <div className="flex items-center justify-between">
            {/* Left: social + announcement (mirrors the live store) */}
            <div className="hidden md:flex items-center gap-4 text-xs font-semibold tracking-wider text-gray-500">
              {data.contact?.facebook && <span style={{ color: headerIconColor }}>f</span>}
              {data.contact?.instagram && <span style={{ color: headerIconColor }}>in</span>}
              <EditableElement type="anuncio" isEditorMode={isEditorMode} onEdit={() => onEditElement('announcement')}>
                <span className="ml-4 text-[10px] text-black cursor-pointer" style={data.announcement?.textColor ? { color: data.announcement.textColor } : undefined}>
                  {data.announcement?.enabled && data.announcement?.text
                    ? data.announcement.text
                    : <span className="italic text-gray-400">Anuncio oculto — click para configurarlo</span>}
                </span>
              </EditableElement>
            </div>

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="h-6 w-6 stroke-1" style={{ color: headerIconColor }} />
            </Button>

            {/* Center: Logo */}
            <div className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0">
              <EditableElement type="logo" isEditorMode={isEditorMode} onEdit={() => onEditElement('logo')}>
                <div onClick={(e) => isEditorMode || e.preventDefault()} className="cursor-pointer">
                  <LogoDisplay
                    logoUrl={data.logo?.url}
                    logoSize={(settings as any)?.logo_size}
                    logoSizeMobile={(settings as any)?.logo_size_mobile}
                    logoSizeTablet={(settings as any)?.logo_size_tablet}
                    forceDevice={deviceMode}
                    size="md"
                    fallbackText="FASHION"
                    className="text-3xl font-black uppercase tracking-tighter"
                  />
                </div>
              </EditableElement>
            </div>

            {/* Right: Icons */}
            <div className="flex items-center gap-4 md:gap-6">
              <User className="h-5 w-5 stroke-1 hidden md:block" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
              <Search className="h-5 w-5 stroke-1" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
              <Heart className="h-5 w-5 stroke-1 hidden md:block" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
              <div className="relative">
                <ShoppingCart className="h-5 w-5 stroke-1" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                {cartItems > 0 && <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] w-3 h-3 flex items-center justify-center rounded-full">{cartItems}</span>}
              </div>
            </div>
          </div>

          {/* Bottom Nav — same filtering as the live store, font/size/color editable */}
          <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'navMenu')} className="hidden md:block">
          <nav className="flex justify-center gap-8 text-xs font-bold uppercase tracking-widest text-black" style={fStyle('navMenu')}>
            {categories.filter((c: any) => !c.parent_id && c.show_on_home !== false).slice(0, 5).map((cat: any) => (
              <span key={cat.id} className="cursor-pointer hover:text-gray-500">{cat.name}</span>
            ))}
            {categories.length === 0 && (
              <>
                <span className="cursor-pointer hover:text-gray-500">Inicio</span>
                <span className="cursor-pointer hover:text-gray-500">Tienda</span>
                <span className="cursor-pointer hover:text-gray-500">Blog</span>
                <span className="cursor-pointer hover:text-gray-500">Contacto</span>
              </>
            )}
          </nav>
          </EditableElement>
        </header>
        </EditableElement>

        {/* Hero — photos open the banners editor; each text element opens its own modal */}
        <div className={`flex w-full bg-white relative ${deviceMode === 'mobile' ? 'flex-col' : 'flex-col lg:flex-row'}`}>
          <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')} className={`w-full ${deviceMode === 'mobile' ? 'order-2' : 'lg:w-1/2'}`}>
            <div className="w-full h-full md:aspect-[4/5] lg:aspect-auto lg:h-[80vh] bg-gray-100">
              <img src={banners[0]?.image || "/placeholder.svg"} className="w-full h-full object-cover" style={{ objectPosition: banners[0]?.position || 'center center' }} alt="Hero Main" />
            </div>
          </EditableElement>

          <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'hero')} className={`w-full ${deviceMode === 'mobile' ? 'order-1' : 'lg:w-1/2'}`}>
          <div className="bg-white flex flex-col justify-center px-8 lg:px-20 py-16 relative h-full" style={{ backgroundColor: data.hero?.sectionBg?.hero || undefined }}>
            <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')} className="hidden lg:block absolute top-12 right-20 z-10">
              <div className="w-32 h-32 bg-gray-100">
                <img src={banners[1]?.image || "/placeholder.svg"} className="w-full h-full object-cover" style={{ objectPosition: banners[1]?.position || 'center center' }} alt="Hero Small Top" />
              </div>
            </EditableElement>

            <div className="max-w-xl relative z-20 flex flex-col gap-4">
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'title')}>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] whitespace-pre-wrap" style={fStyle('title')}>
                  {data.hero?.title || "Nueva Colección\nde Verano"}
                </h1>
              </EditableElement>
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'message')}>
                <p className="text-gray-500 text-sm max-w-md font-medium leading-relaxed" style={fStyle('message')}>
                  {data.hero?.message || "Descubre la nueva colección de moda con colores vibrantes, estampados únicos y piezas cómodas perfectas para cualquier ocasión."}
                </p>
              </EditableElement>

              <div className="flex gap-4 flex-wrap">
                <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'cta1')}>
                  {data.hero?.styles?.cta1?.enabled === false ? (
                    <div className="px-4 py-2 border border-dashed border-gray-300 text-gray-400 text-[11px] italic uppercase cursor-pointer hover:bg-gray-50">Botón principal oculto — click para activar</div>
                  ) : (
                    <Button className="bg-black text-white hover:bg-black/90 rounded-none px-8 py-6 text-xs font-bold uppercase tracking-widest" style={fStyle('cta1')}>
                      {data.hero?.cta1Label || "Ver Colección"}
                    </Button>
                  )}
                </EditableElement>
                <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'cta2')}>
                  {data.hero?.styles?.cta2?.enabled === false ? (
                    <div className="px-4 py-2 border border-dashed border-gray-300 text-gray-400 text-[11px] italic uppercase cursor-pointer hover:bg-gray-50">Botón secundario oculto — click para activar</div>
                  ) : (
                    <Button variant="outline" className="border-black text-black hover:bg-gray-50 rounded-none px-8 py-6 text-xs font-bold uppercase tracking-widest" style={fStyle('cta2')}>
                      {data.hero?.cta2Label || "Novedades"}
                    </Button>
                  )}
                </EditableElement>
              </div>
            </div>

            <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')} className="hidden lg:block absolute bottom-0 right-12 z-10">
              <div className="w-48 h-64 bg-gray-100">
                <img src={banners[2]?.image || "/placeholder.svg"} className="w-full h-full object-cover" style={{ objectPosition: banners[2]?.position || 'center center' }} alt="Hero Small Bottom" />
              </div>
            </EditableElement>
          </div>
          </EditableElement>
        </div>

        {/* Ticker — keeps a placeholder in editor mode so users can re-enable a hidden bar */}
        {((data.ticker?.enabled !== false) || isEditorMode) && (
          <EditableElement type="ticker" isEditorMode={isEditorMode} onEdit={() => onEditElement('ticker')}>
            {data.ticker?.enabled === false ? (
              <div className="bg-gray-100 border border-dashed border-gray-300 text-gray-500 py-3 text-center text-[11px] italic cursor-pointer hover:bg-gray-200">
                Barra de noticias oculta — click para mostrarla
              </div>
            ) : (
              <div
                className={`border-y-2 border-black bg-white py-4 overflow-hidden ${isEditorMode ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                style={data.ticker?.bgColor ? { backgroundColor: data.ticker.bgColor } : undefined}
              >
                <div
                  className={`flex justify-center flex-nowrap whitespace-nowrap gap-8 font-black uppercase tracking-tighter ${data.ticker?.fontSize ? '' : 'text-lg lg:text-3xl'}`}
                  style={{
                    ...(data.ticker?.fontSize ? { fontSize: `${data.ticker.fontSize}px` } : {}),
                    ...(data.ticker?.textColor ? { color: data.ticker.textColor } : {}),
                  }}
                >
                  {Array(6).fill(data.ticker?.text || "SOPORTE 24/7 • CALIDAD PREMIUM • ENVÍO GRATIS • GARANTÍA TOTAL").map((text, i) => (
                    <span key={i}>{text}</span>
                  ))}
                </div>
              </div>
            )}
          </EditableElement>
        )}

        {/* Just Dropped Section — title + background editable */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section1')}>
        <section className="py-20 bg-white" style={{ backgroundColor: data.hero?.sectionBg?.section1 || undefined }}>
          <div className="container mx-auto px-4 text-center mb-12">
            <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionTitle1')}>
              <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter mb-8" style={fStyle('sectionTitle1')}>
                {fText('sectionTitle1', 'RECIÉN LLEGADOS')}
              </h2>
            </EditableElement>

            <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-sm font-bold uppercase tracking-widest text-gray-400">
              {categories.filter((c: any) => !c.parent_id && c.show_on_home !== false).slice(0, 4).map((cat) => (
                <span key={cat.id} className="cursor-pointer hover:text-black hover:border-b-2 hover:border-black pb-1">
                  {cat.name}
                </span>
              ))}
              {categories.length === 0 && (
                <>
                  <span className="cursor-pointer hover:text-black">Mujeres</span>
                  <span className="cursor-pointer hover:text-black">Hombres</span>
                  <span className="cursor-pointer hover:text-black">Niños</span>
                  <span className="cursor-pointer hover:text-black">Accesorios</span>
                </>
              )}
            </div>
          </div>

          {/* Zero-gap Grid */}
          <div className="w-full flex flex-col md:flex-row relative z-10 md:px-0">
            {productsToShow.slice(0, 4).map((product: any, idx) => (
              <div key={product.id} className={`w-full md:w-1/4 group cursor-pointer border-r border-gray-100 last:border-r-0 hover:bg-gray-50 transition-colors shrink-0`} onClick={() => openProductModal(product)}>
                <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
                  <img src={product.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={product.name} />

                  <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="secondary" size="icon" className="w-10 h-10 rounded-full bg-white text-black shadow-md hover:bg-black hover:text-white" onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}>
                      <Heart className={`w-4 h-4 ${favorites.includes(product.id) ? 'fill-black' : ''}`} />
                    </Button>
                  </div>
                </div>

                <div className="bg-transparent p-6 pb-8">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 mt-1">{data.logo?.alt || "Brand"}</p>
                  <h3 className="text-sm font-medium text-black mb-3 line-clamp-2 md:line-clamp-1" style={cardNameStyle} onClick={cardNameClick}>{product.name}</h3>
                  <div className="flex gap-3 items-center">
                    <span className="text-sm font-bold text-gray-600">${product.price}</span>
                    {product.originalPrice && <span className="text-xs text-gray-300 line-through">${product.originalPrice}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        </EditableElement>

        {/* Editorial banner (banners[3]) — placeholder visible in editor mode so it's discoverable */}
        {(banners[3]?.image || isEditorMode) && (
          <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')}>
            <section className="relative w-full h-[40vh] overflow-hidden bg-gray-100">
              {banners[3]?.image ? (
                <img src={banners[3].image} alt="Banner editorial" className="w-full h-full object-cover" style={{ objectPosition: banners[3]?.position || 'center center' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm italic">
                  Banner editorial — sube la "Foto 4" en Imágenes de la Plantilla
                </div>
              )}
              <div className="absolute inset-0 bg-black/25 flex items-center justify-center px-6">
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'midBannerTitle')}>
                  <h2 className="text-white text-4xl md:text-5xl font-black uppercase tracking-tighter text-center drop-shadow-md" style={fStyle('midBannerTitle')}>
                    {fText('midBannerTitle', 'Estilo Sin Límites')}
                  </h2>
                </EditableElement>
              </div>
            </section>
          </EditableElement>
        )}

        {/* Populares — more products below the banner */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section2')}>
        <section className="py-16" style={{ backgroundColor: data.hero?.sectionBg?.section2 || undefined }}>
          <div className="container mx-auto px-6">
            <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionTitle2')}>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-10 text-center" style={fStyle('sectionTitle2')}>
                {fText('sectionTitle2', 'POPULARES')}
              </h2>
            </EditableElement>
            {/* Click the grid to hand-pick which products show here (featured grid) */}
            <EditableElement type="featured_products" isEditorMode={isEditorMode} onEdit={() => onEditElement('featured_products')}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
                {((featuredProducts && featuredProducts.length > 0)
                  ? featuredProducts.map((id: string) => data.products?.find((p: any) => p.id === id)).filter(Boolean)
                  : productsToShow.slice(4, 8)
                ).map((product: any) => (
                  <div key={product.id} className="group cursor-pointer">
                    <div className="relative aspect-[3/4] overflow-hidden mb-3 bg-gray-50">
                      <img src={product.image || (typeof product.images?.[0] === 'object' ? product.images[0]?.url : product.images?.[0]) || '/placeholder.svg'} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm font-medium mb-1 line-clamp-1" style={cardNameStyle} onClick={cardNameClick}>{product.name}</h3>
                      <span className="text-gray-500 font-light text-sm">${product.price}</span>
                    </div>
                  </div>
                ))}
                {(!featuredProducts || featuredProducts.length === 0) && productsToShow.length <= 4 && (
                  <div className="col-span-2 md:col-span-4 text-center text-gray-400 italic text-sm py-8 border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50">
                    Click aquí para elegir qué productos aparecen en "Populares"
                  </div>
                )}
              </div>
            </EditableElement>
          </div>
        </section>
        </EditableElement>

        {/* Promo banner (textBanner) — uploadable image via text_banner modal */}
        {(data.textBanner?.isActive !== false) && (
          <EditableElement type="banner" isEditorMode={isEditorMode} onEdit={() => onEditElement('text_banner')}>
            <section className="py-10">
              <div className="w-full h-64 md:h-80 bg-gray-900 relative overflow-hidden flex flex-col items-center justify-center gap-4">
                {data.textBanner?.imageUrl ? (
                  <>
                    <img src={data.textBanner.imageUrl} className="w-full h-full object-cover absolute inset-0" style={{ objectPosition: (data.textBanner as any).imagePosition || 'center center' }} alt="Banner" />
                    <div className="absolute inset-0 bg-black/40" />
                  </>
                ) : null}
                <span className="text-white font-black text-4xl md:text-6xl uppercase italic tracking-tighter z-10 relative text-center px-4 drop-shadow-md">
                  {data.textBanner?.text || 'Sin Límites'}
                </span>
                {(data.textBanner?.buttonEnabled !== false) && (
                  <span className="z-10 relative bg-white text-black px-8 py-4 rounded-full font-bold text-sm">{data.textBanner?.buttonLabel || 'Ver Colección'}</span>
                )}
              </div>
            </section>
          </EditableElement>
        )}

        {/* Footer — mirrors the live store: configurable background + real legal links */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'footer')}>
        <footer className="border-t-2 border-gray-100 py-16 px-6 flex flex-col md:flex-row justify-between items-center text-xs font-bold uppercase tracking-widest gap-8 text-gray-400" style={{ backgroundColor: data.hero?.sectionBg?.footer || footColor }}>
          <EditableElement type="contact" isEditorMode={isEditorMode} onEdit={() => onEditElement('contact')}>
            <div className="flex gap-6">
              {data.contact?.facebook && <span className="hover:text-black transition-colors cursor-pointer" style={{ color: footerIconColor }}>Facebook</span>}
              {data.contact?.instagram && <span className="hover:text-black transition-colors cursor-pointer" style={{ color: footerIconColor }}>Instagram</span>}
              {!data.contact?.facebook && !data.contact?.instagram && <span className="italic text-gray-300 cursor-pointer normal-case">Agrega tus redes sociales</span>}
            </div>
          </EditableElement>
          <div className="text-black text-center">
            © {new Date().getFullYear()} {data.logo?.alt || "FASHION STORE"}
          </div>
          <div className="flex gap-6">
            <span className="hover:text-black transition-colors cursor-pointer">Política de Privacidad</span>
            <span className="hover:text-black transition-colors cursor-pointer">Términos y Condiciones</span>
          </div>
        </footer>
        </EditableElement>
      </div>
    );
  };

  const FashionHeroLayoutPreview = () => {
    const heroScrollRef = useRef<HTMLDivElement>(null);
    const heroScroll = (direction: 'left' | 'right') => {
      if (heroScrollRef.current) {
        heroScrollRef.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
      }
    };
    const newArrivals = data.products?.filter((p: any) => p.features?.includes("new_arrival")) || [];
    const productsToShow = newArrivals.length > 0 ? newArrivals : bestSellers;
    const mainHeroImage = banners[0]?.image;
    const secondaryBanner = banners[1] || banners[0];

    // Same auto-collapse pattern as production FashionHeroTemplate: compare a
    // hidden measurer's intrinsic width vs the left column's available space.
    const navColRef = useRef<HTMLDivElement>(null);
    const navMeasurerRef = useRef<HTMLDivElement>(null);
    const [navOverflows, setNavOverflows] = useState(false);
    const [hamburgerOpen, setHamburgerOpen] = useState(false);
    useEffect(() => {
      const col = navColRef.current;
      const measurer = navMeasurerRef.current;
      if (!col || !measurer) return;
      const check = () => {
        const available = col.clientWidth - 8;
        const needed = measurer.offsetWidth + 24;
        setNavOverflows(needed > available);
      };
      check();
      const ro = new ResizeObserver(check);
      ro.observe(col);
      window.addEventListener('resize', check);
      return () => { ro.disconnect(); window.removeEventListener('resize', check); };
    }, [data.categories]);

    return (
      <div className="min-h-screen font-sans text-black relative" style={{ backgroundColor: bgColor }}>

        {/* Header — mirrors production: logo locked center, hamburger auto when nav overflows */}
        {(() => {
          const allCats = (data.categories || []).filter((c: any) => !c.parent_id);
          const navItems = allCats.length > 0 ? allCats : [{ name: 'Mujer' }, { name: 'Hombre' }, { name: 'Kids' }];
          const navInline = {
            fontFamily: heroStyleFontFamily(data.hero?.styles?.navMenu?.fontFamily),
            fontSize: data.hero?.styles?.navMenu?.fontSize ? `${data.hero.styles.navMenu.fontSize}px` : undefined,
            color: data.hero?.styles?.navMenu?.color || undefined,
          };
          const showNavVisible = !navOverflows;
          return (
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'navbar')}>
        <header className="sticky top-0 z-50 border-b border-gray-100" style={{ backgroundColor: data.hero?.sectionBg?.navbar || navColor }}>
          <div className="w-full px-6 min-h-16 py-3 grid items-center gap-4" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
            {/* LEFT col — hamburger when needed + nav (or measurer) */}
            <div ref={navColRef} className="flex items-center gap-3 min-w-0 justify-start relative">
              <EditableElement type="botón hamburguesa" isEditorMode={isEditorMode} onEdit={() => onEditElement('hamburger_style')}>
                <HamburgerButton
                  isOpen={hamburgerOpen}
                  onClick={() => setHamburgerOpen(!hamburgerOpen)}
                  count={data.hero?.hamburgerCount || 3}
                  thickness={data.hero?.hamburgerThickness || 2}
                  color={headerIconColor}
                  size={data.hero?.hamburgerSize || 24}
                  className={`${showNavVisible ? 'md:hidden' : 'md:flex'}`}
                />
              </EditableElement>
              {showNavVisible && (
                <EditableElement type="menú" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'navMenu')}>
                  <nav
                    className="hidden md:flex gap-5 text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap"
                    style={navInline}
                  >
                    {navItems.map((cat: any, i: number) => (
                      <span key={cat.id || cat.name || i} className="cursor-pointer hover:text-black flex-shrink-0">{cat.name}</span>
                    ))}
                  </nav>
                </EditableElement>
              )}
              {/* Off-screen measurer */}
              <div
                ref={navMeasurerRef}
                aria-hidden="true"
                className="hidden md:flex gap-5 text-xs font-medium whitespace-nowrap absolute left-0 top-0 pointer-events-none invisible"
                style={{ ...navInline, transform: 'translateY(-9999px)' }}
              >
                {navItems.map((cat: any, i: number) => (
                  <span key={`m-${i}`} className="uppercase tracking-wider flex-shrink-0">{cat.name}</span>
                ))}
              </div>
            </div>

            {/* CENTER col — logo always center */}
            <div className="flex-shrink-0 justify-self-center">
              <EditableElement type="logo" isEditorMode={isEditorMode} onEdit={() => onEditElement('logo')}>
                <LogoDisplay
                  logoUrl={(data as any)?.logo?.url}
                  logoSize={(settings as any)?.logo_size}
                  logoSizeMobile={(settings as any)?.logo_size_mobile}
                  logoSizeTablet={(settings as any)?.logo_size_tablet}
                  forceDevice={deviceMode}
                  fallbackText="FASHION"
                  disableFetch
                  className="text-xl font-black uppercase tracking-tighter"
                />
              </EditableElement>
            </div>

            {/* RIGHT col — icons */}
            <div className="flex items-center gap-4 justify-end min-w-0">
              <Search style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
              <ShoppingCart style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
            </div>
          </div>

          {/* Hamburger drawer — opens from the LEFT, title is editable */}
          {hamburgerOpen && (
            <div className="fixed inset-0 z-50" onClick={() => setHamburgerOpen(false)}>
              <div className="absolute inset-0 bg-black/50" />
              <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b">
                  <EditableElement type="título menú" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'menuDrawerTitle')}>
                    <span
                      className="font-black uppercase tracking-tighter text-lg"
                      style={{
                        fontFamily: heroStyleFontFamily(data.hero?.styles?.menuDrawerTitle?.fontFamily),
                        fontSize: data.hero?.styles?.menuDrawerTitle?.fontSize ? `${data.hero.styles.menuDrawerTitle.fontSize}px` : undefined,
                        color: data.hero?.styles?.menuDrawerTitle?.color || undefined,
                      }}
                    >
                      {data.hero?.styles?.menuDrawerTitle?.text || "Categorías"}
                    </span>
                  </EditableElement>
                  <button
                    onClick={() => setHamburgerOpen(false)}
                    className="group p-1 transition-transform duration-200 hover:rotate-90 hover:scale-110"
                    aria-label="Cerrar menú"
                  >
                    <X className="w-5 h-5 transition-colors group-hover:text-red-500" />
                  </button>
                </div>
                <nav className="flex-1 p-6 space-y-5">
                  {navItems.map((cat: any, i: number) => (
                    <div key={`d-${i}`} className="block font-medium uppercase tracking-widest text-sm" style={navInline}>{cat.name}</div>
                  ))}
                </nav>
              </div>
            </div>
          )}
        </header>
        </EditableElement>
          );
        })()}

        {/* Hero - Photo + Text split. In Indico each text element is independently
            editable: clicking the photo opens the banner modal, clicking any text
            opens that text element's dedicated style editor. */}
        <section
          className={`w-full flex min-h-[60vh] ${
            // Force the production layout's stacking based on deviceMode instead of
            // viewport breakpoints: Tailwind's lg: reads window width and the editor
            // window is always desktop, so a constrained "mobile" preview would
            // otherwise still render side-by-side.
            deviceMode === 'desktop' ? 'flex-row' : 'flex-col-reverse'
          }`}
        >
          {/* Photo Side — still routes to the banners modal */}
          <div className={`relative w-full ${deviceMode === 'desktop' ? 'w-3/5' : ''}`}>
            <EditableElement type="banner" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')}>
              <div className={`relative w-full overflow-hidden bg-gray-100 ${deviceMode === 'desktop' ? 'aspect-auto h-[78vh]' : 'aspect-[4/5]'}`}>
                {mainHeroImage ? (
                  <img src={mainHeroImage} alt="Hero" className="w-full h-full object-cover" style={{ objectPosition: banners[0]?.position || 'center center' }} />
                ) : (
                  <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <span className="text-gray-400 font-serif italic text-xl">Foto del hero</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/10" />
              </div>
            </EditableElement>
          </div>

          {/* Text Side — each child is its own EditableElement; the background
              itself is editable too (sectionBg.hero), like the other sections */}
          <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'hero')} className={deviceMode === 'desktop' ? 'w-2/5' : 'w-full'}>
          <div className="flex flex-col justify-center px-6 md:px-12 py-10 bg-white min-w-0 gap-4 h-full" style={{ backgroundColor: data.hero?.sectionBg?.hero || undefined }}>
            <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'eyebrow')}>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400 break-words [overflow-wrap:anywhere]"
                style={{
                  fontFamily: heroStyleFontFamily(data.hero?.styles?.eyebrow?.fontFamily),
                  fontSize: data.hero?.styles?.eyebrow?.fontSize ? `${data.hero.styles.eyebrow.fontSize}px` : undefined,
                  color: data.hero?.styles?.eyebrow?.color || undefined,
                }}
              >
                {data.hero?.eyebrowText || "Nueva Colección"}
              </p>
            </EditableElement>

            <EditableElement type="título" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'title')}>
              <h1
                className="text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-[0.95] break-words [overflow-wrap:anywhere]"
                style={{
                  fontFamily: heroStyleFontFamily(data.hero?.styles?.title?.fontFamily),
                  fontSize: data.hero?.styles?.title?.fontSize ? `${data.hero.styles.title.fontSize}px` : undefined,
                  color: data.hero?.styles?.title?.color || undefined,
                }}
              >
                {welcomeTitle || "Estilo\nque Inspira"}
              </h1>
            </EditableElement>

            <EditableElement type="mensaje" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'message')}>
              <p
                className="text-gray-500 text-xs leading-relaxed max-w-xs break-words [overflow-wrap:anywhere]"
                style={{
                  fontFamily: heroStyleFontFamily(data.hero?.styles?.message?.fontFamily),
                  fontSize: data.hero?.styles?.message?.fontSize ? `${data.hero.styles.message.fontSize}px` : undefined,
                  color: data.hero?.styles?.message?.color || undefined,
                }}
              >
                {welcomeMessage || "Descubre nuestra nueva colección. Calidad, estilo y comodidad en cada pieza."}
              </p>
            </EditableElement>

            <div className="flex gap-3 flex-wrap mt-2">
              {(() => {
                const cta1Disabled = data.hero?.styles?.cta1?.enabled === false;
                const cta2Disabled = data.hero?.styles?.cta2?.enabled === false;
                return (
                  <>
                    <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'cta1')}>
                      {cta1Disabled ? (
                        <div className="px-4 py-2 border border-dashed border-gray-300 text-gray-400 text-[11px] italic uppercase tracking-widest cursor-pointer hover:bg-gray-50">
                          Botón principal oculto — click para activar
                        </div>
                      ) : (
                        <Button
                          className="bg-black text-white hover:bg-gray-800 font-bold rounded-none px-6 py-4 text-xs uppercase tracking-widest"
                          style={{
                            fontFamily: heroStyleFontFamily(data.hero?.styles?.cta1?.fontFamily),
                            fontSize: data.hero?.styles?.cta1?.fontSize ? `${data.hero.styles.cta1.fontSize}px` : undefined,
                            color: data.hero?.styles?.cta1?.color || undefined,
                            backgroundColor: data.hero?.styles?.cta1?.bgColor || undefined,
                          }}
                        >
                          {data.hero?.cta1Label || "Ver Colección"}
                        </Button>
                      )}
                    </EditableElement>
                    <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'cta2')}>
                      {cta2Disabled ? (
                        <div className="px-4 py-2 border border-dashed border-gray-300 text-gray-400 text-[11px] italic uppercase tracking-widest cursor-pointer hover:bg-gray-50">
                          Botón secundario oculto — click para activar
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="border-black text-black hover:bg-black hover:text-white rounded-none px-6 py-4 text-xs uppercase tracking-widest"
                          style={{
                            fontFamily: heroStyleFontFamily(data.hero?.styles?.cta2?.fontFamily),
                            fontSize: data.hero?.styles?.cta2?.fontSize ? `${data.hero.styles.cta2.fontSize}px` : undefined,
                            color: data.hero?.styles?.cta2?.color || undefined,
                            backgroundColor: data.hero?.styles?.cta2?.bgColor || undefined,
                          }}
                        >
                          {data.hero?.cta2Label || "Novedades"}
                        </Button>
                      )}
                    </EditableElement>
                  </>
                );
              })()}
            </div>
          </div>
          </EditableElement>
        </section>

        {/* Ticker — keeps a placeholder in editor mode so users can re-enable a hidden bar */}
        {((data.ticker?.enabled !== false) || isEditorMode) && (
          <EditableElement type="ticker" isEditorMode={isEditorMode} onEdit={() => onEditElement('ticker')}>
            {data.ticker?.enabled === false ? (
              <div className="bg-gray-100 border border-dashed border-gray-300 text-gray-500 py-2 text-center text-[11px] italic cursor-pointer hover:bg-gray-200">
                Barra de noticias oculta — click para mostrarla
              </div>
            ) : (
              <div
                className={`bg-black text-white py-2 overflow-hidden ${isEditorMode ? 'cursor-pointer hover:bg-zinc-800' : ''}`}
                style={{
                  ...(data.ticker?.bgColor ? { backgroundColor: data.ticker.bgColor } : {}),
                  ...(data.ticker?.textColor ? { color: data.ticker.textColor } : {}),
                }}
              >
                <div
                  className={`flex justify-center font-bold uppercase tracking-widest ${data.ticker?.fontSize ? '' : 'text-[10px]'}`}
                  style={data.ticker?.fontSize ? { fontSize: `${data.ticker.fontSize}px` } : undefined}
                >
                  <span>{data.ticker?.text || "Envíos rápidos · Calidad garantizada · Atención personalizada"}</span>
                </div>
              </div>
            )}
          </EditableElement>
        )}

        {/* Products section — has its own background editable separately */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section1')}>
        <div className="px-4 py-8" style={{ backgroundColor: data.hero?.sectionBg?.section1 || undefined }}>
          <div className="flex items-end justify-between mb-4">
            <div className="flex flex-col gap-1">
              <EditableElement type="título sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionTitle1')}>
                <h2
                  className="text-xl font-black uppercase tracking-tighter"
                  style={{
                    fontFamily: heroStyleFontFamily(data.hero?.styles?.sectionTitle1?.fontFamily),
                    fontSize: data.hero?.styles?.sectionTitle1?.fontSize ? `${data.hero.styles.sectionTitle1.fontSize}px` : undefined,
                    color: data.hero?.styles?.sectionTitle1?.color || undefined,
                  }}
                >
                  {data.hero?.styles?.sectionTitle1?.text || "Recién Llegados"}
                </h2>
              </EditableElement>
              <EditableElement type="link" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionLink1')}>
                <a
                  href="#"
                  className="text-xs font-semibold underline underline-offset-4 hover:text-gray-600"
                  style={{
                    fontFamily: heroStyleFontFamily(data.hero?.styles?.sectionLink1?.fontFamily),
                    fontSize: data.hero?.styles?.sectionLink1?.fontSize ? `${data.hero.styles.sectionLink1.fontSize}px` : undefined,
                    color: data.hero?.styles?.sectionLink1?.color || undefined,
                  }}
                >
                  {data.hero?.styles?.sectionLink1?.text || "Ver todo"}
                </a>
              </EditableElement>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => heroScroll('left')} className="rounded-full border-gray-300 hover:bg-gray-100 h-8 w-8">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => heroScroll('right')} className="rounded-full border-gray-300 hover:bg-gray-100 h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div ref={heroScrollRef} className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">
            {productsToShow.map((product: any, idx: number) => (
              <div
                key={product.id}
                className="snap-start shrink-0 w-[180px] md:w-[220px] cursor-pointer"
                onClick={() => openProductModal(product)}
              >
                <div className="aspect-[3/4] overflow-hidden mb-2 relative group transition-colors duration-300" style={{ backgroundColor: cardBgColor }}>
                  <div className="absolute inset-0 transition-colors duration-300 opacity-0 group-hover:opacity-100" style={{ backgroundColor: hoverColor }} />
                  <img src={product.image} className="w-full h-full object-cover relative z-10 mix-blend-multiply" alt={product.name} />
                  <div className="absolute top-2 left-2 bg-white px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider z-20">NUEVO</div>
                  {/* Hover CTA — only the first card shows it persistently in editor mode so the
                      user can see + click to edit. In production it appears on hover for every card. */}
                  {idx === 0 ? (
                    <div className={`absolute bottom-2 left-2 right-2 z-30 ${isEditorMode ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`} onClick={(e) => e.stopPropagation()}>
                      <EditableElement type="botón producto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'productCardCta')}>
                        <Button
                          className="w-full bg-white/90 text-black hover:bg-white font-bold backdrop-blur-sm text-[10px] rounded-none h-7"
                          style={{
                            fontFamily: heroStyleFontFamily(data.hero?.styles?.productCardCta?.fontFamily),
                            fontSize: data.hero?.styles?.productCardCta?.fontSize ? `${data.hero.styles.productCardCta.fontSize}px` : undefined,
                            color: data.hero?.styles?.productCardCta?.color || undefined,
                          }}
                        >
                          {data.hero?.styles?.productCardCta?.text || "Agregar +"}
                        </Button>
                      </EditableElement>
                    </div>
                  ) : (
                    <div className="absolute bottom-2 left-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <Button
                        className="w-full bg-white/90 text-black hover:bg-white font-bold backdrop-blur-sm text-[10px] rounded-none h-7"
                        style={{
                          fontFamily: heroStyleFontFamily(data.hero?.styles?.productCardCta?.fontFamily),
                          fontSize: data.hero?.styles?.productCardCta?.fontSize ? `${data.hero.styles.productCardCta.fontSize}px` : undefined,
                          color: data.hero?.styles?.productCardCta?.color || undefined,
                        }}
                      >
                        {data.hero?.styles?.productCardCta?.text || "Agregar +"}
                      </Button>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-xs leading-tight mb-1 text-gray-900" style={cardNameStyle} onClick={cardNameClick}>{product.name}</h3>
                <span className="text-xs font-bold text-gray-700">${product.price}</span>
              </div>
            ))}
          </div>
        </div>
        </EditableElement>

        {/* Mid Image Banner */}
        {(data.textBanner?.isActive !== false) && (
          <EditableElement type="text_banner" isEditorMode={isEditorMode} onEdit={() => onEditElement('text_banner')}>
            <div className={`py-4 ${isEditorMode ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
              <div className="w-full h-64 bg-gray-900 relative flex items-center justify-center overflow-hidden">
                {data.textBanner?.imageUrl ? (
                  <>
                    <img src={data.textBanner.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" style={{ objectPosition: (data.textBanner as any).imagePosition || 'center center' }} alt="Banner Background" />
                    <div className="absolute inset-0 bg-black/40" />
                  </>
                ) : null}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10 gap-3">
                  {(data.textBanner as any)?.showTitle !== false && (
                    <span className="text-white font-black text-3xl uppercase tracking-tighter">
                      {data.textBanner?.text || "Sin Límites"}
                    </span>
                  )}
                  {(data.textBanner as any)?.buttonEnabled !== false && (
                    <Button className="bg-white text-black text-xs px-6 py-3 font-bold uppercase tracking-widest rounded-none">
                      {(data.textBanner as any)?.buttonLabel || "Explorar Colección"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </EditableElement>
        )}

        {/* Featured Products Grid — section bg editable separately */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section2')}>
        <div style={{ backgroundColor: data.hero?.sectionBg?.section2 || undefined }}>
        <EditableElement type="featured_products" isEditorMode={isEditorMode} onEdit={() => onEditElement('featured_products')}>
          <div className={`px-4 py-8 md:py-12 ${isEditorMode ? 'hover:bg-gray-50 cursor-pointer' : ''}`}>
            <EditableElement type="título sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionTitle2')}>
              <h2
                className="text-xl md:text-2xl font-black uppercase tracking-tighter mb-6"
                style={{
                  fontFamily: heroStyleFontFamily(data.hero?.styles?.sectionTitle2?.fontFamily),
                  fontSize: data.hero?.styles?.sectionTitle2?.fontSize ? `${data.hero.styles.sectionTitle2.fontSize}px` : undefined,
                  color: data.hero?.styles?.sectionTitle2?.color || undefined,
                }}
              >
                {data.hero?.styles?.sectionTitle2?.text || "Populares ahora"}
              </h2>
            </EditableElement>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(featuredProducts && featuredProducts.length > 0) ? (
                featuredProducts.map((productId: string) => {
                  const product = data.products.find((p: any) => p.id === productId);
                  if (!product) return null;
                  return (
                    <div key={product.id} className="relative aspect-square md:aspect-[4/3] bg-gray-100 group overflow-hidden cursor-pointer" onClick={() => openProductModal(product)}>
                      <img src={product.images[0]?.url || "/placeholder.svg"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={product.title} />
                      <div className="absolute bottom-8 left-8">
                        <h3 className="text-white text-2xl font-black uppercase mb-2 drop-shadow-md tracking-tight">{product.title}</h3>
                        <span className="text-white underline font-semibold drop-shadow-md text-sm uppercase tracking-wider">Ver Ahora</span>
                      </div>
                      <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors" />
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="relative aspect-square md:aspect-[4/3] bg-gray-100 group overflow-hidden cursor-pointer">
                    <img src="/placeholder.svg" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Placeholder" />
                    <div className="absolute bottom-8 left-8">
                      <h3 className="text-white text-xl font-black uppercase mb-2 tracking-tight">Nueva Llegada</h3>
                      <span className="text-white underline font-semibold text-sm">Ver Ahora</span>
                    </div>
                  </div>
                  <div className="relative aspect-square md:aspect-[4/3] bg-gray-100 group overflow-hidden cursor-pointer">
                    <img src="/placeholder.svg" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Placeholder" />
                    <div className="absolute bottom-8 left-8">
                      <h3 className="text-white text-xl font-black uppercase mb-2 tracking-tight">Colección VIP</h3>
                      <span className="text-white underline font-semibold text-sm">Ver Ahora</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </EditableElement>
        </div>
        </EditableElement>

        {/* Footer — background editable via sectionBg.footer (falls back to global footer color) */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'footer')}>
        <footer className="text-white pt-16 pb-8" style={{ backgroundColor: data.hero?.sectionBg?.footer || footColor }}>
          <div className="px-4 container mx-auto">
            <EditableElement type="contact" isEditorMode={isEditorMode} onEdit={() => onEditElement('contact')}>
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 ${isEditorMode ? 'cursor-pointer hover:bg-zinc-900 p-4 -m-4 rounded-lg transition-colors' : ''}`}>
                <div>
                  <EditableElement type="footer título" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading1')}>
                    <h4
                      className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500"
                      style={{
                        fontFamily: heroStyleFontFamily(data.hero?.styles?.footerHeading1?.fontFamily),
                        fontSize: data.hero?.styles?.footerHeading1?.fontSize ? `${data.hero.styles.footerHeading1.fontSize}px` : undefined,
                        color: data.hero?.styles?.footerHeading1?.color || undefined,
                      }}
                    >
                      {data.hero?.styles?.footerHeading1?.text || "Contacto"}
                    </h4>
                  </EditableElement>
                  <ul className="space-y-4 text-sm font-medium">
                    {data.contact?.whatsapp && <li className="flex items-center gap-3"><span className="text-gray-300">WhatsApp:</span> {data.contact.whatsapp}</li>}
                    {data.contact?.email && <li className="flex items-center gap-3"><span className="text-gray-300">Email:</span> {data.contact.email}</li>}
                    {!data.contact?.whatsapp && !data.contact?.email && <li className="text-zinc-600 italic">Agrega tus datos de contacto</li>}
                  </ul>
                </div>
                <div>
                  <EditableElement type="footer título" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading2')}>
                    <h4
                      className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500"
                      style={{
                        fontFamily: heroStyleFontFamily(data.hero?.styles?.footerHeading2?.fontFamily),
                        fontSize: data.hero?.styles?.footerHeading2?.fontSize ? `${data.hero.styles.footerHeading2.fontSize}px` : undefined,
                        color: data.hero?.styles?.footerHeading2?.color || undefined,
                      }}
                    >
                      {data.hero?.styles?.footerHeading2?.text || "Ubicación"}
                    </h4>
                  </EditableElement>
                  <p className="text-sm font-medium leading-relaxed max-w-xs text-gray-300">
                    {data.contact?.address || <span className="text-zinc-600 italic">Configura tu dirección</span>}
                  </p>
                </div>
                <div>
                  <EditableElement type="footer título" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading3')}>
                    <h4
                      className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500"
                      style={{
                        fontFamily: heroStyleFontFamily(data.hero?.styles?.footerHeading3?.fontFamily),
                        fontSize: data.hero?.styles?.footerHeading3?.fontSize ? `${data.hero.styles.footerHeading3.fontSize}px` : undefined,
                        color: data.hero?.styles?.footerHeading3?.color || undefined,
                      }}
                    >
                      {data.hero?.styles?.footerHeading3?.text || "Síguenos"}
                    </h4>
                  </EditableElement>
                  <div className="flex flex-col gap-3 text-sm">
                    {data.contact?.instagram && <a href={data.contact.instagram} className="hover:text-zinc-300 transition-colors" style={{ color: footerIconColor, fontSize: `${14 * footerIconScale}px` }}>Instagram</a>}
                    {data.contact?.facebook && <a href={data.contact.facebook} className="hover:text-zinc-300 transition-colors" style={{ color: footerIconColor, fontSize: `${14 * footerIconScale}px` }}>Facebook</a>}
                    {!data.contact?.instagram && !data.contact?.facebook && <span className="text-zinc-600 italic">Agrega tus redes sociales</span>}
                  </div>
                </div>
              </div>
            </EditableElement>
            <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-600 text-[10px] uppercase tracking-wider">
              <p>© {new Date().getFullYear()} {data.logo?.alt || "Tu Tienda"}. Todos los derechos reservados.</p>
              <p>Powered by Toogo</p>
            </div>
          </div>
        </footer>
        </EditableElement>
      </div>
    );
  };

  const NatureLayoutPreview = () => {
    const heroTitle = welcomeTitle || (settings as any)?.welcome_title || "Nuevos Estilos\nHan Llegado";
    const heroMessage = welcomeMessage || (settings as any)?.welcome_message || "Una nueva paleta de colores diseñada para el cambio de temporada—fácil de combinar, perfecta para cada ocasión.";
    const bg = data.allColors?.backgroundColor || settings?.store_background_color || '#f4f4f0';
    const navbarBgColor = data.allColors?.navbarColor || settings?.navbar_bg_color || '#f4f4f0';
    const footColor = data.allColors?.footerColor || settings?.footer_bg_color || '#f4f4f0';
    const headerIconColor = data.allColors?.headerIconColor || (settings as any)?.header_icon_color || '#1a202c';
    const footerIconColor = data.allColors?.footerIconColor || (settings as any)?.footer_icon_color || '#1a202c';
    const prodBgColor = data.allColors?.productCardBgColor || (settings as any)?.product_card_bg_color || '#e2e2e2';

    // Scale conversion based on editor ranges
    const headerIconScale = (settings?.header_icon_scale || 100) / 100;
    const footerIconScale = (settings?.footer_icon_scale || 100) / 100;
    const iconSize = `${20 * headerIconScale}px`;

    // Per-element style overrides (Indico-level editing for Nature)
    const nStyle = (k: string) => ({
      fontFamily: heroStyleFontFamily(data.hero?.styles?.[k]?.fontFamily),
      fontSize: pickFontSize(data.hero?.styles?.[k], deviceMode) ? `${pickFontSize(data.hero?.styles?.[k], deviceMode)}px` : undefined,
      color: data.hero?.styles?.[k]?.color || undefined,
      backgroundColor: data.hero?.styles?.[k]?.bgColor || undefined,
    });
    const nText = (k: string, fallback: string) => data.hero?.styles?.[k]?.text || fallback;
    const natureCategories = categories.filter((c: any) => !c.parent_id && c.show_on_home !== false);

    return (
      <div className="min-h-screen font-sans text-gray-900" style={{ backgroundColor: bg }}>
        {/* Top Bar */}
        <EditableElement type="announcement" isEditorMode={isEditorMode} onEdit={() => onEditElement('announcement')}>
          {data.announcement?.enabled !== false && (
            <div className="text-white text-center py-2 text-[10px] md:text-xs font-medium tracking-widest uppercase flex justify-center items-center px-4" style={{ backgroundColor: data.announcement?.bgColor || '#4f6354', ...(data.announcement?.textColor ? { color: data.announcement.textColor } : {}) }}>
              <span>{data.announcement?.text || "Envío gratis en compras mayores a $999"}</span>
            </div>
          )}
        </EditableElement>

        {/* Header — background editable via sectionBg.navbar */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'navbar')}>
          <header className="px-6 py-4 flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: data.hero?.sectionBg?.navbar || navbarBgColor }}>
            <div className="flex items-center gap-8 md:flex-1">
              <EditableElement type="logo" isEditorMode={isEditorMode} onEdit={() => onEditElement('logo')}>
                <div className="cursor-pointer">
                  <LogoDisplay
                    logoUrl={data.logo?.url}
                    logoSize={(settings as any)?.logo_size}
                    logoSizeMobile={(settings as any)?.logo_size_mobile}
                    logoSizeTablet={(settings as any)?.logo_size_tablet}
                    forceDevice={deviceMode}
                    fallbackText={data.logo?.alt || 'LOGO'}
                    className="text-2xl font-serif font-bold tracking-tight text-gray-900"
                  />
                </div>
              </EditableElement>
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'navMenu')} className="hidden md:block">
              <nav className="flex items-center gap-6 text-xs font-semibold tracking-wider text-gray-700" style={nStyle('navMenu')}>
                {natureCategories.slice(0, 5).map((cat: any) => (
                  <button key={cat.id} className="hover:text-black uppercase transition-colors">{cat.name}</button>
                ))}
                {natureCategories.length === 0 && (
                  <>
                    <button className="hover:text-black transition-colors uppercase">Mujer</button>
                    <button className="hover:text-black transition-colors uppercase">Hombre</button>
                    <button className="hover:text-black transition-colors uppercase">Accesorios</button>
                  </>
                )}
              </nav>
              </EditableElement>
            </div>

            <div className="flex items-center gap-4 justify-end md:flex-1">
              <User className="hidden md:block cursor-pointer hover:scale-110 transition-transform" style={{ color: headerIconColor, width: iconSize, height: iconSize }} />
              <Search className="hidden md:block cursor-pointer hover:scale-110 transition-transform" style={{ color: headerIconColor, width: iconSize, height: iconSize }} />
              <div className="relative cursor-pointer hover:scale-110 transition-transform">
                <ShoppingCart style={{ color: headerIconColor, width: iconSize, height: iconSize }} />
                {cartItems > 0 && <span className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full">{cartItems}</span>}
              </div>
              <button className="md:hidden">
                <Menu style={{ color: headerIconColor, width: iconSize, height: iconSize }} />
              </button>
            </div>
          </header>
        </EditableElement>

        {/* Hero Section — photo opens banners; texts/buttons each editable */}
        <section className="relative w-full h-[300px] md:h-[500px] flex items-end md:items-center bg-gray-200 overflow-hidden">
          <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')} className="absolute inset-0">
            {banners?.[0] ? (
              <img src={banners[0].image} alt="Hero" className="w-full h-full object-cover" style={{ objectPosition: banners[0].position || 'center center' }} />
            ) : (<div className="w-full h-full bg-[#8c9485]"></div>)}
          </EditableElement>
          <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
          <div className="relative z-10 w-full px-6 md:px-16 pb-12 md:pb-0 md:pt-0 max-w-xl text-left pointer-events-none">
            <div className="pointer-events-auto flex flex-col items-start gap-3">
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'title')}>
                <h1 className="text-3xl md:text-5xl font-serif font-bold leading-[1.1] text-white drop-shadow-md whitespace-pre-line" style={nStyle('title')}>{heroTitle}</h1>
              </EditableElement>
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'message')}>
                <p className="text-xs md:text-sm text-white/90 max-w-sm drop-shadow" style={nStyle('message')}>{heroMessage}</p>
              </EditableElement>
              <div className="flex flex-col sm:flex-row gap-4">
                <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'cta1')}>
                  {data.hero?.styles?.cta1?.enabled === false ? (
                    <div className="px-4 py-2 border border-dashed border-white/60 text-white/80 text-[11px] italic uppercase cursor-pointer">Botón oculto — click para activar</div>
                  ) : (
                    <button className="bg-[#f4f4f0] text-gray-900 px-8 py-3.5 text-[10px] md:text-xs font-bold tracking-widest uppercase hover:bg-white transition-colors" style={nStyle('cta1')}>
                      {data.hero?.cta1Label || 'VER CATÁLOGO'}
                    </button>
                  )}
                </EditableElement>
                <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'cta2')}>
                  {data.hero?.styles?.cta2?.enabled === false ? (
                    <div className="px-4 py-2 border border-dashed border-white/60 text-white/80 text-[11px] italic uppercase cursor-pointer">Botón oculto — click para activar</div>
                  ) : (
                    <button className="bg-[#f4f4f0] text-gray-900 px-8 py-3.5 text-[10px] md:text-xs font-bold tracking-widest uppercase hover:bg-white transition-colors" style={nStyle('cta2')}>
                      {data.hero?.cta2Label || 'NOVEDADES'}
                    </button>
                  )}
                </EditableElement>
              </div>
            </div>
          </div>
        </section>

        {/* Products Section — background + title editable; tabs from real categories */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section1')}>
          <section className="py-12 md:py-16" style={{ backgroundColor: data.hero?.sectionBg?.section1 || undefined }}>
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-gray-300">
              <div className="flex-1">
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionTitle1')}>
                  <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#142642] mb-6" style={nStyle('sectionTitle1')}>{nText('sectionTitle1', 'Novedades')}</h2>
                </EditableElement>
                {natureCategories.length > 0 && (
                  <div className="flex gap-6 overflow-x-auto hide-scrollbar">
                    <button className="text-xs font-bold tracking-widest uppercase pb-1 border-b-2 border-gray-500 text-gray-900 whitespace-nowrap">TODO</button>
                    {natureCategories.slice(0, 4).map((cat: any) => (
                      <button key={cat.id} className="text-xs font-bold tracking-widest uppercase pb-1 border-b-2 border-transparent text-gray-500 hover:text-gray-900 whitespace-nowrap">{cat.name.toUpperCase()}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {bestSellers.length > 0 ? (
              <EditableElement type="featured_products" isEditorMode={isEditorMode} onEdit={() => onEditElement('featured_products')}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">
                {((featuredProducts && featuredProducts.length > 0)
                  ? featuredProducts.map((id: string) => bestSellers.find((p: any) => p.id === id) || data.products?.find((p: any) => p.id === id)).filter(Boolean)
                  : bestSellers.slice(0, 4)
                ).map((product: any) => (
                  <div key={product.id} className="group cursor-pointer flex flex-col">
                    <div className="relative aspect-[3/4] overflow-hidden mb-3" style={{ backgroundColor: prodBgColor }}>
                      <img src={product.image || '/placeholder.svg'} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    </div>
                    <div className="flex flex-col flex-grow">
                      <h3 className="font-serif text-sm font-semibold text-gray-900 leading-snug mb-1" style={cardNameStyle} onClick={cardNameClick}>{product.name}</h3>
                      <span className="text-sm text-gray-900">${Number(product.price).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              </EditableElement>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="group flex flex-col">
                    <div className="relative aspect-[3/4] overflow-hidden mb-3 bg-gray-200">
                      <img src="/placeholder.svg" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="font-serif text-sm font-semibold mb-1">Producto {i}</h3>
                    <span className="text-sm font-medium">${(49.99 * i).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          </section>
        </EditableElement>

        {/* Feature Split Section — texts/buttons editable; photos open the banners editor */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section2')}>
          <section className="py-12" style={{ backgroundColor: data.hero?.sectionBg?.section2 || undefined }}>
          <div className="container mx-auto px-6">
            <div className={`flex items-center gap-12 lg:gap-24 ${deviceMode === 'mobile' ? 'flex-col' : 'flex-col lg:flex-row'}`}>
              <div className={`flex flex-col justify-center gap-4 ${deviceMode === 'mobile' ? 'order-1' : 'lg:w-1/2 order-2 lg:order-1'}`}>
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'featureTitle')}>
                  <h2 className="text-3xl md:text-5xl font-serif font-bold text-[#142642] leading-tight" style={nStyle('featureTitle')}>{nText('featureTitle', 'Nuestra Historia')}</h2>
                </EditableElement>
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'featureSubtitle')}>
                  <h3 className="text-xl md:text-2xl text-gray-800" style={nStyle('featureSubtitle')}>{nText('featureSubtitle', 'Comprometidos con el planeta')}</h3>
                </EditableElement>
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'featureDescription')}>
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-lg" style={nStyle('featureDescription')}>
                    {nText('featureDescription', 'Tenemos la misión de crear productos de calidad con responsabilidad ambiental. Cada compra contribuye a un mundo mejor para las generaciones futuras.')}
                  </p>
                </EditableElement>
                <div className="flex flex-col sm:flex-row gap-4">
                  <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'featureCta1')}>
                    {data.hero?.styles?.featureCta1?.enabled === false ? (
                      <div className="px-4 py-2 border border-dashed border-gray-300 text-gray-400 text-[11px] italic uppercase cursor-pointer">Botón oculto — click para activar</div>
                    ) : (
                      <button className="bg-[#4f6354] text-white px-8 py-3.5 text-[11px] font-bold tracking-widest uppercase" style={nStyle('featureCta1')}>{nText('featureCta1', 'VER CATÁLOGO')}</button>
                    )}
                  </EditableElement>
                  <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'featureCta2')}>
                    {data.hero?.styles?.featureCta2?.enabled === false ? (
                      <div className="px-4 py-2 border border-dashed border-gray-300 text-gray-400 text-[11px] italic uppercase cursor-pointer">Botón oculto — click para activar</div>
                    ) : (
                      <button className="bg-[#4f6354] text-white px-8 py-3.5 text-[11px] font-bold tracking-widest uppercase" style={nStyle('featureCta2')}>{nText('featureCta2', 'NOVEDADES')}</button>
                    )}
                  </EditableElement>
                </div>
              </div>
              <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')} className={`relative h-[300px] md:h-[500px] w-full ${deviceMode === 'mobile' ? 'order-2' : 'lg:w-1/2 order-1 lg:order-2'}`}>
                <div className="relative h-full w-full">
                  {[
                    { img: banners?.[1], cls: 'absolute top-0 right-10 w-[70%] h-[60%] z-10 shadow-lg' },
                    { img: banners?.[2], cls: 'absolute bottom-10 right-0 w-[55%] h-[80%] z-20 shadow-lg' },
                    { img: banners?.[3], cls: 'absolute bottom-0 left-10 w-[60%] h-[50%] z-30 shadow-lg' },
                  ].map(({ img, cls }, i) => (
                    <div
                      key={i}
                      className={`${cls} ${img?.image ? '' : 'bg-[#dfe3da] flex items-center justify-center'}`}
                      style={img?.image ? { backgroundImage: `url('${img.image}')`, backgroundSize: 'cover', backgroundPosition: img.position || 'center' } : undefined}
                    >
                      {!img?.image && <span className="text-[#9aa392] text-[10px] font-medium px-2 text-center">Foto {i + 2}</span>}
                    </div>
                  ))}
                </div>
              </EditableElement>
            </div>
          </div>
          </section>
        </EditableElement>

        {/* Footer — background + headings editable, real categories, no dead links */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'footer')}>
          <footer className="pt-16 pb-8 border-t border-gray-200 mt-12" style={{ backgroundColor: data.hero?.sectionBg?.footer || footColor }}>
            <div className="container mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                <div className="md:col-span-1">
                  <LogoDisplay logoUrl={data.logo?.url} fallbackText={data.logo?.alt || 'LOGO'} className="text-4xl font-serif font-bold tracking-tight text-gray-900 mb-4" />
                  <p className="text-sm text-gray-600 mb-6 max-w-xs">{data.contact?.address || <span className="text-gray-400 italic">Agrega tu dirección</span>}</p>
                </div>
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading1')}>
                    <h4 className="font-bold uppercase mb-6 text-xs tracking-widest text-[#142642]" style={nStyle('footerHeading1')}>{nText('footerHeading1', 'Tienda')}</h4>
                  </EditableElement>
                  <ul className="space-y-4 text-sm font-medium text-gray-600">
                    {natureCategories.slice(0, 4).map((cat: any) => (<li key={cat.id}>{cat.name}</li>))}
                    <li>Ver todo</li>
                  </ul>
                </div>
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading2')}>
                    <h4 className="font-bold uppercase mb-6 text-xs tracking-widest text-[#142642]" style={nStyle('footerHeading2')}>{nText('footerHeading2', 'Soporte')}</h4>
                  </EditableElement>
                  <EditableElement type="contact" isEditorMode={isEditorMode} onEdit={() => onEditElement('contact')}>
                    <ul className="space-y-4 text-sm font-medium text-gray-600">
                      {data.contact?.whatsapp && <li>WhatsApp: {data.contact.whatsapp}</li>}
                      {data.contact?.email && <li>Email: {data.contact.email}</li>}
                      {!data.contact?.whatsapp && !data.contact?.email && <li className="text-gray-400 italic cursor-pointer">Agrega tus datos de contacto</li>}
                    </ul>
                  </EditableElement>
                </div>
              </div>
              <div className="border-t border-gray-300 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-[10px] uppercase tracking-widest">
                <p>© {new Date().getFullYear()} {data.logo?.alt || 'Tu Tienda'}. Todos los derechos reservados.</p>
                <div className="flex gap-4"><span>Powered by Toogo</span></div>
              </div>
            </div>
          </footer>
        </EditableElement>
      </div>
    );
  };

  const PremiumBrandLayoutPreview = () => {
    const heroTitle = welcomeTitle || (settings as any)?.welcome_title || "Calidad excepcional en cada detalle.\nDescubre nuestra nueva colección.";
    const heroMessage = welcomeMessage || (settings as any)?.welcome_message || "Conoce más";

    const bg = data.allColors?.backgroundColor || settings?.store_background_color || '#ffffff';
    const navbarBgColor = data.allColors?.navbarColor || settings?.navbar_bg_color || '#f6f5f0';
    const footColor = data.allColors?.footerColor || settings?.footer_bg_color || '#023f66';
    const headerIconColor = data.allColors?.headerIconColor || (settings as any)?.header_icon_color || '#023f66';
    const rawHeaderIconScale = (settings as any)?.header_icon_scale ?? 100;
    const headerIconScale = rawHeaderIconScale / 100 * 1.0;

    // Only the owner's real testimonials — never invented reviews.
    const currentTestimonials = testimonials;
    const testimonialsPos = currentTestimonials?.position || 'beneath_hero';
    const pbStyle = (k: string) => ({
      fontFamily: heroStyleFontFamily(data.hero?.styles?.[k]?.fontFamily),
      fontSize: pickFontSize(data.hero?.styles?.[k], deviceMode) ? `${pickFontSize(data.hero?.styles?.[k], deviceMode)}px` : undefined,
      color: data.hero?.styles?.[k]?.color || undefined,
      backgroundColor: data.hero?.styles?.[k]?.bgColor || undefined,
    });
    const pbText = (k: string, fallback: string) => data.hero?.styles?.[k]?.text || fallback;

    const renderTestimonials = () => {
      if (!currentTestimonials?.enabled || !(currentTestimonials.list?.length > 0)) {
        if (!isEditorMode) return null;
        return (
          <EditableElement type="testimonials" isEditorMode={isEditorMode} onEdit={() => onEditElement('testimonials')}>
            <div className="py-8 bg-gray-100 border-2 border-dashed border-gray-300 text-center text-gray-500 rounded-lg mx-6 my-4 cursor-pointer hover:bg-gray-200 transition-colors">
              Testimonios — click para configurar los tuyos (sin configurar, no se muestran en la tienda)
            </div>
          </EditableElement>
        );
      }
      return (
        <EditableElement type="testimonials" isEditorMode={isEditorMode} onEdit={() => onEditElement('testimonials')}>
          <div className="relative py-16 md:py-24 bg-[#023f66] text-white overflow-hidden">
            {/* Olas Arriba (Wave Top) */}
            <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-0">
              <svg className="relative block w-full h-[30px] md:h-[40px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="#ffffff" />
              </svg>
            </div>

            <div className="container mx-auto px-6 relative z-10">
              <h2 className="text-center text-2xl md:text-3xl lg:text-4xl font-bold mb-16 max-w-4xl mx-auto leading-relaxed">
                {currentTestimonials.title || "Recomendaciones de Personas"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                {(currentTestimonials.list || []).map((t: any) => (
                  <div key={t.id} className="bg-white text-gray-900 rounded-2xl p-8 pt-12 relative flex flex-col items-center text-center shadow-xl">
                    <div className="absolute -top-10 w-20 h-20 rounded-full bg-white border-2 border-gray-100 shadow-md flex items-center justify-center overflow-hidden">
                      <img src={t.logo || '/placeholder.svg'} alt={t.company} className="max-w-[70%] max-h-[70%] object-contain" />
                    </div>
                    <p className="text-gray-600 text-sm md:text-base leading-relaxed mb-8 italic">"{t.text}"</p>
                    <div className="mt-auto">
                      {t.author && <p className="text-sm font-semibold text-[#023f66]">- {t.author}</p>}
                      {t.role && <p className="text-xs font-bold uppercase tracking-wider text-[#023f66] mt-3">{t.role}</p>}
                      {t.company && <p className="text-xs font-bold uppercase tracking-wider text-[#023f66]">{t.company}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Olas Abajo (Wave Bottom) */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none rotate-180 z-0">
              <svg className="relative block w-full h-[30px] md:h-[40px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="#ffffff" />
              </svg>
            </div>
          </div>
        </EditableElement>
      );
    }

    const topCategories = categories?.slice(0, 4) || [];

    return (
      <div className="min-h-[100vh] font-sans text-gray-900 selection:bg-[#023f66] selection:text-white pb-20 md:pb-0" style={{ backgroundColor: bg }}>
        {testimonialsPos === 'top' && renderTestimonials()}

        {/* Announcement Bar */}
        <EditableElement type="announcement" isEditorMode={isEditorMode} onEdit={() => onEditElement('announcement')}>
          {data.announcement?.enabled !== false && data.announcement?.text && (
            <div className="bg-[#023f66] text-white text-center py-2.5 text-xs font-medium tracking-wide" style={{ ...(data.announcement?.bgColor ? { backgroundColor: data.announcement.bgColor } : {}), ...(data.announcement?.textColor ? { color: data.announcement.textColor } : {}) }}>
              {data.announcement.text}
            </div>
          )}
        </EditableElement>

        {/* Header — background editable via sectionBg.navbar */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'navbar')}>
          <header className="sticky top-0 z-50 shadow-sm transition-all duration-300" style={{ backgroundColor: data.hero?.sectionBg?.navbar || navbarBgColor }}>
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <EditableElement type="logo" isEditorMode={isEditorMode} onEdit={() => onEditElement('logo')}>
                  <div className="cursor-pointer">
                    <LogoDisplay
                      logoUrl={data.logo?.url}
                      logoSize={(settings as any)?.logo_size}
                      logoSizeMobile={(settings as any)?.logo_size_mobile}
                      logoSizeTablet={(settings as any)?.logo_size_tablet}
                      forceDevice={deviceMode}
                      fallbackText={data.logo?.alt || 'LOGO'}
                      className="text-2xl font-bold tracking-tight text-gray-900"
                    />
                  </div>
                </EditableElement>
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'navMenu')} className="hidden md:block">
                <nav className="flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-gray-600" style={pbStyle('navMenu')}>
                  {topCategories.map((cat: any) => (
                    <button key={cat.id} className="hover:text-gray-900 transition-colors">
                      {cat.name}
                    </button>
                  ))}
                  {topCategories.length === 0 && (
                    <>
                      <button className="hover:text-gray-900 transition-colors">Productos</button>
                      <button className="hover:text-gray-900 transition-colors">Colección</button>
                    </>
                  )}
                </nav>
                </EditableElement>
              </div>

              <div className="flex items-center gap-5">
                <Search className="hidden md:block cursor-pointer hover:scale-110 transition-transform" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                <div className="relative cursor-pointer hover:scale-110 transition-transform">
                  <ShoppingCart style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                </div>
                <button className="md:hidden">
                  <Menu style={{ color: headerIconColor, width: `${24 * headerIconScale}px`, height: `${24 * headerIconScale}px` }} />
                </button>
                <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'headerCta')} className="hidden lg:block">
                  {data.hero?.styles?.headerCta?.enabled === false ? (
                    <div className="px-4 py-2 border border-dashed border-gray-300 text-gray-400 text-[11px] italic uppercase cursor-pointer">Botón oculto — click para activar</div>
                  ) : (
                    <button className="border-2 border-[#023f66] text-[#023f66] text-xs font-bold uppercase px-5 py-2 rounded-full hover:bg-[#023f66] hover:text-white transition-colors" style={pbStyle('headerCta')}>
                      {pbText('headerCta', 'VER TODO')}
                    </button>
                  )}
                </EditableElement>
              </div>
            </div>
          </header>
        </EditableElement>

        {/* Hero Section */}
        <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')}>
          <section className="relative w-full min-h-[500px] lg:h-[70vh] flex items-center">
            {banners?.[0] ? (
              <img src={banners[0].image} alt="Hero" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: banners[0].position || 'center' }} />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gray-200"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"></div>
            <div className="container mx-auto px-6 relative z-10 text-white">
              <div className="max-w-xl flex flex-col items-start gap-3">
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'title')}>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold whitespace-pre-line leading-tight" style={pbStyle('title')}>
                    {data.hero?.title || heroTitle}
                  </h1>
                </EditableElement>
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'message')}>
                  <p className="text-lg md:text-xl text-white/90 max-w-sm" style={pbStyle('message')}>
                    {data.hero?.message || heroMessage}
                  </p>
                </EditableElement>
                <div className="flex flex-col sm:flex-row gap-4">
                  <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'cta1')}>
                    {data.hero?.styles?.cta1?.enabled === false ? (
                      <div className="px-4 py-2 border border-dashed border-white/60 text-white/80 text-[11px] italic cursor-pointer">Botón oculto — click para activar</div>
                    ) : (
                      <button className="bg-[#e98063] text-white px-8 py-3.5 rounded-full font-bold shadow-lg hover:bg-[#d46a4f] transition-colors text-center" style={pbStyle('cta1')}>
                        {data.hero?.cta1Label || 'Comprar Ahora'}
                      </button>
                    )}
                  </EditableElement>
                  <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'cta2')}>
                    {data.hero?.styles?.cta2?.enabled === false ? (
                      <div className="px-4 py-2 border border-dashed border-white/60 text-white/80 text-[11px] italic cursor-pointer">Botón oculto — click para activar</div>
                    ) : (
                      <button className="bg-transparent border-2 border-white text-white px-8 py-3.5 rounded-full font-bold hover:bg-white hover:text-gray-900 transition-colors text-center" style={pbStyle('cta2')}>
                        {data.hero?.cta2Label || 'Ver Catálogo'}
                      </button>
                    )}
                  </EditableElement>
                </div>
              </div>
            </div>
          </section>
        </EditableElement>

        {testimonialsPos === 'beneath_hero' && renderTestimonials()}

        {/* Categories Section — cards use each category's first product photo */}
        {topCategories.length > 0 && (
          <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section1')}>
            <section className="py-20 text-center" style={{ backgroundColor: data.hero?.sectionBg?.section1 || undefined }}>
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionTitle1')}>
                <h2 className="text-3xl md:text-4xl font-bold text-[#023f66] mb-12" style={pbStyle('sectionTitle1')}>{pbText('sectionTitle1', '¿Qué estás buscando?')}</h2>
              </EditableElement>
              <div className="container mx-auto px-6 flex flex-wrap justify-center gap-8">
                {topCategories.map((c: any) => {
                  const prod = data.products?.find((p: any) => p.categories?.some((pc: any) => pc.id === c.id) || p.category_id === c.id);
                  const photo = prod?.image || (typeof prod?.images?.[0] === 'object' ? prod.images[0]?.url : prod?.images?.[0]);
                  if (!photo) return null;
                  return (
                    <div key={c.id} className="group cursor-pointer flex flex-col items-center">
                      <div className="w-56 h-40 rounded-3xl overflow-hidden mb-6 bg-gray-100 shadow-md group-hover:shadow-xl transition-all duration-300">
                        <img src={photo} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      </div>
                      <h3 className="text-[#023f66] font-bold text-xl">{c.name}</h3>
                    </div>
                  );
                })}
              </div>
            </section>
          </EditableElement>
        )}

        {/* Best Sellers Section */}
        <EditableElement type="featured_products" isEditorMode={isEditorMode} onEdit={() => onEditElement('featured_products')}>
          <section className="py-20 bg-gray-50 border-y border-gray-200" style={{ backgroundColor: data.hero?.sectionBg?.section2 || undefined }}>
            <div className="container mx-auto px-6">
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionTitle2')}>
                <h2 className="text-3xl md:text-4xl font-bold text-[#023f66] text-center mb-16" style={pbStyle('sectionTitle2')}>{pbText('sectionTitle2', 'Productos más vendidos')}</h2>
              </EditableElement>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {(featuredProducts && featuredProducts.length > 0) ? (
                  featuredProducts.map((productId: string) => {
                    const product = data.products?.find((p: any) => p.id === productId);
                    if (!product) return null;
                    return (
                      <div key={product.id} className="group cursor-pointer bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                        <div className="relative aspect-square bg-[#f8f8f8] p-6 flex items-center justify-center">
                          <img src={product.images?.[0]?.url || '/placeholder.svg'} alt={product.title} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-50">
                            <Heart className="w-5 h-5 text-gray-400" />
                          </button>
                        </div>
                        <div className="p-6 text-center">
                          <h3 className="font-bold text-[#023f66] text-lg mb-2 line-clamp-2">{product.title || product.name}</h3>
                          <span className="font-bold text-[#e98063] text-xl">${product.price_mxn || product.price}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  bestSellers.slice(0, 4).map((product: any) => (
                    <div key={product.id} className="group cursor-pointer bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                      <div className="relative aspect-square bg-[#f8f8f8] p-6 flex items-center justify-center">
                        <img src={product.image || '/placeholder.svg'} alt={product.name} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                        <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-50">
                          <Heart className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>
                      <div className="p-6 text-center">
                        <h3 className="font-bold text-[#023f66] text-lg mb-2 line-clamp-2" style={cardNameStyle} onClick={cardNameClick}>{product.name}</h3>
                        <span className="font-bold text-[#e98063] text-xl">${product.price}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </EditableElement>

        {/* Products Grid — background + title editable */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section3')}>
          <section className="py-16" style={{ backgroundColor: data.hero?.sectionBg?.section3 || undefined }}>
            <div className="container mx-auto px-6">
            <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionTitle3')}>
              <h2 className="text-3xl font-bold text-[#023f66] mb-10 border-b border-gray-200 pb-4" style={pbStyle('sectionTitle3')}>{pbText('sectionTitle3', 'Productos')}</h2>
            </EditableElement>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {bestSellers.map((product: any) => (
                <div key={product.id} className="group cursor-pointer bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300" onClick={() => openProductModal(product)}>
                  <div className="relative aspect-square bg-[#f8f8f8] p-6 flex items-center justify-center">
                    <img src={product.image || '/placeholder.svg'} alt={product.name} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                    <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-50">
                      <Heart className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="font-bold text-[#023f66] text-lg mb-2 line-clamp-2" style={cardNameStyle} onClick={cardNameClick}>{product.name}</h3>
                    {product.description && <p className="text-[#023f66] opacity-60 text-sm mb-4 line-clamp-2">{product.description}</p>}
                    <span className="font-bold text-[#e98063] text-xl">${product.price}</span>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </section>
        </EditableElement>

        {testimonialsPos === 'above_footer' && renderTestimonials()}

        {/* Footer — background + headings editable */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'footer')}>
          <footer className="relative pt-24 pb-10 overflow-hidden" style={{ backgroundColor: data.hero?.sectionBg?.footer || footColor, color: '#fff' }}>
            {/* Olas Arriba de Footer (Wave Top) */}
            <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-0">
              <svg className="relative block w-full h-[30px] md:h-[40px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="#ffffff" />
              </svg>
            </div>

            <div className="container mx-auto px-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                <div className="md:col-span-1">
                  <LogoDisplay logoUrl={data.logo?.url} fallbackText={data.logo?.alt || 'LOGO'} className="text-3xl font-bold tracking-tight text-white mb-6" />
                  <p className="text-sm text-white/70 max-w-xs leading-relaxed">{data.contact?.address || <span className="italic text-white/40">Agrega tu dirección</span>}</p>
                </div>
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading1')}>
                    <h4 className="font-bold text-sm mb-6 uppercase tracking-widest text-[#e98063]" style={pbStyle('footerHeading1')}>{pbText('footerHeading1', 'Tienda')}</h4>
                  </EditableElement>
                  <ul className="space-y-4 text-sm text-white/80">
                    {topCategories.map((c: any) => (
                      <li key={c.id}><button className="hover:text-white transition-colors">{c.name}</button></li>
                    ))}
                    <li><button className="hover:text-white transition-colors">Todos los Productos</button></li>
                  </ul>
                </div>
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading2')}>
                    <h4 className="font-bold text-sm mb-6 uppercase tracking-widest text-[#e98063]" style={pbStyle('footerHeading2')}>{pbText('footerHeading2', 'Soporte')}</h4>
                  </EditableElement>
                  <ul className="space-y-4 text-sm text-white/80">
                    {data.contact?.whatsapp && <li>WhatsApp: {data.contact.whatsapp}</li>}
                    {data.contact?.email && <li>Email: {data.contact.email}</li>}
                    {!data.contact?.whatsapp && !data.contact?.email && <li className="italic text-white/40">Agrega tus datos de contacto</li>}
                  </ul>
                </div>
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading3')}>
                    <h4 className="font-bold text-sm mb-6 uppercase tracking-widest text-[#e98063]" style={pbStyle('footerHeading3')}>{pbText('footerHeading3', 'Síguenos')}</h4>
                  </EditableElement>
                  <div className="flex gap-4">
                    {data.contact?.instagram && <a href={data.contact.instagram} className="hover:text-white transition-colors opacity-80 hover:opacity-100">Instagram</a>}
                    {data.contact?.facebook && <a href={data.contact.facebook} className="hover:text-white transition-colors opacity-80 hover:opacity-100">Facebook</a>}
                  </div>
                </div>
              </div>
              <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-white/50 text-xs uppercase tracking-widest">
                <p>© {new Date().getFullYear()} {data.logo?.alt || 'Tu Marca'}. Todos los derechos reservados.</p>
                <p>Powered by Toogo</p>
              </div>
            </div>
          </footer>
        </EditableElement>

        {testimonialsPos === 'bottom' && renderTestimonials()}
      </div>
    );
  };


  // --- MAIN RENDER ---
  const templateId = propTemplateId || settings?.template_id || 'default';

  const BauhausLayoutPreview = () => {
    // Only include set keys so merging with a base style never wipes it with undefined.
    const bhStyle = (k: string) => {
      const e = data.hero?.styles?.[k] || {};
      const st: any = {};
      if (e.fontFamily) st.fontFamily = heroStyleFontFamily(e.fontFamily);
      { const _fs = pickFontSize(e, deviceMode); if (_fs) st.fontSize = `${_fs}px`; }
      if (e.color) st.color = e.color;
      if (e.bgColor) st.backgroundColor = e.bgColor;
      return st;
    };
    const bhText = (k: string, fallback: string) => data.hero?.styles?.[k]?.text || fallback;
    const red = settings?.primary_color || '#E63946';
    const yellow = settings?.secondary_color || '#FFD60A';
    const blue = '#003049';
    const black = '#0A0A0A';
    const bhBg = bgColor || '#FAF6EE';
    const cats = categories.filter((c: any) => !c.parent_id && c.show_on_home !== false);
    const gridProducts = ((featuredProducts && featuredProducts.length > 0)
      ? featuredProducts.map((id: string) => bestSellers.find((p: any) => p.id === id) || data.products?.find((p: any) => p.id === id)).filter(Boolean)
      : bestSellers.slice(0, 6));
    const accents = [red, yellow, blue];

    return (
      <div className="min-h-screen font-sans" style={{ backgroundColor: bhBg, color: black }}>
        {/* Announcement */}
        <EditableElement type="announcement" isEditorMode={isEditorMode} onEdit={() => onEditElement('announcement')}>
          {data.announcement?.enabled !== false && (
            <div className="text-center py-2 text-xs font-bold tracking-[0.3em] uppercase" style={{ backgroundColor: data.announcement?.bgColor || black, color: data.announcement?.textColor || yellow }}>
              {data.announcement?.text || "ENVÍO GRATIS EN PEDIDOS MAYORES A $999"}
            </div>
          )}
        </EditableElement>

        {/* Header — background editable */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'navbar')}>
          <header className="border-b-[3px] px-6 py-5 flex items-center justify-between" style={{ borderColor: black, backgroundColor: data.hero?.sectionBg?.navbar || navColor || 'transparent' }}>
            <EditableElement type="logo" isEditorMode={isEditorMode} onEdit={() => onEditElement('logo')}>
              <div className="cursor-pointer">
                <LogoDisplay logoUrl={data.logo?.url} logoSize={(settings as any)?.logo_size} logoSizeMobile={(settings as any)?.logo_size_mobile} logoSizeTablet={(settings as any)?.logo_size_tablet} forceDevice={deviceMode} fallbackText={data.logo?.alt || 'BAUHAUS'} className="text-2xl md:text-3xl font-black tracking-tighter uppercase" />
              </div>
            </EditableElement>
            <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'navMenu')} className="hidden md:block">
              <nav className="flex items-center gap-8 text-sm font-bold tracking-wide uppercase" style={bhStyle('navMenu')}>
                {(cats.length > 0 ? cats : [{ name: 'Tienda' }, { name: 'Colección' }, { name: 'Diario' }]).map((cat: any, i: number) => (
                  <span key={i} className="cursor-pointer hover:opacity-60">{cat.name}</span>
                ))}
              </nav>
            </EditableElement>
            <div className="flex items-center gap-4">
              <Search className="w-5 h-5" />
              <ShoppingCart className="w-5 h-5" />
            </div>
          </header>
        </EditableElement>

        {/* Hero — asymmetric grid; background + texts editable */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'hero')}>
          <section style={{ backgroundColor: data.hero?.sectionBg?.hero || undefined }}>
          <div className="container mx-auto px-6 py-12 md:py-16">
            <div className={deviceMode === 'mobile' ? 'flex flex-col gap-6' : 'grid grid-cols-12 gap-4 md:gap-6'}>
              {data.hero?.styles?.heroNumber?.enabled !== false && (
                <div className={`col-span-12 md:col-span-2 flex items-start ${deviceMode === 'mobile' ? 'order-3' : ''}`}>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'heroNumber')}>
                    <div className="text-[80px] md:text-[120px] font-black leading-none" style={{ color: red, ...bhStyle('heroNumber') }}>{bhText('heroNumber', '01')}</div>
                  </EditableElement>
                </div>
              )}
              <div className={`col-span-12 md:col-span-6 flex flex-col justify-center ${deviceMode === 'mobile' ? 'order-1' : ''}`}>
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'title')}>
                  <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-[0.85] tracking-tighter uppercase whitespace-pre-line break-words mb-6" style={bhStyle('title')}>
                    {data.hero?.title || 'FORMA\nSIGUE\nFUNCIÓN'}
                  </h1>
                </EditableElement>
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'message')}>
                  <p className="text-base md:text-lg max-w-md mb-8 leading-relaxed" style={bhStyle('message')}>{data.hero?.message || 'Una colección curada de piezas esenciales. Geometría, color, propósito.'}</p>
                </EditableElement>
                <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'cta1')}>
                  {data.hero?.styles?.cta1?.enabled === false ? (
                    <div className="self-start px-4 py-2 border border-dashed border-gray-400 text-gray-500 text-[11px] italic uppercase cursor-pointer">Botón oculto — click para activar</div>
                  ) : (
                    <button className="self-start px-8 py-4 text-sm font-bold tracking-widest uppercase" style={{ backgroundColor: black, color: yellow, ...bhStyle('cta1') }}>
                      {data.hero?.cta1Label || 'Explorar colección →'}
                    </button>
                  )}
                </EditableElement>
              </div>
              <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')} className={`col-span-12 md:col-span-4 relative ${deviceMode === 'mobile' ? 'order-2' : ''}`}>
                <div className="absolute inset-0 translate-x-3 translate-y-3" style={{ backgroundColor: yellow }} />
                <div className="relative aspect-[3/4] overflow-hidden">
                  {banners?.[0]?.image ? (
                    <img src={banners[0].image} alt="Hero" className="w-full h-full object-cover" style={{ objectPosition: banners[0].position || 'center' }} />
                  ) : (<div className="w-full h-full" style={{ backgroundColor: blue }} />)}
                </div>
              </EditableElement>
            </div>
          </div>
          </section>
        </EditableElement>

        {/* Products — background + title editable; grid opens product picker */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section1')}>
          <section style={{ backgroundColor: data.hero?.sectionBg?.section1 || undefined }}>
          <div className="container mx-auto px-6 py-12 md:py-16">
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="text-sm font-bold tracking-widest uppercase mb-2" style={{ color: red }}>02 — Catálogo</div>
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionTitle1')}>
                  <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter" style={bhStyle('sectionTitle1')}>{bhText('sectionTitle1', 'Selección')}</h2>
                </EditableElement>
              </div>
            </div>
            <EditableElement type="featured_products" isEditorMode={isEditorMode} onEdit={() => onEditElement('featured_products')}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-10">
                {gridProducts.map((product: any, i: number) => (
                  <div key={product.id} className="group cursor-pointer">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 translate-x-2 translate-y-2" style={{ backgroundColor: accents[i % 3] }} />
                      <div className="relative aspect-square overflow-hidden bg-gray-100">
                        <img src={product.image || (typeof product.images?.[0] === 'object' ? product.images[0]?.url : product.images?.[0]) || '/placeholder.svg'} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-lg font-bold uppercase tracking-tight line-clamp-1" style={cardNameStyle} onClick={cardNameClick}>{product.name}</h3>
                      <span className="text-base font-black" style={{ color: accents[i % 3] }}>${product.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </EditableElement>
          </div>
          </section>
        </EditableElement>

        {/* Manifesto — background + headings editable; photos open banners editor */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section2')}>
          <section style={{ backgroundColor: data.hero?.sectionBg?.section2 || undefined }}>
          <div className="container mx-auto px-6 py-12 md:py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {[{ bg: blue, num: '03 — Manifiesto', key: 'manifesto1', def: 'Menos pero mejor', bannerIdx: 1 }, { bg: red, num: '04 — Filosofía', key: 'manifesto2', def: 'Diseño honesto', bannerIdx: 2 }].map((m) => (
                <EditableElement key={m.key} type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')} className="aspect-[4/5] relative overflow-hidden">
                  <div className="w-full h-full" style={{ backgroundColor: m.bg }}>
                    {banners?.[m.bannerIdx]?.image && <img src={banners[m.bannerIdx].image} alt="Banner" className="w-full h-full object-cover" />}
                  </div>
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute bottom-8 left-8 right-8 text-white">
                    <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: yellow }}>{m.num}</div>
                    <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', m.key)}>
                      <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none" style={bhStyle(m.key)}>{bhText(m.key, m.def)}</h3>
                    </EditableElement>
                  </div>
                </EditableElement>
              ))}
            </div>
          </div>
          </section>
        </EditableElement>

        {/* Footer — background + headings editable */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'footer')}>
          <footer className="border-t-[3px] mt-12" style={{ borderColor: black, backgroundColor: data.hero?.sectionBg?.footer || footColor || bhBg }}>
            <div className="container mx-auto px-6 py-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                <div>
                  <LogoDisplay logoUrl={data.logo?.url} fallbackText={data.logo?.alt || 'BAUHAUS'} className="text-3xl font-black uppercase tracking-tighter mb-4" />
                  <p className="text-sm leading-relaxed">{data.contact?.address || <span className="italic opacity-50">Agrega tu dirección</span>}</p>
                </div>
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading1')}>
                    <h4 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: red, ...bhStyle('footerHeading1') }}>{bhText('footerHeading1', 'Tienda')}</h4>
                  </EditableElement>
                  <ul className="space-y-2 text-sm"><li>Catálogo</li><li>Ofertas</li><li>Novedades</li></ul>
                </div>
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading2')}>
                    <h4 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: red, ...bhStyle('footerHeading2') }}>{bhText('footerHeading2', 'Contacto')}</h4>
                  </EditableElement>
                  <EditableElement type="contact" isEditorMode={isEditorMode} onEdit={() => onEditElement('contact')}>
                    <ul className="space-y-2 text-sm">
                      {data.contact?.whatsapp && <li>WhatsApp</li>}
                      {data.contact?.email && <li>{data.contact.email}</li>}
                      {!data.contact?.whatsapp && !data.contact?.email && <li className="italic opacity-50">Agrega tus datos</li>}
                    </ul>
                  </EditableElement>
                </div>
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading3')}>
                    <h4 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: red, ...bhStyle('footerHeading3') }}>{bhText('footerHeading3', 'Legal')}</h4>
                  </EditableElement>
                  <ul className="space-y-2 text-sm"><li>Términos</li><li>Privacidad</li></ul>
                </div>
              </div>
              <div className="border-t-2 pt-4 flex flex-col md:flex-row justify-between items-center gap-2 text-xs font-bold tracking-widest uppercase" style={{ borderColor: black }}>
                <span>© {new Date().getFullYear()} {data.logo?.alt || 'Tu Tienda'}</span>
                <span>Powered by Toogo</span>
              </div>
            </div>
          </footer>
        </EditableElement>
      </div>
    );
  };

  const CyberLayoutPreview = () => {
    const cy = (k: string) => {
      const e = data.hero?.styles?.[k] || {};
      const st: any = {};
      if (e.fontFamily) st.fontFamily = heroStyleFontFamily(e.fontFamily);
      { const _fs = pickFontSize(e, deviceMode); if (_fs) st.fontSize = `${_fs}px`; }
      if (e.color) st.color = e.color;
      if (e.bgColor) st.backgroundColor = e.bgColor;
      return st;
    };
    const cyText = (k: string, fallback: string) => data.hero?.styles?.[k]?.text || fallback;
    const cBg = bgColor || '#0A0A14';
    const surface = '#13131E';
    const border = '#2A2A3E';
    const neon = settings?.primary_color || '#00F5FF';
    const magenta = settings?.secondary_color || '#FF00E5';
    const text = '#E8E8F0';
    const muted = '#8888A0';
    const cats = categories.filter((c: any) => !c.parent_id && c.show_on_home !== false);
    const grid = ((featuredProducts && featuredProducts.length > 0)
      ? featuredProducts.map((id: string) => bestSellers.find((p: any) => p.id === id) || data.products?.find((p: any) => p.id === id)).filter(Boolean)
      : bestSellers.slice(0, 8));
    const gridIds = new Set(grid.map((p: any) => p?.id));
    const otherGrid = (featuredProducts2 && featuredProducts2.length > 0)
      ? featuredProducts2.map((id: string) => data.products?.find((p: any) => p.id === id)).filter(Boolean)
      : (data.products || []).filter((p: any) => !gridIds.has(p.id)).slice(0, 8);

    return (
      <div className="min-h-screen font-sans" style={{ backgroundColor: cBg, color: text, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>
        {/* Ticker */}
        <EditableElement type="ticker" isEditorMode={isEditorMode} onEdit={() => onEditElement('ticker')}>
          {data.announcement?.enabled !== false && (
            <div className="overflow-hidden border-b py-2 text-center" style={{ borderColor: border, backgroundColor: data.ticker?.bgColor || surface }}>
              <span className="font-bold tracking-[0.2em] text-xs" style={{ color: data.ticker?.textColor || neon }}>{data.ticker?.text || data.announcement?.text || '◢ NUEVA TEMPORADA  ◢ ENVÍO INMEDIATO'}</span>
            </div>
          )}
        </EditableElement>

        {/* Header */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'navbar')}>
          <header className="backdrop-blur-xl border-b" style={{ backgroundColor: data.hero?.sectionBg?.navbar || navColor || `${cBg}cc`, borderColor: border }}>
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EditableElement type="logo" isEditorMode={isEditorMode} onEdit={() => onEditElement('logo')}>
                  <LogoDisplay logoUrl={data.logo?.url} logoSize={(settings as any)?.logo_size} forceDevice={deviceMode} fallbackText={data.logo?.alt || 'CYBER'} className="text-xl md:text-2xl font-black tracking-[0.15em] uppercase" />
                </EditableElement>
              </div>
              <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'navMenu')} className="hidden md:block">
                <nav className="flex items-center gap-8 text-xs font-bold tracking-[0.15em] uppercase" style={cy('navMenu')}>
                  {(cats.length > 0 ? cats : [{ name: 'Catálogo' }, { name: 'Drops' }, { name: 'Tech' }]).map((c: any, i: number) => (
                    <span key={i} className="cursor-pointer" style={{ color: text }}>{c.name}</span>
                  ))}
                </nav>
              </EditableElement>
              <div className="flex items-center gap-4">
                <Search className="w-5 h-5" style={{ color: text }} />
                <ShoppingCart className="w-5 h-5" style={{ color: text }} />
              </div>
            </div>
          </header>
        </EditableElement>

        {/* Hero */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'hero')}>
          <section className="relative overflow-hidden" style={{ backgroundColor: data.hero?.sectionBg?.hero || undefined }}>
            <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: `linear-gradient(${text} 1px, transparent 1px), linear-gradient(90deg, ${text} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
            <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ backgroundColor: neon }} />
            <div className="relative container mx-auto px-6 py-16 md:py-24">
              <div className={`grid gap-12 items-center ${deviceMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                <div>
                  {data.hero?.styles?.heroBadge?.enabled !== false && (
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'heroBadge')}>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-6 text-xs tracking-[0.3em] uppercase" style={{ borderColor: neon, color: neon, ...cy('heroBadge') }}>{cyText('heroBadge', 'SYSTEM ONLINE')}</div>
                  </EditableElement>
                  )}
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'title')}>
                    <h1 className="text-5xl md:text-7xl font-black leading-[0.95] tracking-tight uppercase whitespace-pre-line mb-6" style={data.hero?.styles?.title?.color ? cy('title') : { background: `linear-gradient(135deg, ${text} 0%, ${neon} 50%, ${magenta} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', ...cy('title') }}>
                      {data.hero?.title || 'FUTURO\nDIGITAL.\nDISEÑADO\nHOY.'}
                    </h1>
                  </EditableElement>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'message')}>
                    <p className="text-base md:text-lg mb-8 max-w-md leading-relaxed" style={{ color: muted, ...cy('message') }}>{data.hero?.message || 'Productos del mañana. Tecnología que se adelanta.'}</p>
                  </EditableElement>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'cta1')}>
                      <button className="px-8 py-4 text-sm font-bold tracking-widest uppercase" style={{ background: data.hero?.styles?.cta1?.bgColor || `linear-gradient(135deg, ${neon} 0%, ${magenta} 100%)`, color: cBg, ...cy('cta1') }}>{data.hero?.cta1Label || 'Explorar drops'}</button>
                    </EditableElement>
                    <EditableElement type="botón" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'cta2')}>
                      <button className="px-8 py-4 text-sm font-bold tracking-widest uppercase border" style={{ borderColor: border, color: text, ...cy('cta2') }}>{data.hero?.cta2Label || 'Ver catálogo'}</button>
                    </EditableElement>
                  </div>
                  {data.hero?.styles?.stat1?.enabled !== false && (
                    <div className="grid grid-cols-3 gap-4 mt-12 pt-8 border-t" style={{ borderColor: border }}>
                      {[{ v: 'stat1', l: 'statLabel1', dv: '24/7', dl: 'Soporte', c: neon }, { v: 'stat2', l: 'statLabel2', dv: '100%', dl: 'Garantía', c: magenta }, { v: 'stat3', l: 'statLabel3', dv: 'FAST', dl: 'Envíos', c: neon }].map((st) => (
                        <EditableElement key={st.v} type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', st.v)}>
                          <div>
                            <div className="text-2xl font-black" style={{ color: st.c, ...cy(st.v) }}>{cyText(st.v, st.dv)}</div>
                            <div className="text-[10px] tracking-widest uppercase" style={{ color: muted, ...cy(st.l) }}>{cyText(st.l, st.dl)}</div>
                          </div>
                        </EditableElement>
                      ))}
                    </div>
                  )}
                </div>
                <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')} className="relative">
                  <div className="absolute inset-0 rounded-2xl blur-2xl opacity-40" style={{ background: `linear-gradient(135deg, ${neon} 0%, ${magenta} 100%)` }} />
                  <div className="relative aspect-video rounded-2xl overflow-hidden border-2" style={{ borderColor: border, backgroundColor: surface }}>
                    {banners?.[0]?.image ? (
                      <img src={banners[0].image} alt="Hero" className="w-full h-full object-cover" style={{ objectPosition: banners[0].position || 'center' }} />
                    ) : (<div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cBg} 0%, ${surface} 100%)` }}><p className="text-xs tracking-widest uppercase" style={{ color: muted }}>Hero Banner</p></div>)}
                  </div>
                </EditableElement>
              </div>
            </div>
          </section>
        </EditableElement>

        {/* Products */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section1')}>
          <section style={{ backgroundColor: data.hero?.sectionBg?.section1 || undefined }}>
          <div className="container mx-auto px-6 py-16">
            <div className="flex items-end justify-between mb-10">
              <div>
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionEyebrow1')}>
                  <div className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: neon, ...cy('sectionEyebrow1') }}>{cyText('sectionEyebrow1', 'PRODUCTS')}</div>
                </EditableElement>
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionTitle1')}>
                  <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight" style={cy('sectionTitle1')}>{cyText('sectionTitle1', 'Drops activos')}</h2>
                </EditableElement>
              </div>
            </div>
            <EditableElement type="featured_products" isEditorMode={isEditorMode} onEdit={() => onEditElement('featured_products')}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {grid.map((product: any) => (
                  <div key={product.id} className="rounded-xl overflow-hidden border" style={{ borderColor: border, backgroundColor: surface }}>
                    <div className="relative aspect-square overflow-hidden">
                      <img src={product.image || (typeof product.images?.[0] === 'object' ? product.images[0]?.url : product.images?.[0]) || '/placeholder.svg'} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-bold uppercase tracking-tight line-clamp-1 mb-1" style={cardNameStyle} onClick={cardNameClick}>{product.name}</h3>
                      <span className="text-base font-black" style={{ color: neon }}>${product.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </EditableElement>
          </div>
          </section>
        </EditableElement>

        {/* Newsletter banner — uploadable background image via text_banner */}
        {data.hero?.styles?.newsletter?.enabled !== false && (
          <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section2')}>
            <section style={{ backgroundColor: data.hero?.sectionBg?.section2 || undefined }}>
            <div className="container mx-auto px-6 py-16">
              <EditableElement type="banner" isEditorMode={isEditorMode} onEdit={() => onEditElement('text_banner')}>
              <div
                className="relative overflow-hidden rounded-2xl p-8 md:p-16 border text-center bg-cover bg-center"
                style={{
                  borderColor: border,
                  backgroundColor: surface,
                  backgroundImage: data.textBanner?.imageUrl ? `url(${data.textBanner.imageUrl})` : undefined,
                  backgroundPosition: data.textBanner?.imagePosition || '50% 50%',
                }}
              >
                {data.textBanner?.imageUrl && <div className="absolute inset-0" style={{ backgroundColor: `${cBg}99` }} />}
                <div className="relative">
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'newsletterTitle')}>
                  <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4" style={cy('newsletterTitle')}>{cyText('newsletterTitle', 'Sé el primero en saber.')}</h3>
                </EditableElement>
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'newsletterText')}>
                  <p style={{ color: muted, ...cy('newsletterText') }}>{cyText('newsletterText', 'Drops exclusivos. Ofertas anticipadas. Cero spam.')}</p>
                </EditableElement>
                </div>
              </div>
              </EditableElement>
            </div>
            </section>
          </EditableElement>
        )}

        {/* Otros productos — second grid below the banner */}
        {otherGrid.length > 0 && (
          <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'section3')}>
            <section style={{ backgroundColor: data.hero?.sectionBg?.section3 || undefined }}>
            <div className="container mx-auto px-6 pb-16">
              <div className="mb-12">
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionEyebrow3')}>
                  <div className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: neon, ...cy('sectionEyebrow3') }}>{cyText('sectionEyebrow3', 'MÁS')}</div>
                </EditableElement>
                <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'sectionTitle3')}>
                  <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight" style={cy('sectionTitle3')}>{cyText('sectionTitle3', 'También te puede interesar')}</h2>
                </EditableElement>
              </div>
              <EditableElement type="featured_products" isEditorMode={isEditorMode} onEdit={() => onEditElement('featured_products', 'featured_grid_2')}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {otherGrid.map((product: any) => (
                  <div key={product.id} className="rounded-xl overflow-hidden border" style={{ borderColor: border, backgroundColor: surface }}>
                    <div className="relative aspect-square overflow-hidden">
                      <img src={product.image || (typeof product.images?.[0] === 'object' ? product.images[0]?.url : product.images?.[0]) || '/placeholder.svg'} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-bold uppercase tracking-tight line-clamp-1 mb-1" style={cardNameStyle} onClick={cardNameClick}>{product.name}</h3>
                      <span className="text-base font-black" style={{ color: neon }}>${product.price}</span>
                    </div>
                  </div>
                ))}
              </div>
              </EditableElement>
            </div>
            </section>
          </EditableElement>
        )}

        {/* Footer */}
        <EditableElement type="fondo sección" isEditorMode={isEditorMode} onEdit={() => onEditElement('section_bg', 'footer')}>
          <footer className="border-t mt-12" style={{ borderColor: border, backgroundColor: data.hero?.sectionBg?.footer || footColor || surface }}>
            <div className="container mx-auto px-6 py-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <LogoDisplay logoUrl={data.logo?.url} fallbackText={data.logo?.alt || 'CYBER'} className="text-xl font-black tracking-[0.15em] uppercase" />
                  </div>
                  <p className="text-sm" style={{ color: muted }}>{data.contact?.address || <span className="italic opacity-60">Agrega tu dirección</span>}</p>
                </div>
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading1')}>
                    <h4 className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ color: neon, ...cy('footerHeading1') }}>{cyText('footerHeading1', '// Tienda')}</h4>
                  </EditableElement>
                  <ul className="space-y-2 text-sm" style={{ color: muted }}><li>Catálogo</li><li>Drops</li><li>Tech</li></ul>
                </div>
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading2')}>
                    <h4 className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ color: neon, ...cy('footerHeading2') }}>{cyText('footerHeading2', '// Contacto')}</h4>
                  </EditableElement>
                  <EditableElement type="contact" isEditorMode={isEditorMode} onEdit={() => onEditElement('contact')}>
                    <ul className="space-y-2 text-sm" style={{ color: muted }}>
                      {data.contact?.whatsapp && <li>WhatsApp</li>}
                      {data.contact?.email && <li>{data.contact.email}</li>}
                      {!data.contact?.whatsapp && !data.contact?.email && <li className="italic opacity-60">Agrega tus datos</li>}
                    </ul>
                  </EditableElement>
                </div>
                <div>
                  <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'footerHeading3')}>
                    <h4 className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ color: neon, ...cy('footerHeading3') }}>{cyText('footerHeading3', '// Legal')}</h4>
                  </EditableElement>
                  <ul className="space-y-2 text-sm" style={{ color: muted }}><li>Términos</li><li>Privacidad</li></ul>
                </div>
              </div>
              <div className="border-t pt-6 text-xs tracking-[0.2em] uppercase" style={{ borderColor: border, color: muted }}>© {new Date().getFullYear()} {data.logo?.alt || 'Tu Tienda'} // Powered by Toogo</div>
            </div>
          </footer>
        </EditableElement>
      </div>
    );
  };

  const _cardText = data.hero?.styles?.productCardText;
  const _cardResolvedSize = pickFontSize(_cardText, deviceMode);
  const _cardStyle = (_cardText?.fontFamily || _cardResolvedSize)
    ? { fontFamily: heroStyleFontFamily(_cardText?.fontFamily), fontSize: _cardResolvedSize ? `${_cardResolvedSize}px` : undefined }
    : undefined;
  return (
    <CardStyleContext.Provider value={{ style: _cardStyle, isEditorMode, onEditText: () => onEditElement('hero_element', 'productCardText') }}>
    <>
      {templateId === 'cyber' ? (
        <CyberLayoutPreview />
      ) : templateId === 'bauhaus' ? (
        <BauhausLayoutPreview />
      ) : templateId === 'premium_brand' ? (
        <PremiumBrandLayoutPreview />
      ) : templateId === 'nature' ? (
        <NatureLayoutPreview />
      ) : templateId === 'trendy_fashion' ? (
        <TrendyFashionLayoutPreview />
      ) : templateId === 'fashion_hero' ? (
        <FashionHeroLayoutPreview />
      ) : templateId === 'fashion' ? (
        <FashionLayoutPreview />
      ) : templateId === 'simple_live' || templateId === 'sidebar' ? (
        <SimpleLiveLayoutPreview />
      ) : templateId === 'minimal' ? (
        <MinimalLayoutPreview />
      ) : (
        <DefaultLayoutPreview />
      )}

      {/* Product Detail Modal (Shared) */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  {selectedProduct.name}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center space-x-4 mb-4">
                      <span className="text-3xl font-bold text-gray-900">
                        ${selectedProduct.price} MXN
                      </span>
                      {selectedProduct.originalPrice && (
                        <span className="text-xl text-gray-500 line-through">
                          ${selectedProduct.originalPrice} MXN
                        </span>
                      )}
                    </div>

                    {selectedProduct.rating && (
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-5 h-5 ${i < Math.floor(selectedProduct.rating)
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                                }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {selectedProduct.rating} ({selectedProduct.reviews} reseñas)
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Descripción
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedProduct.description}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {settings?.whatsapp_number && (
                      <Button
                        onClick={() => sendWhatsAppMessage(selectedProduct)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Contactar por WhatsApp
                      </Button>
                    )}

                    <Button
                      onClick={addToCart}
                      variant="outline"
                      className="w-full"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Agregar al carrito
                    </Button>

                    <Button
                      onClick={() => toggleFavorite(selectedProduct.id)}
                      variant="ghost"
                      className="w-full"
                    >
                      <Heart
                        className={`w-4 h-4 mr-2 ${favorites.includes(selectedProduct.id)
                          ? "fill-red-500 text-red-500"
                          : "text-gray-600"
                          }`}
                      />
                      {favorites.includes(selectedProduct.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
    </CardStyleContext.Provider>
  );
};