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
  X
} from "lucide-react";
import { EditableElement } from "./EditableElement";
import { EditorData } from "./DashboardVisualEditor";
import { useTenantSettings } from "@/hooks/useTenantSettings";

/** Map hero.styles.<element>.fontFamily token to a real CSS font stack. */
const heroStyleFontFamily = (token?: string): string | undefined => {
  switch (token) {
    case 'serif': return 'ui-serif, Georgia, serif';
    case 'mono': return 'ui-monospace, SFMono-Regular, Menlo, monospace';
    case 'sans': return 'ui-sans-serif, system-ui, sans-serif';
    default: return undefined;
  }
};

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
  testimonials
}: StorePreviewProps) => {
  const { settings } = useTenantSettings();

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

  const DefaultLayoutPreview = () => (
    <div className="min-h-screen" style={{ backgroundColor: bgColor }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-gray-200"
        style={{ backgroundColor: navColor }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <EditableElement
              type="logo"
              isEditorMode={isEditorMode}
              onEdit={() => onEditElement('logo')}
            >
              <LogoDisplay size="md" fallbackText="Mi Tienda" className="h-10 w-auto" />
            </EditableElement>

            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
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
                  placeholder="Buscar productos..."
                  style={{
                    height: `${scaledInputHeight}px`,
                    fontSize: `${scaledTextSize}px`,
                    borderColor: headerIconColor,
                    color: headerIconColor,
                    borderRadius: `${scaledBorderRadius}px`,
                    paddingLeft: `${scaledPaddingLeft}px`,
                    backgroundColor: 'transparent'
                  }}
                  className="border-2"
                />
              </div>
            </div>

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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu
                  style={{
                    color: headerIconColor,
                    width: `${scaledIconSize}px`,
                    height: `${scaledIconSize}px`
                  }}
                />
              </Button>
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

      {/* Más Vendidos */}
      <section id="bestsellers" className="relative -mt-20 z-10">
        <div className="w-full px-4">
          <div className="w-full pt-8 pb-4">
            <div className="mb-6">
              <AutoCarousel
                title=""
                products={bestSellers}
                isBestSellers={true}
                onProductClick={openProductModal}
                onToggleFavorite={toggleFavorite}
                favorites={favorites}
                hoverColor={hoverColor}
                cardBgColor={cardBgColor}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-white py-8">
        <div className="container mx-auto px-4">
          {categories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-12">
              <AutoCarousel
                title={category.name}
                products={category.products}
                onProductClick={openProductModal}
                onToggleFavorite={toggleFavorite}
                favorites={favorites}
                hoverColor={hoverColor}
                cardBgColor={cardBgColor}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <EditableElement
        type="contact"
        isEditorMode={isEditorMode}
        onEdit={() => onEditElement('contact')}
      >
        <ContactSection
          contactData={data.contact}
          backgroundColor={footColor}
          iconColor={footerIconColor}
          iconScale={footerIconScale}
        />
      </EditableElement>
    </div>
  );

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

    return (
      <div className="min-h-screen font-sans text-black relative" style={{ backgroundColor: bgColor }}>
        {/* Top Bar */}
        {(data.announcement?.enabled !== false) && (
          <EditableElement type="announcement" isEditorMode={isEditorMode} onEdit={() => onEditElement('announcement')}>
            <div className={`bg-gray-100 py-2 text-center text-[10px] font-semibold tracking-wide ${isEditorMode ? 'cursor-pointer hover:bg-gray-200' : ''}`}>
              {data.announcement?.text || "Refer A Friend To Earn $10 Off Your Next Purchase Of $50+ 👯‍♀️"}
            </div>
          </EditableElement>
        )}

        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-transparent h-16 flex items-center justify-between px-4" style={{ backgroundColor: navColor }}>
          <nav className="hidden md:flex gap-4 text-xs font-semibold text-gray-700">
            {categories.filter(c => !c.parent_id).map((cat: any) => (
              <span key={cat.id || cat.name} className="uppercase cursor-pointer hover:text-black">{cat.name}</span>
            ))}
            {categories.filter(c => !c.parent_id).length === 0 && (
              <>
                <span>MUJER</span>
                <span>HOMBRE</span>
              </>
            )}
          </nav>

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" style={{ color: headerIconColor }} />
          </Button>

          <div className="absolute left-1/2 -translate-x-1/2">
            <EditableElement type="logo" isEditorMode={isEditorMode} onEdit={() => onEditElement('logo')}>
              <LogoDisplay size="sm" fallbackText="GYMSTORE" className="text-xl font-extrabold uppercase" />
            </EditableElement>
          </div>

          <div className="flex items-center gap-4">
            <Search style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
            <ShoppingCart style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
          </div>
        </header>

        {/* Hero */}
        <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')}>
          <div className="relative w-full aspect-[4/3] md:aspect-[21/9] bg-gray-200 overflow-hidden">
            {banners.length > 0 ? (
              <img src={banners[0].image} className="w-full h-full object-cover" style={{ objectPosition: banners[0].position || 'center center' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300">Banner</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-8">
              <h1 className="text-white text-3xl font-extrabold uppercase mb-2">
                {welcomeTitle || "Atletas Híbridos"}
              </h1>
              <p className="text-white/90 text-xs mb-4 max-w-sm font-medium">
                {welcomeMessage || "Descubre la nueva colección."}
              </p>
              <div className="flex gap-2">
                <Button className="bg-white text-black text-xs px-8 py-4 rounded-full font-bold border-2 border-white uppercase tracking-wider">
                  TIENDA
                </Button>
              </div>
            </div>
          </div>
        </EditableElement>

        {/* Product Ticker — keeps a placeholder in editor mode so users can re-enable a hidden bar */}
        {((data.ticker?.enabled !== false) || isEditorMode) && (
          <EditableElement type="ticker" isEditorMode={isEditorMode} onEdit={() => onEditElement('ticker')}>
            {data.ticker?.enabled === false ? (
              <div className="bg-gray-100 border border-dashed border-gray-300 text-gray-500 py-2 text-center text-[11px] italic cursor-pointer hover:bg-gray-200">
                Barra de noticias oculta — click para mostrarla
              </div>
            ) : (
              <div className={`bg-black text-white py-2 overflow-hidden ${isEditorMode ? 'cursor-pointer hover:bg-zinc-800' : ''}`}>
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

        {/* Products */}
        <div className="px-4 py-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl font-extrabold uppercase mb-2">Recién Llegados</h2>
              <a href="#" className="text-xs font-semibold underline underline-offset-4 hover:text-gray-600">Ver todo</a>
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
                  <div className="absolute top-2 left-2 bg-white px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider z-20">New</div>
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
                <h3 className="font-bold text-xs leading-tight mb-1 text-gray-900">{product.name}</h3>
                <span className="text-xs font-bold text-gray-700">${product.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mid Banner */}
        {/* Mid Banner */}
        {(data.textBanner?.isActive !== false) && (
          <EditableElement type="text_banner" isEditorMode={isEditorMode} onEdit={() => onEditElement('text_banner')}>
            <div className={`py-4 ${isEditorMode ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
              <div
                className="w-full h-64 bg-gray-900 relative flex items-center justify-center overflow-hidden"
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
              </div>
            </div>
          </EditableElement>
        )}

        {/* Popular Grid */}
        <EditableElement type="featured_products" isEditorMode={isEditorMode} onEdit={() => onEditElement('featured_products')}>
          <div className={`px-4 py-8 md:py-12 ${isEditorMode ? 'hover:bg-gray-50 cursor-pointer' : ''}`}>
            <h2 className="text-xl md:text-2xl font-extrabold uppercase mb-6">Popular en este momento</h2>
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

        {/* Footer */}
        {/* Footer */}
        <footer className="text-white pt-16 pb-8" style={{ backgroundColor: footColor }}>
          <div className="px-4 container mx-auto">
            <EditableElement type="contact" isEditorMode={isEditorMode} onEdit={() => onEditElement('contact')}>
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 ${isEditorMode ? 'cursor-pointer hover:bg-zinc-900 p-4 -m-4 rounded-lg transition-colors' : ''}`}>

                {/* Contact Column */}
                <div>
                  <h4 className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500">Contacto</h4>
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
                  <h4 className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500">Ubicación</h4>
                  <p className="text-sm font-medium leading-relaxed max-w-xs text-gray-300">
                    {data.contact?.address || <span className="text-zinc-600 italic">Configura tu dirección</span>}
                  </p>
                </div>

                {/* Socials Column */}
                <div>
                  <h4 className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500">Síguenos</h4>
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
      </div>
    );
  };

  const MinimalLayoutPreview = () => (

    <div className="min-h-screen font-sans selection:bg-gray-200" style={{ backgroundColor: bgColor }}>
      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md md:static text-center" style={{ backgroundColor: navColor }}>
        {/* Desktop Navigation Links (Left) */}
        <nav className="hidden md:flex md:flex-1 md:justify-start gap-8 text-sm uppercase tracking-widest text-gray-500 font-medium">
          <button className="hover:text-black transition-colors">Catálogo</button>
          <button className="hover:text-black transition-colors">Contacto</button>
        </nav>

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

      {/* Hero */}
      <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')}>
        {banners.length > 0 ? (
          <section className="mb-12 md:mb-20 px-4 md:px-6">
            <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-gray-100">
              <img src={banners[0].image} className="w-full h-full object-cover" style={{ objectPosition: banners[0].position || 'center center' }} alt="Banner" />
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                <div className="text-center text-white px-4">
                  <h2 className="text-3xl md:text-6xl font-serif mb-4 drop-shadow-md">Nueva Colección</h2>
                  <Button className="bg-white text-black hover:bg-white/90 rounded-none px-6 py-4 md:px-8 md:py-6 text-xs uppercase tracking-[0.2em]">Explorar</Button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="h-64 bg-gray-100 flex items-center justify-center mb-10 text-gray-300 font-serif italic text-4xl">Banner Area</div>
        )}
      </EditableElement>

      {/* Products */}
      <main className="container mx-auto px-4 md:px-6 mb-20">
        {categories.map((cat, idx) => (
          <div key={idx} className="mb-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-serif mb-2">{cat.name}</h2>
              <div className="w-10 h-0.5 bg-black mx-auto"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-8 md:gap-y-16">
              {cat.products.map((product: any) => (
                <div key={product.id} className="group cursor-pointer" onClick={() => openProductModal(product)}>
                  <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden mb-4">
                    <img src={product.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={product.name} />
                    <div className="absolute bottom-0 inset-x-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/50 to-transparent flex justify-center">
                      <Button className="bg-white text-black hover:bg-gray-100 border-none rounded-none uppercase text-xs tracking-widest w-full">Ver Detalles</Button>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm text-gray-900 font-medium mb-1 line-clamp-1">{product.name}</h3>
                    <span className="text-gray-500 font-light">${product.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-gray-100 py-12 text-center text-xs text-gray-400" style={{ backgroundColor: footColor }}>
        <p>&copy; {new Date().getFullYear()} Minimal Store. Powered by Toogo.</p>
        <EditableElement type="contact" isEditorMode={isEditorMode} onEdit={() => onEditElement('contact')}>
          <div className="mt-4 flex justify-center gap-4">
            {data.contact?.instagram && <span style={{ color: footerIconColor, fontSize: `${12 * footerIconScale}px` }}>Instagram</span>}
            {data.contact?.email && <span style={{ color: footerIconColor, fontSize: `${12 * footerIconScale}px` }}>Email</span>}
          </div>
        </EditableElement>
      </footer>
    </div>
  );

  const TrendyFashionLayoutPreview = () => {
    const productsToShow = data.products?.length > 0 ? data.products.slice(0, 8) : bestSellers;

    const getHeroShapeRadius = (shape?: string) => {
      switch (shape) {
        case 'square': return '0';
        case 'rounded': return '2rem';
        case 'circle': return '50%';
        case 'organic':
        default: return '60% 40% 40% 60% / 55% 55% 45% 45%';
      }
    };

    const heroShape = data.hero?.shape || settings?.hero_image_shape || 'organic';

    return (
      <div className="min-h-screen font-sans text-gray-900" style={{ backgroundColor: bgColor || '#e8f0ef' }}>
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between relative z-50" style={{ backgroundColor: 'transparent' }}>
          <EditableElement type="logo" isEditorMode={isEditorMode} onEdit={() => onEditElement('logo')}>
            <LogoDisplay size="md" fallbackText="Fashion" className="text-2xl font-serif font-bold tracking-tight text-gray-900" />
          </EditableElement>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
            {categories.filter(c => !c.parent_id).slice(0, 5).map((cat: any) => (
              <span key={cat.id} className="hover:text-gray-900 cursor-pointer">{cat.name}</span>
            ))}
            {categories.length === 0 && (<><span>Belleza</span><span>Hombre</span><span>Mujer</span><span>Niños</span><span>Nosotros</span></>)}
          </nav>
          <div className="flex items-center gap-3">
            <ShoppingCart style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
            <Heart style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
            <button className="hidden md:flex items-center gap-2 bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-full">Contacto</button>
          </div>
        </header>

        {/* Hero */}
        <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')}>
          <section className="relative w-full min-h-[75vh] flex flex-col lg:flex-row items-center px-6 lg:px-16 py-8">
            {/* Left text */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center py-10 z-10 order-2 lg:order-1">
              <h1 className="text-4xl lg:text-5xl font-serif font-bold leading-tight mb-8 text-gray-900 whitespace-pre-line">
                {data.hero?.title || 'Los Mejores Productos\npara Tu Estilo\nPersonal'}
              </h1>
              <div className="flex gap-4 mb-6">
                <button className="bg-gray-900 text-white px-7 py-2.5 text-xs font-semibold">Ver Ahora</button>
                <button className="border border-gray-900 text-gray-900 px-7 py-2.5 text-xs font-semibold">Nueva Colección</button>
              </div>
              <p className="text-sm text-gray-600">¡Ahorra <span className="text-xl font-bold text-gray-900">20% Ahora!</span></p>
            </div>
            {/* Right image */}
            <div className="w-full lg:w-1/2 flex items-center justify-center relative order-1 lg:order-2">
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
              {/* Organic shaped image */}
              <div className="relative w-64 h-80 lg:w-72 lg:h-96 flex items-center justify-center">
                <EditableElement type="hero_shape" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_shape')} className="w-full h-full">
                  <div
                    className="w-full h-full overflow-hidden shadow-xl transition-transform duration-300"
                    style={{
                      borderRadius: getHeroShapeRadius(heroShape),
                      backgroundColor: '#f5e6d3',
                      transform: `scale(${(data.hero?.scale || 100) / 100})`
                    }}
                  >
                    {banners[0]?.image ? (
                      <img src={banners[0].image} alt="Hero" className="w-full h-full object-cover" style={{ objectPosition: banners[0].position || 'center center' }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">Foto Hero</div>
                    )}
                  </div>
                </EditableElement>
              </div>
              {/* Slide counter */}
              <div className="absolute bottom-2 right-0 text-right">
                <p className="text-sm font-semibold text-gray-600">01/ {String(banners.length || 1).padStart(2, '0')}</p>
              </div>
              <div className="absolute bottom-2 right-16 flex gap-1.5">
                <button className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs"><ChevronLeft className="w-3 h-3" /></button>
                <button className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs"><ChevronRight className="w-3 h-3" /></button>
              </div>
            </div>
          </section>
        </EditableElement>

        {/* Products */}
        <section className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-serif font-bold">Nueva Colección</h2>
            <span className="text-sm font-semibold underline underline-offset-4 text-gray-600 cursor-pointer">Ver todo</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {productsToShow.slice(0, 4).map((product: any) => (
              <div key={product.id} className="group cursor-pointer" onClick={() => openProductModal(product)}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl mb-3" style={{ backgroundColor: cardBgColor }}>
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <h3 className="font-medium text-sm text-gray-900">{product.name}</h3>
                <span className="font-bold text-sm">${product.price}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-white pt-12 pb-8" style={{ backgroundColor: footColor }}>
          <div className="container mx-auto px-6">
            <EditableElement type="contact" isEditorMode={isEditorMode} onEdit={() => onEditElement('contact')}>
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-10 mb-12 ${isEditorMode ? 'cursor-pointer hover:bg-white/5 p-4 rounded-lg transition-colors' : ''}`}>
                <div>
                  <h4 className="font-bold uppercase mb-4 text-xs tracking-widest text-zinc-500">Contacto</h4>
                  {data.contact?.whatsapp && <p className="text-sm text-gray-300">{data.contact.whatsapp}</p>}
                  {data.contact?.email && <p className="text-sm text-gray-300">{data.contact.email}</p>}
                  {!data.contact?.whatsapp && !data.contact?.email && <p className="text-zinc-600 italic text-sm">Agrega tus datos de contacto</p>}
                </div>
                <div>
                  <h4 className="font-bold uppercase mb-4 text-xs tracking-widest text-zinc-500">Ubicación</h4>
                  <p className="text-sm text-gray-300">{data.contact?.address || <span className="text-zinc-600 italic">Configura tu dirección</span>}</p>
                </div>
                <div>
                  <h4 className="font-bold uppercase mb-4 text-xs tracking-widest text-zinc-500">Síguenos</h4>
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
      </div>
    );
  };

  const FashionLayoutPreview = () => {
    // Collect all products for Just Dropped section
    const productsToShow = data.products?.length > 0 ? data.products : bestSellers;

    return (
      <div className="min-h-screen font-sans bg-white text-black">
        {/* Header */}
        <header className="px-6 py-4 flex flex-col gap-4 border-b border-gray-200 sticky top-0 z-50 bg-white md:static">
          <div className="flex items-center justify-between">
            {/* Left */}
            <div className="hidden md:flex items-center gap-4 text-xs font-semibold tracking-wider text-gray-500">
              <a href={data.contact?.facebook || "#"} className="hover:text-black transition-colors" style={{ color: headerIconColor }}>f</a>
              <a href={data.contact?.instagram || "#"} className="hover:text-black transition-colors" style={{ color: headerIconColor }}>in</a>
              <a href="#" className="hover:text-black transition-colors" style={{ color: headerIconColor }}>yt</a>
              <span className="ml-4 text-[10px] text-black">¡MEJORES OFERTAS! ¡40% DE DESCUENTO!</span>
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
                    size="md"
                    fallbackText="FASHION"
                    className="text-3xl font-black uppercase tracking-tighter"
                  />
                </div>
              </EditableElement>
            </div>

            {/* Right: Icons & Language */}
            <div className="flex items-center gap-4 md:gap-6">
              <span className="hidden md:block text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-black">Español ▾</span>
              <User className="h-5 w-5 stroke-1 hidden md:block" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
              <Search className="h-5 w-5 stroke-1" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
              <Heart className="h-5 w-5 stroke-1 hidden md:block" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
              <div className="relative">
                <ShoppingCart className="h-5 w-5 stroke-1" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                {cartItems > 0 && <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] w-3 h-3 flex items-center justify-center rounded-full">{cartItems}</span>}
              </div>
            </div>
          </div>

          {/* Bottom Nav */}
          <nav className="hidden md:flex justify-center gap-8 text-xs font-bold uppercase tracking-widest text-black">
            {categories.slice(0, 5).map((cat: any) => (
              <span key={cat.id} className="cursor-pointer hover:text-gray-500">{cat.name}</span>
            ))}
            {categories.length === 0 && (
              <>
                <span className="cursor-pointer hover:text-gray-500">Inicio ▾</span>
                <span className="cursor-pointer hover:text-gray-500">Tienda ▾</span>
                <span className="cursor-pointer hover:text-gray-500">Blog ▾</span>
                <span className="cursor-pointer hover:text-gray-500">Páginas ▾</span>
                <span className="cursor-pointer hover:text-gray-500">Contacto</span>
              </>
            )}
          </nav>
        </header>

        {/* Hero */}
        <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')}>
          <div className="flex flex-col lg:flex-row w-full bg-white relative">
            <div className="w-full lg:w-1/2 md:aspect-[4/5] lg:aspect-auto lg:h-[80vh] bg-gray-100">
              <img src={banners[0]?.image || "/placeholder.svg"} className="w-full h-full object-cover" style={{ objectPosition: banners[0]?.position || 'center center' }} alt="Hero Main" />
            </div>

            <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center px-8 lg:px-20 py-16 relative">
              <div className="hidden lg:block absolute top-12 right-20 w-32 h-32 bg-gray-100 z-10">
                <img src={banners[1]?.image || "/placeholder.svg"} className="w-full h-full object-cover" style={{ objectPosition: banners[1]?.position || 'center center' }} alt="Hero Small Top" />
              </div>

              <div className="max-w-xl relative z-20">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-6 whitespace-pre-wrap">
                  {welcomeTitle || "Nueva Colección\nde Verano"}
                </h1>
                <p className="text-gray-500 text-sm mb-10 max-w-md font-medium leading-relaxed">
                  {welcomeMessage || "Descubre la nueva colección de verano, con colores vibrantes, estampados originales y piezas cómodas y elegantes para cada ocasión."}
                </p>

                <div className="flex gap-4">
                  <Button className="bg-black text-white hover:bg-black/90 rounded-none px-8 py-6 text-xs font-bold uppercase tracking-widest">
                    Para Mujeres
                  </Button>
                  <Button variant="outline" className="border-black text-black hover:bg-gray-50 rounded-none px-8 py-6 text-xs font-bold uppercase tracking-widest">
                    Para Hombres
                  </Button>
                </div>
              </div>

              <div className="hidden lg:block absolute bottom-0 right-12 w-48 h-64 bg-gray-100 z-10">
                <img src={banners[2]?.image || "/placeholder.svg"} className="w-full h-full object-cover" style={{ objectPosition: banners[2]?.position || 'center center' }} alt="Hero Small Bottom" />
              </div>
            </div>
          </div>
        </EditableElement>

        {/* Ticker — keeps a placeholder in editor mode so users can re-enable a hidden bar */}
        {((data.ticker?.enabled !== false) || isEditorMode) && (
          <EditableElement type="ticker" isEditorMode={isEditorMode} onEdit={() => onEditElement('ticker')}>
            {data.ticker?.enabled === false ? (
              <div className="bg-gray-100 border border-dashed border-gray-300 text-gray-500 py-3 text-center text-[11px] italic cursor-pointer hover:bg-gray-200">
                Barra de noticias oculta — click para mostrarla
              </div>
            ) : (
              <div className={`border-y-2 border-black bg-white py-4 overflow-hidden ${isEditorMode ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
                <div
                  className={`flex justify-center flex-nowrap whitespace-nowrap gap-8 font-black uppercase tracking-tighter ${data.ticker?.fontSize ? '' : 'text-lg lg:text-3xl'}`}
                  style={data.ticker?.fontSize ? { fontSize: `${data.ticker.fontSize}px` } : undefined}
                >
                  {Array(6).fill(data.ticker?.text || "24/7 SUPPORT • HIGH QUALITY COTTON • FREE DELIVERY • MONEY BACK GUARANTEE").map((text, i) => (
                    <span key={i}>{text}</span>
                  ))}
                </div>
              </div>
            )}
          </EditableElement>
        )}

        {/* Just Dropped Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 text-center mb-12">
            <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter mb-8">
              RECIÉN LLEGADOS
            </h2>

            <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-sm font-bold uppercase tracking-widest text-gray-400">
              {categories.slice(0, 4).map((cat, idx) => (
                <span key={cat.id} className={`cursor-pointer ${idx === 0 ? 'text-black border-b-2 border-black pb-1' : 'hover:text-black'}`}>
                  {cat.name}
                </span>
              ))}
              {categories.length === 0 && (
                <>
                  <span className="text-black border-b-2 border-black pb-1 cursor-pointer">Mujeres</span>
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
                  <div className="flex gap-1.5 mb-2 mt-1">
                    <span className="w-3 h-3 rounded-full bg-black"></span>
                    <span className="w-3 h-3 rounded-full bg-blue-800"></span>
                    <span className="w-3 h-3 rounded-full bg-orange-700"></span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{data.logo?.alt || "Brand"}</p>
                  <h3 className="text-sm font-medium text-black mb-3 line-clamp-2 md:line-clamp-1">{product.name}</h3>
                  <div className="flex gap-3 items-center">
                    <span className="text-sm font-bold text-gray-600">${product.price}</span>
                    {product.originalPrice && <span className="text-xs text-gray-300 line-through">${product.originalPrice}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Basic Footer */}
        <footer className="border-t-2 border-gray-100 py-16 px-6 bg-white flex flex-col md:flex-row justify-between items-center text-xs font-bold uppercase tracking-widest gap-8 text-gray-400">
          <EditableElement type="contact" isEditorMode={isEditorMode} onEdit={() => onEditElement('contact')}>
            <div className="flex gap-6">
              {data.contact?.facebook && <a href={data.contact.facebook} className="hover:text-black transition-colors" style={{ color: footerIconColor }}>Facebook</a>}
              {data.contact?.instagram && <a href={data.contact.instagram} className="hover:text-black transition-colors" style={{ color: footerIconColor }}>Instagram</a>}
              <a href="#" className="hover:text-black transition-colors" style={{ color: footerIconColor }}>Twitter</a>
            </div>
          </EditableElement>
          <div className="text-black text-center">
            © {new Date().getFullYear()} {data.logo?.alt || "FASHION STORE"}
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-black transition-colors">Política de Privacidad</a>
            <a href="#" className="hover:text-black transition-colors">Términos y Condiciones</a>
          </div>
        </footer>
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
        <header className="sticky top-0 z-50 border-b border-gray-100" style={{ backgroundColor: navColor }}>
          <div className="w-full px-6 min-h-16 py-3 grid items-center gap-4" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
            {/* LEFT col — hamburger when needed + nav (or measurer) */}
            <div ref={navColRef} className="flex items-center gap-3 min-w-0 justify-start relative">
              <EditableElement type="botón hamburguesa" isEditorMode={isEditorMode} onEdit={() => onEditElement('hamburger_style')}>
                <HamburgerButton
                  isOpen={hamburgerOpen}
                  onClick={() => setHamburgerOpen(!hamburgerOpen)}
                  variant={(data.hero?.hamburgerVariant as any) || 'classic'}
                  color={headerIconColor}
                  size={22}
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
                  <button onClick={() => setHamburgerOpen(false)}><X className="w-5 h-5" /></button>
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
              <div className={`relative w-full overflow-hidden bg-gray-100 ${deviceMode === 'desktop' ? 'aspect-auto min-h-[60vh]' : 'aspect-[4/5]'}`}>
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

          {/* Text Side — each child is its own EditableElement */}
          <div className={`flex flex-col justify-center px-6 md:px-12 py-10 bg-white min-w-0 gap-4 ${deviceMode === 'desktop' ? 'w-2/5' : 'w-full'}`}>
            <EditableElement type="texto" isEditorMode={isEditorMode} onEdit={() => onEditElement('hero_element', 'eyebrow')}>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400 break-words"
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
                className="text-gray-500 text-xs leading-relaxed max-w-xs break-words"
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
        </section>

        {/* Ticker — keeps a placeholder in editor mode so users can re-enable a hidden bar */}
        {((data.ticker?.enabled !== false) || isEditorMode) && (
          <EditableElement type="ticker" isEditorMode={isEditorMode} onEdit={() => onEditElement('ticker')}>
            {data.ticker?.enabled === false ? (
              <div className="bg-gray-100 border border-dashed border-gray-300 text-gray-500 py-2 text-center text-[11px] italic cursor-pointer hover:bg-gray-200">
                Barra de noticias oculta — click para mostrarla
              </div>
            ) : (
              <div className={`bg-black text-white py-2 overflow-hidden ${isEditorMode ? 'cursor-pointer hover:bg-zinc-800' : ''}`}>
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
                <h3 className="font-semibold text-xs leading-tight mb-1 text-gray-900">{product.name}</h3>
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

        {/* Footer */}
        <footer className="text-white pt-16 pb-8" style={{ backgroundColor: footColor }}>
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

    return (
      <div className="min-h-screen font-sans text-gray-900" style={{ backgroundColor: bg }}>
        {/* Top Bar */}
        <EditableElement type="announcement" isEditorMode={isEditorMode} onEdit={() => onEditElement('announcement')}>
          {data.announcement?.enabled !== false && (
            <div className="text-white text-center py-2 text-[10px] md:text-xs font-medium tracking-widest uppercase flex justify-center items-center px-4 relative" style={{ backgroundColor: '#4f6354' }}>
              <span>{data.announcement?.text || "EVERY ITEM PLANTS 10 TREES"}</span>
              <div className="absolute flex right-4 md:right-8 items-center gap-2 text-[10px] opacity-80 cursor-pointer hover:opacity-100 hidden sm:flex">
                <span>🇺🇸 United States, EN [$USD] </span>
                <ArrowRight className="w-3 h-3 rotate-90" />
              </div>
            </div>
          )}
        </EditableElement>

        {/* Header */}
        <EditableElement type="header" isEditorMode={isEditorMode} onEdit={() => onEditElement('header')}>
          <header className="px-6 py-4 flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: navbarBgColor }}>
            <div className="flex items-center gap-8 md:flex-1">
              <div className="cursor-pointer">
                <LogoDisplay
                  logoUrl={data.logo?.url}
                  fallbackText={data.logo?.alt || '10'}
                  className="text-2xl font-serif font-bold tracking-tight text-gray-900"
                />
              </div>
              <nav className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-wider text-gray-700">
                {categories.slice(0, 5).map((cat: any) => (
                  <button key={cat.id} className="hover:text-black uppercase transition-colors">{cat.name}</button>
                ))}
                {categories.length === 0 && (
                  <>
                    <button className="hover:text-black transition-colors uppercase">Womens</button>
                    <button className="hover:text-black transition-colors uppercase">Mens</button>
                    <button className="hover:text-black transition-colors uppercase">Accessories</button>
                    <button className="hover:text-black transition-colors uppercase">Climate+</button>
                    <button className="hover:text-black transition-colors uppercase">Impact</button>
                  </>
                )}
              </nav>
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

        {/* Hero Section */}
        <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')}>
          <section className="relative w-full h-[300px] md:h-[500px] flex items-end md:items-center bg-gray-200 overflow-hidden">
            {banners?.[0] ? (
              <img src={banners[0].image} alt="Hero" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: banners[0].position || 'center center' }} />
            ) : (<div className="absolute inset-0 w-full h-full bg-[#8c9485]"></div>
            )}
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10 w-full px-6 md:px-16 pb-12 md:pb-0 md:pt-0 max-w-xl text-left">
              <h1 className="text-3xl md:text-5xl font-serif font-bold leading-[1.1] mb-4 text-white drop-shadow-md whitespace-pre-line">{heroTitle}</h1>
              <p className="text-xs md:text-sm text-white/90 mb-8 max-w-sm drop-shadow">{heroMessage}</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-[#f4f4f0] text-gray-900 px-8 py-3.5 text-[10px] md:text-xs font-bold tracking-widest uppercase hover:bg-white transition-colors">SHOP WOMENS</button>
                <button className="bg-[#f4f4f0] text-gray-900 px-8 py-3.5 text-[10px] md:text-xs font-bold tracking-widest uppercase hover:bg-white transition-colors">SHOP MENS</button>
              </div>
            </div>
          </section>
        </EditableElement>

        {/* Products Section */}
        <EditableElement type="products" isEditorMode={isEditorMode} onEdit={() => onEditElement('products')}>
          <section className="container mx-auto px-6 py-12 md:py-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-gray-300">
              <div className="flex-1">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#142642] mb-6">New Arrivals</h2>
                <div className="flex gap-6 overflow-x-auto hide-scrollbar">
                  <button className="text-xs font-bold tracking-widest uppercase pb-1 border-b-2 border-gray-500 text-gray-900 whitespace-nowrap">WOMEN'S</button>
                  <button className="text-xs font-bold tracking-widest uppercase pb-1 border-b-2 border-transparent text-gray-500 hover:text-gray-900 whitespace-nowrap">MEN'S</button>
                  <button className="text-xs font-bold tracking-widest uppercase pb-1 border-b-2 border-transparent text-gray-500 hover:text-gray-900 whitespace-nowrap">ACCESSORIES</button>
                </div>
              </div>
            </div>

            {bestSellers.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">
                {bestSellers.slice(0, 4).map((product: any) => (
                  <div key={product.id} className="group cursor-pointer flex flex-col">
                    <div className="relative aspect-[3/4] overflow-hidden mb-3" style={{ backgroundColor: prodBgColor }}>
                      <img src={product.image || '/placeholder.svg'} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    </div>
                    <div className="flex flex-col flex-grow">
                      <div className="flex gap-1.5 mb-2">
                        {['#e5e0d8', '#3a4047', '#f4ecd8', '#87a2ba'].map((color, i) => (
                          <div key={i} className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: color }}></div>
                        ))}
                      </div>
                      <h3 className="font-serif text-sm font-semibold text-gray-900 leading-snug mb-1">{product.name}</h3>
                      <div className="flex items-center gap-2 text-sm">
                        {product.originalPrice ? (
                          <>
                            <span className="text-gray-500 line-through">${Number(product.originalPrice).toFixed(2)}</span>
                            <span className="text-[#9b3b3b]">${Number(product.price).toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-gray-900">${Number(product.price).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="group flex flex-col">
                    <div className="relative aspect-[3/4] overflow-hidden mb-3 bg-gray-200">
                      <img src="/placeholder.svg" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="font-serif text-sm font-semibold mb-1">Product {i}</h3>
                    <span className="text-sm font-medium">${(49.99 * i).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </EditableElement>

        {/* Feature Split Section */}
        <EditableElement type="banners" isEditorMode={isEditorMode} onEdit={() => onEditElement('banners')}>
          <section className="container mx-auto px-6 py-12">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
              <div className="lg:w-1/2 flex flex-col justify-center order-2 lg:order-1">
                <h2 className="text-3xl md:text-5xl font-serif font-bold text-[#142642] leading-tight mb-4">Every Item Plants 10 Trees</h2>
                <h3 className="text-xl md:text-2xl text-gray-800 mb-6">Join Us in Protecting the World We Play In</h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-lg mb-8">
                  We're on a mission to restore the planet by planting trees and creating Earth-First, sustainably made apparel.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="bg-[#4f6354] text-white px-8 py-3.5 text-[11px] font-bold tracking-widest uppercase">OUR IMPACT</button>
                  <button className="bg-[#4f6354] text-white px-8 py-3.5 text-[11px] font-bold tracking-widest uppercase">ABOUT US</button>
                </div>
              </div>
              <div className="lg:w-1/2 relative order-1 lg:order-2 h-[300px] md:h-[500px] w-full">
                <div className="absolute top-0 right-10 w-[70%] h-[60%] z-10 shadow-lg" style={{ backgroundImage: `url('${banners?.[1]?.image || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop'}')`, backgroundSize: 'cover', backgroundPosition: banners?.[1]?.position || 'center' }}></div>
                <div className="absolute bottom-10 right-0 w-[55%] h-[80%] z-20 shadow-lg" style={{ backgroundImage: `url('${banners?.[2]?.image || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop'}')`, backgroundSize: 'cover', backgroundPosition: banners?.[2]?.position || 'center' }}></div>
                <div className="absolute bottom-0 left-10 w-[60%] h-[50%] z-30 shadow-lg" style={{ backgroundImage: `url('${banners?.[3]?.image || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop'}')`, backgroundSize: 'cover', backgroundPosition: banners?.[3]?.position || 'center' }}></div>
              </div>
            </div>
          </section>
        </EditableElement>

        {/* Footer */}
        <EditableElement type="contact" isEditorMode={isEditorMode} onEdit={() => onEditElement('contact')}>
          <footer className="pt-16 pb-8 border-t border-gray-200 mt-12" style={{ backgroundColor: footColor }}>
            <div className="container mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                <div className="md:col-span-1">
                  <LogoDisplay logoUrl={data.logo?.url} fallbackText={data.logo?.alt || '10'} className="text-4xl font-serif font-bold tracking-tight text-gray-900 mb-4" />
                  <p className="text-sm text-gray-600 mb-6 max-w-xs">{data.contact?.address || "Street Address, City"}</p>
                </div>
                <div>
                  <h4 className="font-bold uppercase mb-6 text-xs tracking-widest text-[#142642]">Shop</h4>
                  <ul className="space-y-4 text-sm font-medium text-gray-600">
                    <li>Women's</li><li>Men's</li><li>Accessories</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold uppercase mb-6 text-xs tracking-widest text-[#142642]">About</h4>
                  <ul className="space-y-4 text-sm font-medium text-gray-600">
                    <li>Our Story</li><li>Impact</li><li>Careers</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold uppercase mb-6 text-xs tracking-widest text-[#142642]">Support</h4>
                  <ul className="space-y-4 text-sm font-medium text-gray-600">
                    {data.contact?.whatsapp && <li>WhatsApp: {data.contact.whatsapp}</li>}
                    {data.contact?.email && <li>Email: {data.contact.email}</li>}
                    <li>FAQ</li><li>Returns</li>
                  </ul>
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

    const currentTestimonials = testimonials || {
      enabled: true,
      position: 'beneath_hero',
      title: "Recomendaciones de Personas",
      list: [
        {
          id: '1',
          text: "¡Este producto es increíble! Muy recomendado.",
          author: "Cliente Feliz",
          role: "Usuario",
          company: "",
          logo: "/placeholder.svg"
        }
      ]
    };

    const testimonialsPos = currentTestimonials.position || 'beneath_hero';

    const renderTestimonials = () => {
      if (!currentTestimonials.enabled) {
        if (!isEditorMode) return null;
        return (
          <EditableElement type="testimonials" isEditorMode={isEditorMode} onEdit={() => onEditElement('testimonials')}>
            <div className="py-8 bg-gray-100 border-2 border-dashed border-gray-300 text-center text-gray-500 rounded-lg mx-6 my-4 cursor-pointer hover:bg-gray-200 transition-colors">
              Sección de Testimonios (Oculta) - Clic para configurar
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
            <div className="bg-[#023f66] text-white text-center py-2.5 text-xs font-medium tracking-wide">
              {data.announcement.text}
            </div>
          )}
        </EditableElement>

        {/* Header */}
        <EditableElement type="header" isEditorMode={isEditorMode} onEdit={() => onEditElement('header')}>
          <header className="sticky top-0 z-50 shadow-sm transition-all duration-300" style={{ backgroundColor: navbarBgColor }}>
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="cursor-pointer">
                  <LogoDisplay
                    logoUrl={data.logo?.url}
                    fallbackText={data.logo?.alt || 'LOGO'}
                    className="text-2xl font-bold tracking-tight text-gray-900"
                  />
                </div>
                <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-gray-600">
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
              </div>

              <div className="flex items-center gap-5">
                <button className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-600 hover:text-gray-900">
                  <User style={{ color: headerIconColor, width: `${18 * headerIconScale}px`, height: `${18 * headerIconScale}px` }} />
                  Iniciar Sesión
                </button>
                <Search className="hidden md:block cursor-pointer hover:scale-110 transition-transform" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                <div className="relative cursor-pointer hover:scale-110 transition-transform">
                  <ShoppingCart style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                </div>
                <button className="md:hidden">
                  <Menu style={{ color: headerIconColor, width: `${24 * headerIconScale}px`, height: `${24 * headerIconScale}px` }} />
                </button>
                <button className="hidden lg:block border-2 border-[#023f66] text-[#023f66] text-xs font-bold uppercase px-5 py-2 rounded-full hover:bg-[#023f66] hover:text-white transition-colors">
                  VER TODO
                </button>
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
              <div className="max-w-xl">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 whitespace-pre-line leading-tight">
                  {heroTitle}
                </h1>
                <p className="text-lg md:text-xl text-white/90 mb-8 max-w-sm">
                  {heroMessage}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="bg-[#e98063] text-white px-8 py-3.5 rounded-full font-bold shadow-lg hover:bg-[#d46a4f] transition-colors text-center">
                    Comprar Ahora
                  </button>
                  <button className="bg-transparent border-2 border-white text-white px-8 py-3.5 rounded-full font-bold hover:bg-white hover:text-gray-900 transition-colors text-center">
                    Cómo Funciona
                  </button>
                </div>
              </div>
            </div>
          </section>
        </EditableElement>

        {testimonialsPos === 'beneath_hero' && renderTestimonials()}

        {/* Categories Section */}
        {topCategories.length > 0 && (
          <EditableElement type="products" isEditorMode={isEditorMode} onEdit={() => onEditElement('products')}>
            <section className="py-20 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-[#023f66] mb-12">¿Qué estás buscando?</h2>
              <div className="container mx-auto px-6 flex flex-wrap justify-center gap-8">
                {topCategories.map((c: any) => (
                  <div key={c.id} className="group cursor-pointer flex flex-col items-center">
                    <div className="w-56 h-40 rounded-3xl overflow-hidden mb-6 bg-gray-100 shadow-md group-hover:shadow-xl transition-all duration-300">
                      <img src="/placeholder.svg" alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </div>
                    <h3 className="text-[#023f66] font-bold text-xl">{c.name}</h3>
                  </div>
                ))}
              </div>
            </section>
          </EditableElement>
        )}

        {/* Best Sellers Section */}
        <EditableElement type="featured_products" isEditorMode={isEditorMode} onEdit={() => onEditElement('featured_products')}>
          <section className="py-20 bg-gray-50 border-y border-gray-200">
            <div className="container mx-auto px-6">
              <h2 className="text-3xl md:text-4xl font-bold text-[#023f66] text-center mb-16">Productos más vendidos</h2>
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
                        <h3 className="font-bold text-[#023f66] text-lg mb-2 line-clamp-2">{product.name}</h3>
                        <span className="font-bold text-[#e98063] text-xl">${product.price}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </EditableElement>

        {/* Products Grid */}
        <EditableElement type="products" isEditorMode={isEditorMode} onEdit={() => onEditElement('products')}>
          <section className="container mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold text-[#023f66] mb-10 border-b border-gray-200 pb-4">Productos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {bestSellers.map((product: any) => (
                <div key={product.id} className="group cursor-pointer bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="relative aspect-square bg-[#f8f8f8] p-6 flex items-center justify-center">
                    <img src={product.image || '/placeholder.svg'} alt={product.name} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                    <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-50">
                      <Heart className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="font-bold text-[#023f66] text-lg mb-2 line-clamp-2">{product.name}</h3>
                    <p className="text-[#023f66] opacity-60 text-sm mb-4 line-clamp-2">{product.description || "La mejor experiencia de calidad."}</p>
                    <span className="font-bold text-[#e98063] text-xl">${product.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </EditableElement>

        {testimonialsPos === 'above_footer' && renderTestimonials()}

        {/* Footer */}
        <EditableElement type="contact" isEditorMode={isEditorMode} onEdit={() => onEditElement('contact')}>
          <footer className="relative pt-24 pb-10 overflow-hidden" style={{ backgroundColor: footColor, color: '#fff' }}>
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
                  <p className="text-sm text-white/70 max-w-xs leading-relaxed">{data.contact?.address || "Transforma tu rutina diaria con nuestra colección premium."}</p>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-6 uppercase tracking-widest text-[#e98063]">Tienda</h4>
                  <ul className="space-y-4 text-sm text-white/80">
                    {topCategories.map((c: any) => (
                      <li key={c.id}><button className="hover:text-white transition-colors">{c.name}</button></li>
                    ))}
                    <li><button className="hover:text-white transition-colors">Todos los Productos</button></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-6 uppercase tracking-widest text-[#e98063]">Soporte</h4>
                  <ul className="space-y-4 text-sm text-white/80">
                    {data.contact?.whatsapp && <li>WhatsApp: {data.contact.whatsapp}</li>}
                    {data.contact?.email && <li>Email: {data.contact.email}</li>}
                    <li>Preguntas Frecuentes</li>
                    <li>Envíos y Devoluciones</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-6 uppercase tracking-widest text-[#e98063]">Síguenos</h4>
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

  return (
    <>
      {templateId === 'premium_brand' ? (
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
  );
};