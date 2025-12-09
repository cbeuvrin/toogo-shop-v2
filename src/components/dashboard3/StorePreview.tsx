import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LogoDisplay } from "@/components/ui/LogoDisplay";
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

interface StorePreviewProps {
  data: EditorData;
  isEditorMode: boolean;
  onEditElement: (type: any, item?: any) => void;
  onDeleteProduct: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  backgroundColor?: string;
  productCardBgColor?: string;
  productCardHoverColor?: string;
  navbarBgColor?: string;
  footerBgColor?: string;
  headerIconColor?: string;
  headerIconScale?: number;
  footerIconColor?: string;
  footerIconScale?: number;
}

export const StorePreview = ({ 
  data, 
  isEditorMode, 
  onEditElement, 
  onDeleteProduct, 
  onDeleteCategory,
  backgroundColor,
  productCardBgColor,
  productCardHoverColor,
  navbarBgColor,
  footerBgColor,
  headerIconColor = '#6b7280',
  headerIconScale = 1.0,
  footerIconColor = '#1f2937',
  footerIconScale = 1.0
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
        image: banner.imageUrl
      }))
    : [
        {
          id: "default-banner-1",
          image: "/assets/default-banner.jpg"
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
          name: category.name,
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
          name: "Productos Demo",
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
      className="group overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white hover:bg-black rounded-[30px] cursor-pointer"
      onClick={() => openProductModal(product)}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50 group-hover:bg-gray-900 transition-colors duration-300 p-1 rounded-[30px]">
        <div className="w-[88%] h-[88%] mx-auto mt-[6%] aspect-square overflow-hidden rounded-[30px]">
          <img
            src={Array.isArray(product.image) ? (product.image[0]?.url || "/placeholder.svg") : (product.image || "/placeholder.svg")}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
          className="absolute top-2 right-2 bg-white/80 hover:bg-white shadow-sm group-hover:bg-gray-800 group-hover:text-white transition-colors duration-300"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
        >
          <Heart 
            className={`h-4 w-4 transition-colors duration-300 ${favorites.includes(product.id) ? 'fill-red-500 text-red-500 group-hover:fill-red-400 group-hover:text-red-400' : 'text-gray-600 group-hover:text-white'}`}
          />
        </Button>
      </div>
      
      <CardContent className="p-[12px] space-y-1.5">
        <h3 className="font-medium text-gray-900 group-hover:text-white transition-colors duration-300 text-[13px] md:text-[15px] leading-tight line-clamp-2">
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-[10px] md:text-[13px] text-gray-600 group-hover:text-gray-300 transition-colors duration-300 line-clamp-1 leading-relaxed">
            {product.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-900 group-hover:text-white transition-colors duration-300">${product.price}</span>
            {product.originalPrice && (
              <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors duration-300 line-through">
                ${product.originalPrice}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );


  return (
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
                className={`absolute inset-0 transition-opacity duration-500 ${
                  index === currentBanner ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  backgroundImage: `url(${banner.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }}
              >
              </div>
            ))}
          </div>
        </section>
      </EditableElement>

      {/* Más Vendidos - Display Only (managed in "Mis Productos") */}
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

      {/* Categories - Display Only (managed in "Mis Productos") */}
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

      {/* Product Detail Modal */}
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
                              className={`w-5 h-5 ${
                                i < Math.floor(selectedProduct.rating)
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
                        className={`w-4 h-4 mr-2 ${
                          favorites.includes(selectedProduct.id) 
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
    </div>
  );
};