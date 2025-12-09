// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
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
import { Link } from "react-router-dom";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { SystemDiagnostics } from "@/components/SystemDiagnostics";
import { useCart } from "@/contexts/CartContext";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { useTenantSettings } from "@/hooks/useTenantSettings";

const Demo = () => {
  console.log("Demo component mounted - checking for error 0d764bd6208d24366cbc2d3834335d4c");
  const { handleError, logAction, logWarning } = useErrorHandler();
  const { addItem, totalItems, toggleCart } = useCart();
  const { currentTenantId, isLoading: tenantLoading } = useTenantContext();
  const { settings } = useTenantSettings();
  const tenantId = currentTenantId;
  
  // State for real data from Supabase
  const [banners, setBanners] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado
  const [currentBanner, setCurrentBanner] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load store data from visual_editor_data and products table
  const loadStoreData = async () => {
    try {
      setLoading(true);
      
      if (!tenantId) {
        console.log('No tenant ID available');
        setLoading(false);
        return;
      }

      console.log('Loading store data for tenant:', tenantId);

      // Load banners from visual_editor_data
      const { data: editorData } = await supabase
        .from('visual_editor_data')
        .select('*')
        .eq('tenant_id', tenantId);

      console.log('Editor data found:', editorData);

      // Process editor data
      const bannersData: any[] = [];

      if (editorData) {
        editorData.forEach((item) => {
          if (item.element_type === 'banner') {
            bannersData.push(item.data);
          }
        });
      }

      // Set banners - sort by sort field and format correctly
      if (bannersData.length > 0) {
        const sortedBanners = bannersData
          .sort((a, b) => (a.sort || 0) - (b.sort || 0))
          .map((banner: any) => ({
            id: banner?.id || Math.random().toString(),
            image: banner?.imageUrl || banner?.image || "/placeholder.svg",
            title: banner?.title || "",
            linkUrl: banner?.linkUrl || ""
          }));
        setBanners(sortedBanners);
      }

      // Load products and categories from their respective tables
      const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
        supabase
          .from('products')
          .select(`
            *,
            product_images(url, sort),
            product_categories(category_id)
          `)
          .eq('tenant_id', tenantId)
          .eq('status', 'active'),
        supabase
          .from('categories')
          .select('*')
          .eq('tenant_id', tenantId)
      ]);

      console.log('Products data:', productsData);
      console.log('Categories data:', categoriesData);

      // Format products for display
      const formattedProducts = (productsData || []).map((product: any) => ({
        id: product.id,
        name: product.title,
        sku: product.sku,
        price: product.price_mxn,
        price_mxn: product.price_mxn,
        price_usd: product.price_usd,
        image: product.product_images?.[0]?.url || "/placeholder.svg",
        images: product.product_images?.sort((a: any, b: any) => a.sort - b.sort).map((img: any) => img.url) || ["/placeholder.svg"],
        rating: 4.5,
        reviews: Math.floor(Math.random() * 200) + 50,
        description: product.description || "",
        stock: product.stock || 0,
        title: product.title,
        features: product.features || [],
        category_id: product.product_categories?.[0]?.category_id
      }));

      setProducts(formattedProducts);
      setBestSellers(formattedProducts.slice(0, 8));
      
      // Process categories with products
      const categoriesWithProducts = (categoriesData || []).map((category: any) => ({
        id: category.id,
        name: category.name,
        products: formattedProducts.filter(product => 
          product.category_id === category.id
        ).slice(0, 8)
      })).filter(cat => cat.products.length > 0);
      
      // If no categories have products, create a default one
      if (categoriesWithProducts.length === 0 && formattedProducts.length > 0) {
        categoriesWithProducts.push({
          id: 'default',
          name: 'Productos',
          products: formattedProducts.slice(0, 8)
        });
      }
      
      setCategories(categoriesWithProducts);
      
    } catch (error) {
      console.error('Error loading store data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data when tenant is available
  useEffect(() => {
    if (!tenantLoading && tenantId) {
      loadStoreData();
    }
  }, [tenantId, tenantLoading]);

  // Auto-slide banners
  useEffect(() => {
    try {
      console.log("Setting up banner auto-slide effect");
      if (banners.length > 1) {
        const interval = setInterval(() => {
          setCurrentBanner((prev) => {
            const newBanner = (prev + 1) % banners.length;
            console.log(`Auto-sliding to banner ${newBanner}`);
            return newBanner;
          });
        }, 5000);
        console.log("Banner auto-slide effect setup complete");
        return () => {
          clearInterval(interval);
          console.log("Banner auto-slide effect cleaned up");
        };
      }
    } catch (error) {
      console.error(`Error 0d764bd6208d24366cbc2d3834335d4c - Banner auto-slide setup failed:`, error);
    }
  }, [banners.length]);

  // Funciones
  const toggleFavorite = (productId: string) => {
    try {
      console.log(`Toggling favorite for product ${productId}`);
      setFavorites(prev => 
        prev.includes(productId) 
          ? prev.filter(id => id !== productId)
          : [...prev, productId]
      );
      console.log(`Favorite toggled successfully for product ${productId}`);
    } catch (error) {
      console.error(`Error 0d764bd6208d24366cbc2d3834335d4c - toggleFavorite failed:`, error);
    }
  };

  const addToCartHandler = (product: any) => {
    try {
      console.log("Adding item to cart", product);
      addItem({
        id: product.id,
        title: product.title || product.name,
        price_mxn: product.price_mxn || product.price,
        price_usd: product.price_usd || (product.price / 20), // Fallback conversion
        images: product.images || [product.image],
        stock: product.stock || 10
      });
      console.log("Item added to cart successfully");
    } catch (error) {
      console.error(`Error 0d764bd6208d24366cbc2d3834335d4c - addToCart failed:`, error);
    }
  };

  const nextBanner = () => {
    try {
      logAction('nextBanner', 'Demo');
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    } catch (error) {
      handleError(error, {
        errorCode: '0d764bd6208d24366cbc2d3834335d4c',
        component: 'Demo',
        action: 'nextBanner'
      });
    }
  };

  const prevBanner = () => {
    try {
      logAction('prevBanner', 'Demo');
      setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
    } catch (error) {
      handleError(error, {
        errorCode: '0d764bd6208d24366cbc2d3834335d4c',
        component: 'Demo',
        action: 'prevBanner'
      });
    }
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

  const scrollToContact = () => {
    const contactSection = document.getElementById('contact-section');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  // Componente ProductCard
  const ProductCard = ({ product, showReviews = false, isBestSeller = false }: { product: any, showReviews?: boolean, isBestSeller?: boolean }) => (
    <Card 
      className="group overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white hover:bg-black rounded-[30px] cursor-pointer"
      onClick={() => openProductModal(product)}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50 group-hover:bg-gray-900 transition-colors duration-300 p-1 rounded-[30px]">
        <div className="w-[88%] h-[88%] mx-auto mt-[6%] aspect-square overflow-hidden rounded-[30px]">
          <img
            src={product.image}
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
            <span className="font-semibold text-gray-900 group-hover:text-white transition-colors duration-300">${product.price} MXN</span>
            {product.originalPrice && (
              <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors duration-300 line-through">
                ${product.originalPrice} MXN
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Componente AutoCarousel con autoplay y navegación con cursor
  const AutoCarousel = ({ title, products, showReviews = false, isBestSellers = false, delay = 0 }: { title: string, products: any[], showReviews?: boolean, isBestSellers?: boolean, delay?: number }) => {
    const autoplayPlugin = Autoplay({
      delay: 4000,
      stopOnInteraction: true,
      stopOnMouseEnter: true
    });

    if (!products || products.length === 0) return null;

    return (
      <div className="space-y-4">
        {!isBestSellers && (
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <div className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 cursor-pointer transition-colors">
                <span className="text-sm font-medium">Ver más</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
            <div className="w-full h-px bg-black"></div>
          </div>
        )}
        
        <Carousel
          plugins={[autoplayPlugin]}
          className="w-full"
          opts={{
            align: "start",
            loop: true,
            skipSnaps: false,
            dragFree: true
          }}
        >
          <CarouselContent className="-ml-5 md:-ml-6">
            {products.map((product) => (
              <CarouselItem key={product.id} className="pl-5 md:pl-6 basis-[170px] md:basis-72 lg:basis-72">
                <ProductCard product={product} showReviews={showReviews} isBestSeller={isBestSellers} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Store</h1>
            </div>
            
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  placeholder="Buscar productos..." 
                  className="pl-10 border-gray-300 focus:border-gray-500" 
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5 text-gray-600" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
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
                  <Link 
                    to="/tienda" 
                    className="block py-3 text-lg text-gray-700 hover:text-gray-900 border-b border-gray-100"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Tienda
                  </Link>
                  <button onClick={scrollToContact} className="block py-3 text-lg text-gray-700 hover:text-gray-900 border-b border-gray-100 w-full text-left">
                    Contacto
                  </button>
                  <Link 
                    to="/dashboard" 
                    className="block py-3 text-lg text-gray-700 hover:text-gray-900 border-b border-gray-100"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Perfil de tienda
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Cart Sidebar */}
      <CartSidebar />

      {/* Floating Cart Button */}
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          onClick={toggleCart}
          size="lg"
          className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          {totalItems > 0 && (
            <Badge variant="secondary" className="ml-1">
              {totalItems}
            </Badge>
          )}
        </Button>
      </div>

      {/* Banner Slider */}
      {banners && banners.length > 0 && (
        <section className="relative h-96 md:h-[500px] lg:h-[600px] overflow-hidden">
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
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando productos...</p>
          </div>
        </div>
      )}

      {/* Más Vendidos - Superpuesto */}
      {!loading && bestSellers && bestSellers.length > 0 && (
        <div className="relative -mt-40 z-20">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-[30px] p-8 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Más Vendidos</h2>
                <div className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 cursor-pointer transition-colors">
                  <span className="text-sm font-medium">Ver todos</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <AutoCarousel title="" products={bestSellers} isBestSellers={true} />
            </div>
          </div>
        </div>
      )}

      {/* Secciones de Categorías */}
      {!loading && (
        <main className="container mx-auto px-4 py-12 space-y-16">
          {categories.map((category, index) => (
            <AutoCarousel 
              key={category.name} 
              title={category.name} 
              products={category.products} 
              delay={index * 1000}
            />
          ))}
        </main>
      )}

      {/* Floating WhatsApp Button */}
      {settings?.whatsapp_number && (
        <div className="fixed bottom-20 right-4 z-40">
          <Button
            size="icon"
            className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => {
              const message = "¡Hola! Me interesa conocer más sobre sus productos.";
              const whatsappUrl = `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(message)}`;
              window.open(whatsappUrl, '_blank');
            }}
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Demo Badge */}
      <div className="fixed bottom-4 left-4 z-50">
        <Badge className="bg-gray-900 text-white px-3 py-1">
          Demo
        </Badge>
      </div>

      {/* Product Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {selectedProduct.name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Product Image */}
                <div className="aspect-square w-full max-w-md mx-auto bg-gray-50 rounded-[30px] overflow-hidden">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Price and Rating */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-x-3">
                      <span className="text-3xl font-bold text-gray-900">${selectedProduct.price} MXN</span>
                      {selectedProduct.originalPrice && (
                        <span className="text-xl text-gray-500 line-through">
                          ${selectedProduct.originalPrice} MXN
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-gray-600">
                        {selectedProduct.rating} ({selectedProduct.reviews} reseñas)
                      </span>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900">Descripción</h3>
                    <p className="text-gray-600 leading-relaxed">
                      {selectedProduct.description || "Este es un producto de alta calidad que cumple con los más altos estándares. Perfecto para aquellos que buscan excelencia y durabilidad."}
                    </p>
                  </div>
                  
                  {/* Features */}
                  {selectedProduct.features && selectedProduct.features.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">Características</h3>
                      <ul className="space-y-2 text-gray-600">
                        {selectedProduct.features.map((feature: string, index: number) => (
                          <li key={index} className="flex items-center">
                            <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="space-y-3 pt-4">
                    <Button 
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 text-lg rounded-[15px]"
                      onClick={() => {
                        addToCartHandler(selectedProduct);
                        setIsProductModalOpen(false);
                      }}
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Agregar al Carrito
                    </Button>
                    
                    {settings?.whatsapp_number && (
                      <Button 
                        variant="outline" 
                        className="w-full border-green-600 text-green-600 hover:bg-green-50 py-3 text-lg rounded-[15px]"
                        onClick={() => sendWhatsAppMessage(selectedProduct)}
                      >
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Consultar por WhatsApp
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <SystemDiagnostics />
    </div>
  );
};

export default Demo;