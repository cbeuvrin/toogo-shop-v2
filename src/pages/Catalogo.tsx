// @ts-nocheck
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { 
  Search, 
  ShoppingCart, 
  Heart, 
  Star, 
  MessageCircle,
  Home,
  ArrowLeft,
  X,
  Menu,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProductImageGallery } from "@/components/ui/product-image-gallery";
import { ProductVariationSelector } from "@/components/ui/ProductVariationSelector";
import { ContactSection } from "@/components/ui/ContactSection";
import { useTenantContext } from "@/contexts/TenantContext";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { useFavicon } from "@/hooks/useFavicon";

interface Product {
  id: string;
  title: string;
  description: string;
  price_usd: number;
  price_mxn: number;
  stock: number;
  status: 'active' | 'inactive';
  images: string[];
  features: string[];
  product_type: 'simple' | 'variable';
  category_id?: string;
  tenant_id: string;
  categories?: { name: string; slug: string }[]; // For display compatibility
}

interface Category {
  id: string;
  name: string;
  slug: string;
  showOnHome?: boolean;
  sort?: number;
  tenant_id: string;
}

const Catalogo = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { addItem, totalItems, toggleCart } = useCart();
  const { currentTenantId, isLoading: tenantLoading } = useTenantContext();
  const tenantId = currentTenantId;
  const { products, isLoading: productsLoading } = useProducts();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { settings } = useTenantSettings();
  
  const [tenantPlan, setTenantPlan] = useState<string>('');
  
  const [enrichedProducts, setEnrichedProducts] = useState<Product[]>([]);
  const [publicLoaded, setPublicLoaded] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [contactData, setContactData] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [checkoutConfig, setCheckoutConfig] = useState<any>(null);
  
  // Variation state
  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);
  const [canAddToCart, setCanAddToCart] = useState(false);
  const [modalVariations, setModalVariations] = useState<any[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<any>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  const loading = tenantLoading || productsLoading || categoriesLoading;

  // Load tenant plan
  useEffect(() => {
    if (currentTenantId) {
      supabase
        .from('tenants')
        .select('plan')
        .eq('id', currentTenantId)
        .single()
        .then(({ data }) => {
          if (data) setTenantPlan(data.plan);
        });
    }
  }, [currentTenantId]);

  // Set favicon for Basic/Premium plans
  useFavicon({ 
    logoUrl: settings?.logo_url, 
    plan: tenantPlan 
  });

  // Get initial search from URL params
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    const categoryFromUrl = searchParams.get('category');
    const pageFromUrl = searchParams.get('page');
    
    if (searchFromUrl) {
      setSearchTerm(searchFromUrl);
    }
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
    if (pageFromUrl) {
      setCurrentPage(parseInt(pageFromUrl, 10) || 1);
    }
  }, [searchParams]);

  // Load contact data from visual_editor_data
  useEffect(() => {
    if (tenantId) {
      loadContactData();
    }
  }, [tenantId]);

  // Filter products when enriched list or filters change
  useEffect(() => {
    filterProducts();
  }, [enrichedProducts, selectedCategory, searchTerm]);

  const loadContactData = async () => {
    try {
      // First try to get the preferred 'store_contact' element_id
      let { data: editorData } = await supabase
        .from('visual_editor_data')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('element_type', 'contact')
        .eq('element_id', 'store_contact')
        .maybeSingle();

      // If not found, fallback to most recent contact
      if (!editorData) {
        const { data: fallbackData } = await supabase
          .from('visual_editor_data')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('element_type', 'contact')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        editorData = fallbackData;
      }

      if (editorData?.data) {
        setContactData(editorData.data);
      }
    } catch (error) {
      console.error('Error loading contact data:', error);
    }
  };
  // Load public products and variations via public RPC
  useEffect(() => {
    const loadPublicProducts = async () => {
      try {
        const hostname = window.location.hostname;
        const searchParams = new URLSearchParams(window.location.search);
        const previewTenantId = searchParams.get('preview');
        const hostOverride = searchParams.get('host') || searchParams.get('domain');
        let result: any;

        if (previewTenantId) {
          result = await supabase.rpc('get_public_store_data_demo', { p_tenant_id: previewTenantId });
        } else {
          const effectiveHost = hostOverride || hostname;
          result = await supabase.rpc('get_public_store_data', { p_host: effectiveHost });
        }

        if (result?.error || !result?.data?.ok) {
          return;
        }

        const rawProducts = result.data.products || [];
        const normalizedProducts = rawProducts.map((product: any) => {
          let finalPrice = product.price_mxn;

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

        // Enrich products that still lack variations
        const targets = normalizedProducts.filter(
          (p: any) => p.product_type === 'variable' && (!Array.isArray(p.variations) || p.variations.length === 0)
        );

        let enriched = normalizedProducts;
        if (targets.length > 0) {
          const results = await Promise.all(
            targets.map(async (p: any) => {
              const { data, error } = await supabase.rpc('get_product_variations_with_details', {
                product_id_param: p.id,
              });
              if (error) {
                console.error('Error obteniendo variaciones públicas para', p.id, error);
                return { id: p.id, variations: [] as any[] };
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

          const byId = new Map(results.map((r: any) => [r.id, r.variations]));
          enriched = normalizedProducts.map((p: any) => {
            const v = byId.get(p.id);
            if (Array.isArray(v) && v.length > 0) {
              const prices = v.map((x: any) => Number(x.price_modifier)).filter((n: number) => Number.isFinite(n) && n > 0);
              const minPrice = prices.length > 0 ? Math.min(...prices) : Number(p.price_mxn) || 0;
              return { ...p, variations: v, price_mxn: minPrice };
            }
            return p;
          });
        }

        setEnrichedProducts(enriched);
        setPublicLoaded(true);

        // Prepare checkout config from loaded settings
        const settings = result.data.settings || {};
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
      } catch (err) {
        console.error('Error loading public products:', err);
      }
    };
    loadPublicProducts();
  }, []);

  // Enrich products with variations via public RPC (for unauthenticated users)
  useEffect(() => {
    if (publicLoaded) return;
    const run = async () => {
      try {
        if (!products || products.length === 0) {
          setEnrichedProducts([]);
          return;
        }
        const baseList = products.map((p: any) => ({ ...p }));
        const targets = baseList.filter((p: any) => p.product_type === 'variable' && (!Array.isArray(p.variations) || p.variations.length === 0));
        if (targets.length === 0) {
          setEnrichedProducts(baseList);
          return;
        }
        const results = await Promise.all(
          targets.map(async (p: any) => {
            const { data, error } = await supabase.rpc('get_product_variations_with_details', {
              product_id_param: p.id,
            });
            if (error) {
              console.error('Error fetching variations for product', p.id, error);
              return { id: p.id, variations: [] as any[] };
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
        const byId = new Map(results.map((r: any) => [r.id, r.variations]));
        const enriched = baseList.map((p: any) => {
          const v = byId.get(p.id);
          if (Array.isArray(v) && v.length > 0) {
            const prices = v.map((x: any) => Number(x.price_modifier)).filter((n: number) => Number.isFinite(n) && n > 0);
            const minPrice = prices.length > 0 ? Math.min(...prices) : Number(p.price_mxn) || 0;
            return { ...p, variations: v, price_mxn: minPrice };
          }
          return p;
        });
        setEnrichedProducts(enriched);
      } catch (e) {
        console.error('Error enriching products with variations:', e);
        setEnrichedProducts(products as any);
      }
    };
    run();
  }, [products, publicLoaded]);

  const filterProducts = () => {
    let filtered = enrichedProducts && enrichedProducts.length > 0 ? [...enrichedProducts] : [...products];

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => {
        // Check both category_id and categories array for compatibility
        if (product.category_id) {
          const category = categories.find(cat => cat.id === product.category_id);
          return category?.name.toLowerCase() === selectedCategory;
        }
        
        // Also check categories array if available
        if (product.categories && product.categories.length > 0) {
          return product.categories.some(cat => cat.name.toLowerCase() === selectedCategory);
        }
        
        // Products without categories should NOT appear in specific category filters
        return false;
      });
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.features?.some(feature => feature.toLowerCase().includes(searchLower))
      );
    }

    setFilteredProducts(filtered);
    
    // Reset to page 1 when filters change
    setCurrentPage(1);
  };

  const handleCategoryChange = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setCurrentPage(1);
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (categorySlug === "all") {
      newParams.delete('category');
    } else {
      newParams.set('category', categorySlug);
    }
    newParams.delete('page'); // Reset page when changing category
    setSearchParams(newParams);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      newParams.set('search', value);
    } else {
      newParams.delete('search');
    }
    newParams.delete('page'); // Reset page when changing search
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSelectedCategory("all");
    setSearchTerm("");
    setCurrentPage(1);
    setSearchParams(new URLSearchParams());
  };

  // Pagination functions
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      
      // Update URL params
      const newParams = new URLSearchParams(searchParams);
      if (page === 1) {
        newParams.delete('page');
      } else {
        newParams.set('page', page.toString());
      }
      setSearchParams(newParams);
      
      // Scroll to top of products
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevious = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const half = Math.floor(maxPagesToShow / 2);
      let start = Math.max(currentPage - half, 1);
      let end = Math.min(start + maxPagesToShow - 1, totalPages);
      
      if (end - start < maxPagesToShow - 1) {
        start = Math.max(end - maxPagesToShow + 1, 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const addToCart = (product: Product) => {
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
        title: product.title,
        price_mxn: currentPrice,
        images: product.images || [],
        stock: selectedVariation.stock,
        variation_id: selectedVariation.id,
        variation_data: {
          combination: selectedVariation.combination,
          sku: selectedVariation.sku
        }
      });
    } else {
      // Producto simple
      const basePrice = product.sale_price_mxn > 0 ? product.sale_price_mxn : product.price_mxn;
      const finalCartPrice = currentPrice > 0 ? currentPrice : basePrice;
      
      if (!finalCartPrice || finalCartPrice <= 0) {
        toast({
          title: "Error",
          description: "No se pudo agregar el producto al carrito.",
          variant: "destructive",
        });
        return;
      }

      addItem({
        id: product.id,
        title: product.title,
        price_mxn: finalCartPrice,
        images: product.images || [],
        stock: currentStock || product.stock || 10
      });
    }

    toast({
      title: "Producto agregado",
      description: `${product.title} se agregó al carrito`,
    });
    
    setSelectedProduct(null);
  };

  const sendWhatsAppMessage = (product: Product) => {
    if (!settings?.whatsapp_number) {
      console.log('No WhatsApp number configured');
      return;
    }
    
    // Use custom message template if available, otherwise use default
    const messageTemplate = settings.whatsapp_message || 
      `Hola 👋, quisiera más información sobre\n\n📦 {product_name}\nSKU: {sku}\nPrecio: ${'{price}'} MXN\n\n¿Está disponible y cuáles son las formas de pago?`;
    
    // Process the template with product data
    const processedMessage = messageTemplate
      .replace(/{product_name}/g, product.title)
      .replace(/{sku}/g, (product.sku ?? '').toString().trim() || 'N/A')
      .replace(/{price}/g, String(product.price_mxn));
    
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

  // Open product modal with proper initialization
  const openProductModal = async (product: Product) => {
    setSelectedProduct(product);
    setModalVariations([]);
    setSelectedVariation(null);
    
    if (product.product_type === 'variable') {
      setCurrentStock(0);
      setCurrentPrice(0);
      setCanAddToCart(false);
      
      // Load variations via RPC for public access
      try {
        const { data, error } = await supabase.rpc('get_product_variations_with_details', {
          product_id_param: product.id,
        });
        
        if (!error && Array.isArray(data)) {
          const mapped = data.map((v: any) => ({
            id: v.id,
            product_id: v.product_id,
            combination: typeof v.combination === 'object' && v.combination !== null ? v.combination : {},
            stock: Number(v.stock) || 0,
            price_modifier: Number(v.price_modifier) || 0,
            sku: v.sku ?? null,
          }));
          setModalVariations(mapped);
        }
      } catch (e) {
        console.error('Error loading variations via RPC:', e);
      }
    } else {
      const initialStock = product.stock || 0;
      setCurrentStock(initialStock);
      setCurrentPrice(0);
      setCanAddToCart(initialStock > 0);
    }
  };

  // Product Card Component
  const ProductCard = ({ product }: { product: Product }) => (
    <Card 
      className="group overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white hover:bg-black rounded-[30px] cursor-pointer"
      onClick={() => openProductModal(product)}
    >
                <div className="relative aspect-square overflow-hidden bg-gray-50 rounded-[30px]">
                  <div className="w-[94%] h-[94%] mx-auto mt-[3%] aspect-square overflow-hidden rounded-[30px]">
          <img
            src={product.images?.[0] || "/placeholder.svg"}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        
        {/* Favorite button */}
        <button 
          className="absolute top-4 right-4 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            toast({ title: "Agregado a favoritos" });
          }}
        >
          <Heart className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      
      <div className="p-4 space-y-2">
        <h3 className="font-medium text-sm text-gray-900 group-hover:text-white transition-colors duration-300 line-clamp-2">
          {product.title}
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-lg font-bold text-gray-900 group-hover:text-white transition-colors duration-300">
              ${product.price_mxn} MXN
            </p>
            <p className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors duration-300">
              ${product.price_usd} USD
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-gray-600 group-hover:text-gray-300 transition-colors duration-300">
              4.5
            </span>
          </div>
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: settings?.store_background_color || '#f9fafb' }}>
      {/* Header */}
      <header 
        className="shadow-sm border-b border-gray-200 sticky top-0 z-40"
        style={{ backgroundColor: settings?.navbar_bg_color || '#ffffff' }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Back button and title */}
            <div className="flex items-center gap-4">
              <Link 
                to="/" 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold">Tienda</h1>
              {(searchTerm || selectedCategory !== "all") && (
                <Badge variant="secondary" className="hidden md:flex">
                  {filteredProducts.length} productos
                </Badge>
              )}
            </div>

            {/* Search bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => handleSearchChange("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Right side: Menu only */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
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

          {/* Search bar - Mobile */}
          <div className="md:hidden pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[80%] mx-auto px-4 py-6">
        {/* Category Filters - Top horizontal */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Categorías</h3>
            {(searchTerm || selectedCategory !== "all") && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Limpiar filtros
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              className="rounded-[30px]"
              onClick={() => handleCategoryChange("all")}
            >
              Todos los productos
            </Button>
            
            {categories
              .filter(category => category.showOnHome !== false) // Solo mostrar categorías visibles
              .map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.name.toLowerCase() ? "default" : "outline"}
                className="rounded-[30px]"
                onClick={() => handleCategoryChange(category.name.toLowerCase())}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-600">
              {searchTerm && `Resultados para "${searchTerm}"`}
              {selectedCategory !== "all" && !searchTerm && 
                `Categoría: ${categories.find(c => c.name.toLowerCase() === selectedCategory)?.name}`}
              {!searchTerm && selectedCategory === "all" && "Todos los productos"}
            </p>
            <p className="text-sm text-gray-500">
              {filteredProducts.length > 0 && (
                <>
                  Mostrando {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length} productos
                  {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
                </>
              )}
              {filteredProducts.length === 0 && "0 productos encontrados"}
            </p>
          </div>
        </div>

        {/* Products grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-500 mb-4">
              Intenta con otros términos de búsqueda o categorías
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Ver todos los productos
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {paginatedProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
              />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={goToPrevious}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {getPageNumbers().map((pageNum) => (
                      <PaginationItem key={pageNum}>
                        <PaginationLink 
                          onClick={() => goToPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={goToNext}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => { if (!open) { setSelectedProduct(null); setCurrentPrice(0); setCurrentStock(0); setCanAddToCart(false); setModalVariations([]); } }}>
        <DialogContent className="w-[80%] sm:w-[80%] lg:max-w-4xl max-h-[90vh] overflow-y-auto rounded-[15px]">
          {selectedProduct && (
            <>
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
                const sourceVariations = modalVariations.length > 0 ? modalVariations : (selectedProduct.variations || []);
                const hasAnyVariantStock = isVariable
                  ? Array.isArray(sourceVariations) && sourceVariations.some((v: any) => Number(v.stock) > 0)
                  : false;
                
                return (
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <ProductImageGallery 
                        images={selectedProduct.images || [selectedProduct.image]} 
                        productName={selectedProduct.title}
                        showOutOfStock={isVariable ? !hasAnyVariantStock : currentStock === 0}
                      />
                    </div>
                    
                    <div className="space-y-6">
                      <h3 className="font-bold text-gray-900 text-xl md:text-2xl lg:text-3xl flex items-center gap-2 flex-wrap">
                        {selectedProduct.title}
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
                      
                      {selectedProduct.features && selectedProduct.features.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Características:</h4>
                          <ul className="space-y-1">
                            {selectedProduct.features.map((feature, index) => (
                              <li key={index} className="text-gray-600 flex items-center">
                                <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Product Variables */}
                      <ProductVariationSelector 
                        productId={selectedProduct.id}
                        variations={modalVariations.length > 0 ? modalVariations : selectedProduct.variations}
                        onPriceChange={(price) => setCurrentPrice(price)}
                        onStockChange={(stock) => setCurrentStock(stock)}
                        onVariationComplete={(isComplete) => setCanAddToCart(isComplete)}
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
                          onClick={() => addToCart(selectedProduct)} 
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
                        
                        {settings?.whatsapp_number && (
                          <Button 
                            onClick={() => sendWhatsAppMessage(selectedProduct)} 
                            variant="outline" 
                            className="w-full" 
                            size="lg"
                          >
                            <MessageCircle className="w-5 h-5 mr-2" />
                            Consultar por WhatsApp
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation - Mobile Only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around py-1 px-4 h-12 relative">
          {/* Inicio */}
          <Link to="/" className="flex flex-col items-center space-y-0.5 p-1 text-gray-600 hover:text-gray-900">
            <div className="w-5 h-5 flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium">Inicio</span>
          </Link>

          {/* WhatsApp */}
          <button className="flex flex-col items-center space-y-0.5 p-1 text-gray-600 hover:text-gray-900">
            <MessageCircle className="w-5 h-5" />
            <span className="text-[10px] font-medium">WhatsApp</span>
          </button>

          {/* Buscar (Centro - Destacado) */}
          <button className="absolute top-[-18px] left-1/2 transform -translate-x-1/2 flex flex-col items-center">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center relative">
              <Search className="w-5 h-5 text-white" />
            </div>
          </button>

          {/* Favoritos */}
          <button className="flex flex-col items-center space-y-0.5 p-1 text-gray-600 hover:text-gray-900">
            <Heart className="w-5 h-5" />
            <span className="text-[10px] font-medium">Favoritos</span>
          </button>

          {/* Carrito */}
          <button 
            onClick={toggleCart}
            className="flex flex-col items-center space-y-0.5 p-1 text-gray-600 hover:text-gray-900"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Carrito</span>
          </button>
        </div>
      </div>

      {/* Spacer for bottom navigation on mobile */}
      <div className="md:hidden h-12"></div>
      
      {/* Floating Cart Button */}
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          onClick={toggleCart}
          className="w-12 h-12 rounded-full bg-black hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center relative"
        >
          <ShoppingCart className="w-5 h-5" />
          {totalItems > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 min-w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            >
              {totalItems}
            </Badge>
          )}
        </Button>
      </div>
      
      {/* Cart Sidebar */}
      <CartSidebar checkoutConfig={checkoutConfig} />

      {/* Contact Section */}
      <ContactSection 
        contactData={contactData} 
        backgroundColor={settings?.footer_bg_color || '#1a1a1a'}
      />
    </div>
  );
};

export default Catalogo;