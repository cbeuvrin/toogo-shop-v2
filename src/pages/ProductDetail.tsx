// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShoppingCart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { useToogoStore } from "@/hooks/store/useToogoStore";
import { LogoDisplay } from "@/components/ui/LogoDisplay";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { ProductImageGallery } from "@/components/ui/product-image-gallery";
import { ProductVariationSelector } from "@/components/ui/ProductVariationSelector";
import { StoreNotFound } from "./StoreNotFound";

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const store = useToogoStore();
  const { isLoading, storeData, products, tenant, effectiveSettings } = store;

  const { addItem, totalItems, toggleCart } = useCart();

  const product = useMemo(() => {
    if (!products || products.length === 0) return null;
    return products.find((p: any) => p.slug === slug || p.id === slug) || null;
  }, [products, slug]);

  const isVariable = product?.product_type === "variable";

  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);
  const [canAddToCart, setCanAddToCart] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<any>(null);

  useEffect(() => {
    if (!product) return;
    if (!isVariable) {
      setCurrentPrice(product.sale_price_mxn > 0 && product.sale_price_mxn < product.price_mxn
        ? product.sale_price_mxn
        : product.price_mxn);
      setCurrentStock(product.stock || 0);
      setCanAddToCart((product.stock || 0) > 0);
    } else {
      setCurrentPrice(0);
      setCurrentStock(0);
      setCanAddToCart(false);
    }
  }, [product, isVariable]);

  const buildHomeUrl = () => {
    const host = searchParams.get("host");
    return host ? `/?host=${encodeURIComponent(host)}` : "/";
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (!canAddToCart || (!isVariable && currentStock === 0)) return;

    const finalPrice = currentPrice || product.price_mxn;
    addItem({
      id: product.id,
      title: product.title,
      price_mxn: finalPrice,
      images: product.images || [],
      stock: currentStock || product.stock || 0,
      variation_id: selectedVariation?.id,
      variation_data: selectedVariation ? {
        combination: selectedVariation.combination,
        sku: selectedVariation.sku,
      } : undefined,
    });
    toast({
      title: "Agregado al carrito",
      description: product.title,
    });
  };

  const handleWhatsApp = () => {
    const number = effectiveSettings?.whatsapp_number;
    if (!number || !product) return;
    const finalPrice = currentPrice || product.price_mxn;
    const text = `Hola 👋, me interesa este producto:\n\n*${product.title}*\nPrecio: $${finalPrice.toFixed(2)} MXN\n\n¿Está disponible?`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (!tenant?.id && !storeData?.ok) {
    return <StoreNotFound domain={window.location.hostname} />;
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <button onClick={() => navigate(buildHomeUrl())} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Volver a la tienda</span>
            </button>
            <LogoDisplay logoUrl={effectiveSettings?.logo_url} logoSize={effectiveSettings?.logo_size} fallbackText={tenant?.name || "TIENDA"} disableFetch />
            <div className="w-24" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold mb-2">Producto no encontrado</h1>
            <p className="text-gray-600 mb-6">Este producto ya no está disponible o el enlace es incorrecto.</p>
            <Button onClick={() => navigate(buildHomeUrl())}>Volver a la tienda</Button>
          </div>
        </div>
      </div>
    );
  }

  const hasDiscount = !isVariable
    && product.sale_price_mxn > 0
    && product.sale_price_mxn < product.price_mxn;

  const hasAnyVariantStock = isVariable
    ? Array.isArray(product.variations) && product.variations.some((v: any) => Number(v.stock) > 0)
    : false;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(buildHomeUrl())}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver a la tienda</span>
          </button>

          <div className="flex-1 flex justify-center">
            <LogoDisplay
              logoUrl={effectiveSettings?.logo_url}
              logoSize={effectiveSettings?.logo_size}
              tenantName={tenant?.name}
            />
          </div>

          <button
            onClick={toggleCart}
            className="relative p-2 hover:bg-gray-100 rounded-full"
            aria-label="Abrir carrito"
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div>
            <ProductImageGallery
              images={product.images || []}
              productName={product.title}
              showOutOfStock={isVariable ? !hasAnyVariantStock : currentStock === 0}
            />
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="font-bold text-gray-900 text-2xl md:text-3xl lg:text-4xl flex items-start gap-3 flex-wrap">
                <span>{product.title}</span>
                {hasDiscount && (
                  <span className="text-xs font-semibold bg-red-500 text-white px-2 py-1 rounded-full whitespace-nowrap">
                    -{Math.round(((product.price_mxn - product.sale_price_mxn) / product.price_mxn) * 100)}% OFF
                  </span>
                )}
              </h1>
              {product.sku && (
                <p className="text-xs text-gray-500 mt-2">SKU: {product.sku}</p>
              )}
            </div>

            {product.description && (
              <div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {product.features && product.features.length > 0 && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-2">Características</h2>
                <ul className="space-y-1">
                  {product.features.map((feature: string, index: number) => (
                    <li key={index} className="text-gray-700 flex items-start">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ProductVariationSelector
              productId={product.id}
              variations={product.variations}
              onPriceChange={(price: number) => setCurrentPrice(price)}
              onStockChange={(stock: number) => setCurrentStock(stock)}
              onVariationComplete={(isComplete: boolean) => setCanAddToCart(isComplete)}
              onVariationChange={(variation: any) => setSelectedVariation(variation)}
            />

            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                {currentPrice > 0 ? (
                  <span className="text-3xl md:text-4xl font-bold text-gray-900">
                    ${currentPrice.toFixed(2)} MXN
                  </span>
                ) : isVariable ? (
                  <span className="text-3xl md:text-4xl font-bold text-gray-900">
                    Desde ${product.price_mxn.toFixed(2)} MXN
                  </span>
                ) : (
                  <span className="text-3xl md:text-4xl font-bold text-gray-900">
                    ${product.price_mxn.toFixed(2)} MXN
                  </span>
                )}
                {hasDiscount && currentPrice === product.sale_price_mxn && (
                  <span className="text-lg line-through text-gray-400">
                    ${product.price_mxn.toFixed(2)}
                  </span>
                )}
              </div>
              {!isVariable && currentStock > 0 && (
                <p className="text-sm text-green-600">✓ {currentStock} disponibles</p>
              )}
              {!isVariable && currentStock === 0 && (
                <p className="text-sm text-red-600">Producto agotado</p>
              )}
              {isVariable && !canAddToCart && hasAnyVariantStock && (
                <p className="text-sm text-gray-500">Selecciona las opciones para ver disponibilidad.</p>
              )}
              {isVariable && !hasAnyVariantStock && (
                <p className="text-sm text-red-600">Sin stock en ninguna variación</p>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <Button
                onClick={handleAddToCart}
                className="w-full"
                size="lg"
                disabled={!canAddToCart || (!isVariable && currentStock === 0)}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {isVariable && !canAddToCart
                  ? "Selecciona opciones"
                  : (currentStock === 0 && !isVariable)
                    ? "Agotado"
                    : "Agregar al carrito"}
              </Button>

              {effectiveSettings?.whatsapp_number && (
                <Button
                  onClick={handleWhatsApp}
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
      </main>

      <CartSidebar />
    </div>
  );
};

export default ProductDetail;
