// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ShoppingCart, Heart, Search, Menu, User, Star, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, MessageCircle, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { SystemDiagnostics } from "@/components/SystemDiagnostics";
import { useCart } from "@/contexts/CartContext";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { ProductImageGallery } from "@/components/ui/product-image-gallery";
import { ProductVariationSelector } from "@/components/ui/ProductVariationSelector";
import { supabase } from "@/integrations/supabase/client";
import { useTenantByDomain } from "@/hooks/useTenantByDomain";
import { ContactSection } from "@/components/ui/ContactSection";
import { ProductCard } from "@/components/ui/ProductCard";
import { AutoCarousel } from "@/components/ui/AutoCarousel";
import { StoreNotFound } from "./StoreNotFound";
import SubdomainAvailablePage from "./SubdomainAvailablePage";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { useGA4Tracking } from "@/hooks/useGA4Tracking";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { MobileBottomNav } from "@/components/ui/MobileBottomNav";
import { useFavicon } from "@/hooks/useFavicon";
import { LogoDisplay } from "@/components/ui/LogoDisplay";
import { useToast } from "@/hooks/use-toast";
import { useStoreMeta } from "@/hooks/useStoreMeta";
import { StoreFooter } from "@/components/store/StoreFooter";

const Tienda = () => {
  console.log("Tienda component mounted - checking for error 0d764bd6208d24366cbc2d3834335d4c");

  // Determine tenant ID based on hostname and path
  const hostname = window.location.hostname;
  const pathname = window.location.pathname.replace(/\/$/, '');

  // Get preview tenant ID from query params
  const searchParams = new URLSearchParams(window.location.search);
  const previewTenantId = searchParams.get('preview');
  const hostOverride = searchParams.get('host') || searchParams.get('domain');

  // Special case: demo tienda detection for toogo.store/tienda (but NOT for preview param)
  const isDemoTienda = !previewTenantId && ((hostname === 'toogo.store' || hostname === 'www.toogo.store') && pathname === '/tienda');
  const forcedTenantId = isDemoTienda ? '2d62ded6-0745-4ced-abdb-30b7b82e5686' : previewTenantId;

  // Use useTenantByDomain for normal cases
  const {
    tenant,
    isLoading: tenantLoading,
    error: tenantError
  } = useTenantByDomain();

  // Check if this is a toogo.store subdomain that doesn't exist and redirect
  if (!forcedTenantId && !tenantLoading && tenantError === 'subdomain_not_found' && hostname.endsWith('.toogo.store')) {
    const subdomain = hostname.replace('.toogo.store', '');
    console.log('🏪 [Tienda] Redirecting non-existent subdomain to /subdomain-demo:', subdomain);
    window.location.href = '/subdomain-demo';
    return null; // Return null while redirecting
  }

  // Now all other hooks - these will always execute in the same order
  const {
    handleError,
    logAction,
    logWarning
  } = useErrorHandler();
  const {
    addItem,
    totalItems,
    toggleCart
  } = useCart();
  const {
    settings
  } = useTenantSettings();
  const { toast } = useToast();

  // Determine final tenant ID
  const finalTenantId = forcedTenantId || tenant?.id;

  // State for store data
  const [storeData, setStoreData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [contactData, setContactData] = useState<any>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [checkoutConfig, setCheckoutConfig] = useState<any>(null);

  // Unified settings: prefer public storeData settings, fallback to authenticated settings
  const effectiveSettings = useMemo(() => {
    return storeData?.settings || settings || {};
  }, [storeData?.settings, settings]);

  // Initialize GA4 tracking
  const { trackPageView: trackGA4PageView, trackProductView: trackGA4ProductView, trackAddToCart: trackGA4AddToCart } = useGA4Tracking(finalTenantId);

  // Initialize Facebook Pixel tracking
  const { trackPageView: trackFBPageView, trackProductView: trackFBProductView, trackAddToCart: trackFBAddToCart } = useFacebookPixel(finalTenantId, effectiveSettings?.fb_pixel || null);

  // Navigation
  const navigate = useNavigate();

  // Set logo as favicon for Basic/Premium plans
  useFavicon({
    logoUrl: effectiveSettings?.logo_url,
    plan: tenant?.plan
  });

  // Update meta tags for social sharing
  useStoreMeta({
    tenant: storeData?.tenant,
    settings: storeData?.settings
  });

  // Estado
  const [currentBanner, setCurrentBanner] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);

  // State for product variations
  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);
  const [canAddToCart, setCanAddToCart] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<any>(null);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('toogo-favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('toogo-favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Load store data using RPC
  useEffect(() => {
    const loadStoreData = async () => {
      try {
        setStoreLoading(true);
        console.log('🏪 [Tienda] RPC fetch iniciado para:', { hostname, previewTenantId, isDemoTienda, finalTenantId });
        let result;
        if (forcedTenantId) {
          // Use demo RPC for preview or demo tenant
          console.log('🎯 [Tienda] Using tenant ID:', forcedTenantId);
          result = await supabase.rpc('get_public_store_data_demo', {
            p_tenant_id: forcedTenantId
          });
        } else {
          // Use regular RPC for other domains (with optional host override)
          let effectiveHost = hostOverride || hostname;

          // Auto-strip 'www.' for store data lookup (Normalization)
          // This ensures www.choeventos.com matches choeventos.com in DB
          if (effectiveHost.startsWith('www.') && !effectiveHost.includes('toogo.store')) {
            console.log('🔄 [Tienda] Normalizando host: quitando www.');
            effectiveHost = effectiveHost.replace('www.', '');
          }

          console.log('🔍 [Tienda] Using host:', effectiveHost, hostOverride ? '(override)' : '(current)');
          result = await supabase.rpc('get_public_store_data', {
            p_host: effectiveHost
          });
        }
        if (result.error) throw result.error;
        const data = result.data;
        console.log('🏪 [Tienda] RPC respuesta:', { ok: data?.ok, hasProducts: !!data?.products, hostname });
        if (!data?.ok) {
          console.log('🚫 [Tienda] Store not found or error:', data);
          // Guide user to use ?host parameter in sandbox
          if (!forcedTenantId && data?.error === 'tenant_not_found' && (hostname.includes('lovable') || hostname.includes('localhost'))) {
            console.log('💡 TIP: Para previsualizar una tienda en el editor, añade ?host=tu-dominio.toogo.store a la URL');
          }
          return;
        }
        setStoreData(data);

        // Derive resolved tenant ID for GA4 and LogoDisplay
        const resolvedTenantId = data.tenant?.id || finalTenantId;
        console.log('🎯 [Tienda] Resolved tenant ID:', resolvedTenantId);

        // Prepare checkout config from loaded settings
        const settings = data.settings || {};
        const methods: any[] = [];

        if (settings.mercadopago_public_key) {
          methods.push({
            id: 'mercadopago',
            name: 'MercadoPago',
            enabled: true,
            icon: null
          });
        }

        if (settings.paypal_client_id) {
          methods.push({
            id: 'paypal',
            name: 'PayPal',
            enabled: true,
            icon: null
          });
        }

        if (settings.whatsapp_number) {
          methods.push({
            id: 'whatsapp',
            name: 'WhatsApp (Pago manual)',
            enabled: true,
            icon: null
          });
        }

        setCheckoutConfig({
          logoUrl: settings.logo_url || '',
          paymentMethods: methods,
          shippingInfo: {
            enabled: settings.shipping_enabled || false,
            type: settings.shipping_type || 'free_minimum',
            minimumAmount: settings.shipping_minimum_amount || 0,
            flatRate: settings.shipping_flat_rate || 0,
            zonesConfig: settings.shipping_zones_config || []
          }
        });

        // Extract and normalize products
        const rawProducts = data.products || [];
        const normalizedProducts = rawProducts.map((product: any) => {
          let finalPrice = product.price_mxn;

          // Para productos variables, calcular el precio mínimo de las variaciones
          if (product.product_type === 'variable' && Array.isArray(product.variations) && product.variations.length > 0) {
            const prices = product.variations
              .map((v: any) => Number(v.price_modifier))
              .filter((p: number) => Number.isFinite(p) && p > 0);

            if (prices.length > 0) {
              finalPrice = Math.min(...prices);
            }
          }

          return {
            ...product,
            price_mxn: Number(finalPrice) || 0,
            images: Array.isArray(product.images) ? product.images.map((img: any) => typeof img === 'string' ? img : img.url) : [],
            variations: Array.isArray(product.variations) ? product.variations : []
          };
        });

        // Enriquecer productos variables sin variaciones usando RPC público
        const enrichWithVariations = async (productsList: any[]) => {
          const targets = productsList.filter(
            (p) => p.product_type === 'variable' && (!Array.isArray(p.variations) || p.variations.length === 0)
          );

          if (targets.length === 0) return productsList;

          console.log('🔄 [Tienda] Enriqueciendo', targets.length, 'productos variables con variaciones');

          const results = await Promise.all(
            targets.map(async (p) => {
              const { data, error } = await supabase.rpc('get_product_variations_with_details', {
                product_id_param: p.id,
              });
              if (error) {
                console.error('❌ [Tienda] Error obteniendo variaciones para producto', p.id, error);
                return { id: p.id, variations: [] };
              }
              const mapped = (Array.isArray(data) ? data : []).map((v: any) => ({
                id: v.id,
                product_id: v.product_id,
                combination: typeof v.combination === 'object' && v.combination !== null ? v.combination : {},
                stock: Number(v.stock) || 0,
                price_modifier: Number(v.price_modifier) || 0,
                sku: v.sku ?? null,
              }));
              return { id: p.id, variations: mapped };
            })
          );

          const byId = new Map(results.map((r) => [r.id, r.variations]));

          const enriched = productsList.map((p) => {
            const v = byId.get(p.id);
            if (Array.isArray(v) && v.length > 0) {
              const prices = v.map((x) => Number(x.price_modifier)).filter((n) => Number.isFinite(n) && n > 0);
              const minPrice = prices.length > 0 ? Math.min(...prices) : Number(p.price_mxn) || 0;
              console.log('✅ [Tienda] Producto', p.id, 'enriquecido con', v.length, 'variaciones, precio mínimo:', minPrice);
              return { ...p, variations: v, price_mxn: minPrice };
            }
            return p;
          });

          return enriched;
        };

        const enrichedProducts = await enrichWithVariations(normalizedProducts);
        setProducts(enrichedProducts);

        // Extract categories
        setCategories(data.categories || []);

        // Process visual editor data - filter explicitly for each type
        const visualData = data.visual || [];

        // Contact: prefer 'store_contact' element_id, or most recent
        const contacts = visualData.filter((item: any) => item.element_type === 'contact');
        const contactPreferred = contacts.find((item: any) => item.element_id === 'store_contact')
          || contacts.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
        setContactData(contactPreferred?.data || null);

        // Banners: map all banners and add cache-busters
        const bannersItems = visualData.filter((item: any) => item.element_type === 'banner');
        if (bannersItems.length > 0) {
          const sortedBanners = bannersItems
            .sort((a: any, b: any) => (a.data?.sort || 0) - (b.data?.sort || 0))
            .map((item: any) => {
              const ver = item.updated_at ? new Date(item.updated_at).getTime() : Date.now();
              const imageUrl = item.data?.imageUrl || item.data?.image || "/placeholder.svg";
              const imageWithVersion = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 'v=' + ver;
              return {
                id: item.data?.id || item.element_id || Math.random().toString(),
                image: imageWithVersion,
                title: item.data?.title || "",
                linkUrl: item.data?.linkUrl || ""
              };
            });
          setBanners(sortedBanners);
        }
      } catch (error) {
        console.error('❌ [Tienda] Error loading store data:', error);
      } finally {
        setStoreLoading(false);
      }
    };
    loadStoreData();
  }, [forcedTenantId, hostname, hostOverride]);

  // Track page view when store loads
  useEffect(() => {
    if (finalTenantId && !storeLoading && storeData?.ok) {
      const currentPath = window.location.pathname;
      const pageTitle = storeData?.tenant?.name || 'Tienda';

      // Track page view on both platforms
      trackGA4PageView(currentPath, pageTitle);
      trackFBPageView(currentPath, pageTitle);
    }
  }, [finalTenantId, storeLoading, storeData, trackGA4PageView, trackFBPageView]);

  // Auto-slide banners
  useEffect(() => {
    try {
      console.log("Setting up banner auto-slide effect");
      if (banners.length > 1) {
        const interval = setInterval(() => {
          setCurrentBanner(prev => {
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
      setFavorites(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
      console.log(`Favorite toggled successfully for product ${productId}`);
    } catch (error) {
      console.error(`Error 0d764bd6208d24366cbc2d3834335d4c - toggleFavorite failed:`, error);
    }
  };
  const addToCartHandler = (product: any) => {
    try {
      console.log("Adding item to cart", product);

      // Para productos variables, validar que se haya seleccionado una variación
      if (product.product_type === 'variable') {
        if (!canAddToCart || !selectedVariation?.id) {
          toast({
            title: "Error",
            description: "Por favor selecciona todas las opciones del producto",
            variant: "destructive",
          });
          return;
        }

        // Usar precio y stock de la variación
        addItem({
          id: product.id,
          title: product.title || product.name,
          price_mxn: currentPrice,
          images: product.images || [product.image],
          stock: selectedVariation.stock,
          variation_id: selectedVariation.id,
          variation_data: {
            combination: selectedVariation.combination,
            sku: selectedVariation.sku
          }
        });
      } else {
        // Producto simple
        const basePrice = product.price_mxn || product.price || 0;
        const salePrice = product.sale_price_mxn || 0;

        // Determinar el precio final base (oferta si existe y es válida, regular si no)
        const hasValidOffer = salePrice > 0 && salePrice < basePrice;
        const baseFinalPrice = hasValidOffer ? salePrice : basePrice;

        // Si hay variación seleccionada, usar su precio final; si no, usar el del producto
        const finalCartPrice = currentPrice > 0 ? currentPrice : baseFinalPrice;

        // Validar que tengamos un precio válido antes de agregar
        if (!finalCartPrice || finalCartPrice <= 0) {
          console.error('❌ [addToCart] Precio inválido:', { product, finalCartPrice });
          toast({
            title: "Error",
            description: "No se pudo agregar el producto. Precio no válido.",
            variant: "destructive",
          });
          return;
        }

        console.log('💰 [addToCart] Precio calculado:', {
          basePrice,
          salePrice,
          hasValidOffer,
          baseFinalPrice,
          currentPrice,
          finalCartPrice
        });

        addItem({
          id: product.id,
          title: product.title || product.name,
          price_mxn: finalCartPrice,
          images: product.images || [product.image],
          stock: currentStock || product.stock || 10
        });
      }

      // Track add to cart event on both platforms
      trackGA4AddToCart(product, 1);
      trackFBAddToCart(product, 1);

      // Mostrar notificación de éxito
      toast({
        title: "Producto agregado",
        description: `${product.title || product.name} se agregó al carrito`,
      });

      // Cerrar el modal del producto
      closeProductModal();

      console.log("Item added to cart successfully");
    } catch (error) {
      console.error(`Error 0d764bd6208d24366cbc2d3834335d4c - addToCart failed:`, error);
    }
  };
  const nextBanner = () => {
    try {
      logAction('nextBanner', 'Tienda');
      setCurrentBanner(prev => (prev + 1) % banners.length);
    } catch (error) {
      handleError(error, {
        errorCode: '0d764bd6208d24366cbc2d3834335d4c',
        component: 'Tienda',
        action: 'nextBanner'
      });
    }
  };
  const prevBanner = () => {
    try {
      logAction('prevBanner', 'Tienda');
      setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length);
    } catch (error) {
      handleError(error, {
        errorCode: '0d764bd6208d24366cbc2d3834335d4c',
        component: 'Tienda',
        action: 'prevBanner'
      });
    }
  };
  const openProductModal = (product: any) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
    setSelectedVariation(null);

    if (product.product_type === 'variable') {
      setCurrentStock(0);
      setCurrentPrice(0);
      setCanAddToCart(false);
    } else {
      const initialStock = product.stock || 0;
      setCurrentStock(initialStock);
      setCurrentPrice(0);
      setCanAddToCart(initialStock > 0);
    }

    console.log('🛒 [Tienda] Modal abierto:', {
      productId: product.id,
      productName: product.title || product.name,
      productType: product.product_type,
      stock: product.stock
    });

    // Track product view on both platforms
    trackGA4ProductView(product);
    trackFBProductView(product);
  };
  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setSelectedProduct(null);
  };
  const sendWhatsAppMessage = (product: any) => {
    if (!effectiveSettings?.whatsapp_number) {
      console.log('No WhatsApp number configured');
      return;
    }

    // Use custom message template if available, otherwise use default
    const messageTemplate = effectiveSettings.whatsapp_message || `Hola 👋, quisiera más información sobre\n\n📦 {product_name}\nSKU: {sku}\nPrecio: ${'{price}'} MXN\n\n¿Está disponible y cuáles son las formas de pago?`;

    // Process the template with product data
    const processedMessage = messageTemplate.replace(/{product_name}/g, product.name || product.title).replace(/{sku}/g, (product.sku ?? '').toString().trim() || 'N/A').replace(/{price}/g, String(product.price || product.price_mxn));
    const whatsappUrl = `https://wa.me/${effectiveSettings.whatsapp_number}?text=${encodeURIComponent(processedMessage)}`;
    window.open(whatsappUrl, '_blank');
  };
  const scrollToContact = () => {
    const contactSection = document.getElementById('contact-section');
    if (contactSection) {
      contactSection.scrollIntoView({
        behavior: 'smooth'
      });
    }
    setIsMobileMenuOpen(false);
  };

  const handleSearchSubmit = (query: string) => {
    // Redirect to catalog with search query
    navigate(`/catalogo?search=${encodeURIComponent(query)}`);
  };
  const isLoading = storeLoading;
  if (isLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando tienda...</p>
      </div>
    </div>;
  }

  // Show StoreNotFound only for custom domains (not toogo.store subdomains)
  if (!finalTenantId && !hostname.endsWith('.toogo.store')) {
    // Check if in sandbox environment without host override
    const isSandbox = hostname.includes('lovableproject.com') || hostname.includes('localhost');
    const isTenantNotFound = storeData?.error === 'tenant_not_found';

    if (isSandbox && isTenantNotFound && !forcedTenantId && !hostOverride) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md text-center space-y-4">
            <div className="text-6xl">🏪</div>
            <h1 className="text-2xl font-bold">Vista Previa del Editor</h1>
            <p className="text-muted-foreground">
              Para previsualizar una tienda en el editor, añade el parámetro host a la URL:
            </p>
            <code className="block bg-muted p-3 rounded-lg text-sm">
              /tienda?host=tu-dominio.toogo.store
            </code>
            <p className="text-xs text-muted-foreground mt-4">
              Ejemplo: /tienda?host=elidiabetic.toogo.store
            </p>
          </div>
        </div>
      );
    }

    return <StoreNotFound domain={hostname} />;
  }

  // Prepare data for rendering - use images directly from product data
  const formattedProducts = products?.map((product: any) => {
    console.log('🖼️ [Tienda] Producto:', {
      id: product.id,
      title: product.title,
      images: product.images
    });
    return {
      id: product.id,
      name: product.title,
      title: product.title,
      sku: product.sku,
      price: product.price_mxn,
      price_mxn: product.price_mxn,
      sale_price_mxn: product.sale_price_mxn,
      product_type: product.product_type,
      // Handle both string and object image formats
      image: Array.isArray(product.images) && product.images.length > 0 ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.url || "/placeholder.svg") : "/placeholder.svg",
      images: Array.isArray(product.images) && product.images.length > 0 ? product.images.map(img => (typeof img === 'string' ? img : img?.url || "/placeholder.svg")) : ["/placeholder.svg"],
      rating: 4.5,
      reviews: Math.floor(Math.random() * 200) + 50,
      description: product.description || "",
      stock: product.stock || 0,
      features: product.features || [],
      variations: product.variations || []
    };
  }) || [];
  const bestSellers = formattedProducts.slice(0, 8);

  // Map categories to products using embedded category data from products
  const categoriesWithProducts = categories?.map((category: any) => ({
    id: category.id,
    name: category.name,
    products: formattedProducts.filter(product => {
      // Find the original product data to access embedded categories
      const productFromOriginal = products.find(p => p.id === product.id);
      return productFromOriginal?.categories?.some((cat: any) => cat.id === category.id);
    }).slice(0, 8)
  })).filter(cat => cat.products.length > 0) || [];
  return <div className="min-h-screen" style={{ backgroundColor: effectiveSettings?.store_background_color || '#ffffff' }}>
    {/* Header */}
    <header
      className="sticky top-0 z-50 border-b border-gray-200"
      style={{ backgroundColor: effectiveSettings?.navbar_bg_color || '#ffffff' }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <LogoDisplay
              logoUrl={effectiveSettings?.logo_url}
              logoSize={effectiveSettings?.logo_size}
              tenantId={storeData?.tenant?.id || finalTenantId}
              fallbackText={storeData?.tenant?.name || "Mi Tienda"}
            />
          </div>

          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2"
                style={{
                  color: effectiveSettings?.header_icon_color || '#6b7280',
                  width: `${20 * (effectiveSettings?.header_icon_scale || 1.0)}px`,
                  height: `${20 * (effectiveSettings?.header_icon_scale || 1.0)}px`
                }}
              />
              <Input
                placeholder="Buscar productos..."
                style={{
                  height: `${40 * (effectiveSettings?.header_icon_scale || 1.0)}px`,
                  fontSize: `${14 * (effectiveSettings?.header_icon_scale || 1.0)}px`,
                  borderColor: effectiveSettings?.header_icon_color || '#6b7280',
                  color: effectiveSettings?.header_icon_color || '#6b7280',
                  borderRadius: `${8 * (effectiveSettings?.header_icon_scale || 1.0)}px`,
                  paddingLeft: `${40 * (effectiveSettings?.header_icon_scale || 1.0)}px`,
                  backgroundColor: 'transparent'
                }}
                className="border-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchSubmit(e.currentTarget.value);
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" className="relative" onClick={() => setIsFavoritesModalOpen(true)}>
              <Heart
                style={{
                  color: effectiveSettings?.header_icon_color || '#6b7280',
                  width: `${20 * (effectiveSettings?.header_icon_scale || 1.0)}px`,
                  height: `${20 * (effectiveSettings?.header_icon_scale || 1.0)}px`
                }}
              />
              {favorites.length > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {favorites.length}
                </Badge>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu
                style={{
                  color: effectiveSettings?.header_icon_color || '#6b7280',
                  width: `${20 * (effectiveSettings?.header_icon_scale || 1.0)}px`,
                  height: `${20 * (effectiveSettings?.header_icon_scale || 1.0)}px`
                }}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
        <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Menú</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="p-4">
            <nav className="space-y-4">
              <Link to="/catalogo" className="block py-3 text-lg text-gray-700 hover:text-gray-900 border-b border-gray-100" onClick={() => setIsMobileMenuOpen(false)}>
                Catálogo
              </Link>
              <button onClick={scrollToContact} className="block py-3 text-lg text-gray-700 hover:text-gray-900 border-b border-gray-100 w-full text-left">
                Contacto
              </button>
              <Link to="/dashboard" className="block py-3 text-lg text-gray-700 hover:text-gray-900 border-b border-gray-100" onClick={() => setIsMobileMenuOpen(false)}>Configuración de mi tienda</Link>
            </nav>
          </div>
        </div>
      </div>}
    </header>

    {/* Cart Sidebar */}
    <CartSidebar checkoutConfig={checkoutConfig} />

    {/* Floating Cart Button - Hidden on mobile */}
    <div className="hidden md:block fixed bottom-4 right-4 z-40">
      <Button onClick={toggleCart} className="w-12 h-12 rounded-full bg-black hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center relative">
        <ShoppingCart className="w-5 h-5" />
        {totalItems > 0 && <Badge variant="destructive" className="absolute -top-2 -right-2 min-w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
          {totalItems}
        </Badge>}
      </Button>
    </div>

    {/* Banner Slider */}
    {banners && banners.length > 0 && <section className="relative w-full aspect-[16/9] sm:aspect-[16/10] lg:aspect-[8/3] overflow-hidden">
      <div className="relative w-full h-full">
        {banners.map((banner, index) => <div key={banner.id} className={`absolute inset-0 transition-opacity duration-500 ${index === currentBanner ? "opacity-100" : "opacity-0"}`} style={{
          backgroundImage: `url(${banner.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }} />)}
      </div>

      {banners.length > 1 && <>
        <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white" onClick={prevBanner}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white" onClick={nextBanner}>
          <ChevronRight className="w-6 h-6" />
        </Button>
      </>}
    </section>}

    {/* Best Sellers - Overlaying Banner */}
    {bestSellers.length > 0 && <div className="relative -mt-20 z-10 w-full px-4 pt-8 pb-4">
      <AutoCarousel
        title="Más vendidos"
        products={bestSellers}
        isBestSellers={true}
        onProductClick={openProductModal}
        onToggleFavorite={toggleFavorite}
        favorites={favorites}
        hoverColor={effectiveSettings?.product_card_hover_color}
        cardBgColor={effectiveSettings?.product_card_bg_color}
      />
    </div>}

    {/* Content */}
    <main className="container mx-auto px-4 py-8 space-y-12">

      {/* Categories */}
      {categoriesWithProducts.map(category => <AutoCarousel
        key={category.name}
        title={category.name}
        products={category.products}
        onProductClick={openProductModal}
        onViewMore={() => navigate(`/catalogo?category=${category.slug || category.name}`)}
        onToggleFavorite={toggleFavorite}
        favorites={favorites}
        hoverColor={effectiveSettings?.product_card_hover_color}
        cardBgColor={effectiveSettings?.product_card_bg_color}
      />)}

    </main>

    {/* Product Modal */}
    <Dialog open={isProductModalOpen} onOpenChange={closeProductModal}>
      <DialogContent className="w-[80%] sm:w-[80%] lg:max-w-4xl max-h-[90vh] overflow-y-auto rounded-[15px]">
        {selectedProduct && <>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
          <DialogHeader>
            <DialogTitle className="sr-only">Detalle del producto</DialogTitle>
          </DialogHeader>

          {(() => {
            const isVariable = selectedProduct.product_type === 'variable';
            const hasAnyVariantStock =
              isVariable
                ? Array.isArray(selectedProduct.variations) && selectedProduct.variations.some((v: any) => Number(v.stock) > 0)
                : false;

            return (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <ProductImageGallery
                    images={selectedProduct.images || [selectedProduct.image]}
                    productName={selectedProduct.name}
                    showOutOfStock={isVariable ? !hasAnyVariantStock : currentStock === 0}
                  />
                </div>

                <div className="space-y-6">
                  <h3 className="font-bold text-gray-900 text-xl md:text-2xl lg:text-3xl flex items-center gap-2 flex-wrap">
                    {selectedProduct.name}
                    {selectedProduct.sale_price_mxn > 0 && selectedProduct.sale_price_mxn < selectedProduct.price_mxn && (
                      <span className="text-xs font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full">
                        -{Math.round(((selectedProduct.price_mxn - selectedProduct.sale_price_mxn) / selectedProduct.price_mxn) * 100)}% OFF
                      </span>
                    )}
                  </h3>
                  <div>
                    <p className="text-gray-600 leading-relaxed text-sm">
                      {selectedProduct.description}
                    </p>
                  </div>


                  {selectedProduct.features && selectedProduct.features.length > 0 && <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Características:</h4>
                    <ul className="space-y-1">
                      {selectedProduct.features.map((feature, index) => <li key={index} className="text-gray-600 flex items-center">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                        {feature}
                      </li>)}
                    </ul>
                  </div>}

                  {/* Product Variables */}
                  <ProductVariationSelector
                    productId={selectedProduct.id}
                    variations={selectedProduct.variations}
                    onPriceChange={(price) => {
                      console.log('🛒 [Tienda] Precio cambiado:', price);
                      setCurrentPrice(price);
                    }}
                    onStockChange={(stock) => {
                      console.log('🛒 [Tienda] Stock cambiado:', stock);
                      setCurrentStock(stock);
                    }}
                    onVariationComplete={(isComplete) => {
                      console.log('🛒 [Tienda] Variación completa:', isComplete);
                      setCanAddToCart(isComplete);
                    }}
                    onVariationChange={(variation) => setSelectedVariation(variation)}
                  />

                  {/* Price Display */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {currentPrice > 0 ? (
                        <span className="text-3xl font-bold">
                          ${currentPrice.toFixed(2)} MXN
                        </span>
                      ) : isVariable ? (
                        <span className="text-3xl font-bold">
                          Desde: ${selectedProduct.price_mxn.toFixed(2)} MXN
                        </span>
                      ) : selectedProduct.sale_price_mxn > 0 && selectedProduct.sale_price_mxn < selectedProduct.price_mxn ? (
                        <span className="text-3xl font-bold">
                          ${selectedProduct.sale_price_mxn.toFixed(2)} MXN
                        </span>
                      ) : (
                        <span className="text-3xl font-bold">
                          ${selectedProduct.price_mxn.toFixed(2)} MXN
                        </span>
                      )}
                    </div>
                    {currentPrice === 0 && selectedProduct.sale_price_mxn > 0 && selectedProduct.sale_price_mxn < selectedProduct.price_mxn && (
                      <p className="text-lg line-through text-muted-foreground">
                        ${selectedProduct.price_mxn.toFixed(2)} MXN
                      </p>
                    )}
                    {currentStock > 0 && (
                      <p className="text-sm text-green-600">
                        ✓ {currentStock} disponibles
                      </p>
                    )}
                    {isVariable && !canAddToCart && hasAnyVariantStock && (
                      <p className="text-sm text-gray-500">Selecciona las opciones para ver el stock disponible.</p>
                    )}
                  </div>


                  <div className="space-y-3">
                    <Button
                      onClick={() => addToCartHandler(selectedProduct)}
                      className="w-full"
                      size="lg"
                      disabled={!canAddToCart || (!isVariable && currentStock === 0)}
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      {isVariable && !canAddToCart
                        ? 'Selecciona opciones'
                        : currentStock === 0
                          ? 'Agotado'
                          : 'Agregar al carrito'}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => toggleFavorite(selectedProduct.id)}
                      className="w-full"
                      size="lg"
                    >
                      <Heart className={`w-5 h-5 mr-2 ${favorites.includes(selectedProduct.id) ? "fill-red-500 text-red-500" : ""}`} />
                      {favorites.includes(selectedProduct.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                    </Button>

                    {effectiveSettings?.whatsapp_number && <Button onClick={() => sendWhatsAppMessage(selectedProduct)} variant="outline" className="w-full" size="lg">
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Consultar por WhatsApp
                    </Button>}
                  </div>
                </div>
              </div>
            );
          })()}
        </>}
      </DialogContent>
    </Dialog>

    {/* Favorites Modal */}
    <Dialog open={isFavoritesModalOpen} onOpenChange={setIsFavoritesModalOpen}>
      <DialogContent className="w-[95%] sm:max-w-3xl max-h-[80vh] overflow-y-auto rounded-[15px]">
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-5 w-5" />
          <span className="sr-only">Cerrar</span>
        </DialogClose>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Mis Favoritos ({favorites.length})</DialogTitle>
        </DialogHeader>

        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Heart className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg mb-2">Aún no tienes productos favoritos</p>
            <p className="text-gray-400 text-sm">Agrega productos a favoritos para verlos aquí</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 py-2 sm:py-4">
            {favorites.map(favoriteId => {
              const product = products.find(p => p.id === favoriteId);
              if (!product) return null;

              return (
                <div key={product.id} className="text-xs sm:text-sm">
                  <ProductCard
                    product={{
                      id: product.id,
                      name: product.title,
                      price: product.price_mxn,
                      price_mxn: product.price_mxn,
                      sale_price_mxn: product.sale_price_mxn,
                      image: product.images?.[0] || '/placeholder.svg',
                      images: product.images,
                      description: product.description,
                      stock: product.stock,
                      product_type: product.product_type
                    }}
                    isBestSeller={false}
                    onProductClick={() => {
                      setIsFavoritesModalOpen(false);
                      openProductModal(product);
                    }}
                    onToggleFavorite={toggleFavorite}
                    favorites={favorites}
                    hoverColor={settings?.product_card_hover_color}
                    cardBgColor={settings?.product_card_bg_color}
                  />
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Contact Section - Hidden on mobile */}
    <ContactSection
      contactData={contactData}
      className="hidden md:block"
      backgroundColor={effectiveSettings?.footer_bg_color || '#ffffff'}
      iconColor={effectiveSettings?.footer_icon_color || '#1f2937'}
      iconScale={effectiveSettings?.footer_icon_scale || 1.0}
    />

    <StoreFooter
      tenant={tenant}
      settings={effectiveSettings}
    />

    {/* Mobile Bottom Navigation - Only visible on mobile */}
    <MobileBottomNav
      contactData={contactData}
      cartItemsCount={totalItems}
      onCartClick={toggleCart}
      onSearchSubmit={handleSearchSubmit}
    />

  </div>;
};
export default Tienda;