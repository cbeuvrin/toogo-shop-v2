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
import { getProductDetailTheme } from "@/templates/productDetail/themes";

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const store = useToogoStore();
  const { isLoading, storeData, products, tenant, effectiveSettings } = store;

  const theme = useMemo(
    () => getProductDetailTheme(effectiveSettings?.template_id),
    [effectiveSettings?.template_id]
  );

  const { addItem, totalItems, toggleCart } = useCart();

  const product = useMemo(() => {
    if (!products || products.length === 0) return null;
    const found = products.find((p: any) => p.slug === slug || p.id === slug);
    if (!found) return null;
    // The public RPC returns images as [{id, url, sort}]; ProductImageGallery
    // expects an array of URL strings. Normalize here so both shapes are accepted.
    const normalizedImages = Array.isArray(found.images)
      ? found.images
          .map((img: any) => (typeof img === "string" ? img : img?.url))
          .filter(Boolean)
      : [];
    return { ...found, images: normalizedImages };
  }, [products, slug]);

  const isVariable = product?.product_type === "variable";
  const isService = product?.product_type === "service";
  const pricingMode: 'fixed' | 'starting_from' | 'quote' = isService
    ? (product?.pricing_mode || 'fixed')
    : 'fixed';
  const isQuoteOnly = isService && pricingMode === 'quote';

  const [currentPrice, setCurrentPrice] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);
  const [canAddToCart, setCanAddToCart] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<any>(null);

  useEffect(() => {
    if (!product) return;
    if (isService) {
      setCurrentPrice(product.price_mxn || 0);
      setCurrentStock(0);
      setCanAddToCart(false);
    } else if (!isVariable) {
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
  }, [product, isVariable, isService]);

  const buildHomeUrl = () => {
    const host = searchParams.get("host");
    return host ? `/?host=${encodeURIComponent(host)}` : "/";
  };

  // checkoutConfig is built from public RPC settings so the embedded
  // checkout dialog can read MP credentials without hitting RLS-protected tables.
  const checkoutConfig = useMemo(() => {
    const s = effectiveSettings || {};
    const methods: any[] = [];
    if (s.mercadopago_public_key) methods.push({ id: "mercadopago", name: "MercadoPago", enabled: true, icon: null });
    if (s.paypal_client_id) methods.push({ id: "paypal", name: "PayPal", enabled: true, icon: null });
    if (s.whatsapp_number) methods.push({ id: "whatsapp", name: "WhatsApp (Pago manual)", enabled: true, icon: null });
    return {
      logoUrl: s.logo_url || "",
      mercadopago_public_key: s.mercadopago_public_key,
      paypal_client_id: s.paypal_client_id,
      whatsapp_number: s.whatsapp_number,
      whatsapp_message: s.whatsapp_message,
      paymentMethods: methods,
      shippingInfo: {
        enabled: s.shipping_enabled || false,
        type: s.shipping_type || "free_minimum",
        minimumAmount: s.shipping_minimum_amount || 0,
        flatRate: s.shipping_flat_rate || 0,
        zonesConfig: s.shipping_zones_config || [],
      },
    };
  }, [effectiveSettings]);

  const handleAddToCart = () => {
    if (!product || isService) return;
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
    toast({ title: "Agregado al carrito", description: product.title });
  };

  const handleWhatsApp = () => {
    const number = effectiveSettings?.whatsapp_number;
    if (!number || !product) return;
    const tpl: string | undefined = effectiveSettings?.whatsapp_message;
    let text: string;
    if (isService) {
      const priceText = isQuoteOnly
        ? 'A cotizar'
        : pricingMode === 'starting_from'
          ? `Desde $${(product.price_mxn || 0).toFixed(2)} MXN`
          : `$${(product.price_mxn || 0).toFixed(2)} MXN`;
      text = tpl && tpl.trim()
        ? tpl.replace(/{producto}/gi, product.title).replace(/{precio}/gi, priceText)
        : `Hola 👋, me interesa este servicio:\n\n*${product.title}*\nPrecio: ${priceText}\n\n¿Podemos coordinar?`;
    } else {
      const finalPrice = currentPrice || product.price_mxn;
      text = `Hola 👋, me interesa este producto:\n\n*${product.title}*\nPrecio: $${finalPrice.toFixed(2)} MXN\n\n¿Está disponible?`;
    }
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className={`${theme.pageBg} ${theme.fontFamily} min-h-screen flex items-center justify-center`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-10 w-10 border-b-2 border-current mx-auto mb-3 ${theme.textPrimary}`}></div>
          <p className={`text-sm ${theme.textSecondary}`}>Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (!tenant?.id && !storeData?.ok) {
    return <StoreNotFound domain={window.location.hostname} />;
  }

  // Header is the same shape everywhere; only its tokens change.
  const Header = (
    <header className={`${theme.headerBg} ${theme.headerBorder} sticky top-0 z-10`}>
      <div className={`${theme.containerMaxWidth} mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4`}>
        <button
          onClick={() => navigate(buildHomeUrl())}
          className={`flex items-center gap-1.5 sm:gap-2 ${theme.textPrimary} hover:opacity-70 transition-opacity text-xs sm:text-sm`}
        >
          <ArrowLeft className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">Volver a la tienda</span>
          <span className="sm:hidden">Volver</span>
        </button>
        <div className="flex-1 flex justify-center max-w-[50%]">
          <LogoDisplay
            logoUrl={effectiveSettings?.logo_url}
            logoSize={effectiveSettings?.logo_size}
            fallbackText={tenant?.name || "TIENDA"}
            disableFetch
          />
        </div>
        <button
          onClick={toggleCart}
          className={`relative p-1.5 sm:p-2 hover:opacity-70 transition-opacity ${theme.buttonRadius}`}
          aria-label="Abrir carrito"
        >
          <ShoppingCart className={`w-5 h-5 ${theme.textPrimary}`} />
          {totalItems > 0 && (
            <span className={`absolute -top-0.5 -right-0.5 ${theme.saleBg} ${theme.saleText} text-[10px] sm:text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center`}>
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );

  if (!product) {
    return (
      <div className={`${theme.pageBg} ${theme.fontFamily} min-h-screen flex flex-col`}>
        {Header}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="text-5xl sm:text-6xl mb-4">🔍</div>
            <h1 className={`text-xl sm:text-2xl font-bold mb-2 ${theme.textPrimary}`}>Producto no encontrado</h1>
            <p className={`text-sm sm:text-base mb-6 ${theme.textSecondary}`}>
              Este producto ya no está disponible o el enlace es incorrecto.
            </p>
            <button
              onClick={() => navigate(buildHomeUrl())}
              className={`px-6 py-2.5 ${theme.buttonPrimary} ${theme.buttonRadius}`}
            >
              Volver a la tienda
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasDiscount = !isVariable && !isService
    && product.sale_price_mxn > 0
    && product.sale_price_mxn < product.price_mxn;

  const hasAnyVariantStock = isVariable
    ? Array.isArray(product.variations) && product.variations.some((v: any) => Number(v.stock) > 0)
    : false;

  return (
    <div className={`${theme.pageBg} ${theme.fontFamily} ${theme.textPrimary} min-h-screen flex flex-col`}>
      {Header}

      <main className={`flex-1 ${theme.containerMaxWidth} w-full mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-10 lg:pt-12 pb-8 sm:pb-12`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 lg:gap-12">
          <div>
            <div className={`${theme.galleryAspect} overflow-hidden ${theme.buttonRadius}`}>
              <ProductImageGallery
                images={product.images || []}
                productName={product.title}
                showOutOfStock={isService ? false : (isVariable ? !hasAnyVariantStock : currentStock === 0)}
              />
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div>
              <h1 className={`${theme.headingScale} ${theme.headingFont} ${theme.textPrimary} flex items-start gap-2 sm:gap-3 flex-wrap`}>
                <span>{product.title}</span>
                {hasDiscount && (
                  <span className={`${theme.saleBg} ${theme.saleText} text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:py-1 ${theme.buttonRadius} whitespace-nowrap mt-1`}>
                    -{Math.round(((product.price_mxn - product.sale_price_mxn) / product.price_mxn) * 100)}% OFF
                  </span>
                )}
              </h1>
              {product.sku && (
                <p className={`text-[11px] sm:text-xs ${theme.textSecondary} mt-1.5 sm:mt-2`}>SKU: {product.sku}</p>
              )}
            </div>

            {product.description && (
              <div>
                <p className={`${theme.textPrimary} text-sm sm:text-base leading-relaxed whitespace-pre-line opacity-90`}>
                  {product.description}
                </p>
              </div>
            )}

            {product.features && product.features.length > 0 && (
              <div>
                <h2 className={`font-semibold ${theme.textPrimary} mb-2 text-sm sm:text-base`}>Características</h2>
                <ul className="space-y-1">
                  {product.features.map((feature: string, index: number) => (
                    <li key={index} className={`${theme.textPrimary} flex items-start text-sm sm:text-base opacity-90`}>
                      <span className={`w-1.5 h-1.5 ${theme.saleBg} rounded-full mr-2 mt-1.5 sm:mt-2 flex-shrink-0`}></span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!isService && (
              <ProductVariationSelector
                productId={product.id}
                variations={product.variations}
                onPriceChange={(price: number) => setCurrentPrice(price)}
                onStockChange={(stock: number) => setCurrentStock(stock)}
                onVariationComplete={(isComplete: boolean) => setCanAddToCart(isComplete)}
                onVariationChange={(variation: any) => setSelectedVariation(variation)}
              />
            )}

            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                {isService ? (
                  isQuoteOnly ? (
                    <span className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${theme.textPrimary} italic`}>
                      A cotizar
                    </span>
                  ) : (
                    <span className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${theme.textPrimary}`}>
                      {pricingMode === 'starting_from' ? 'Desde ' : ''}${(product.price_mxn || 0).toFixed(2)} <span className="text-base sm:text-lg font-normal opacity-60">MXN</span>
                    </span>
                  )
                ) : currentPrice > 0 ? (
                  <span className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${theme.textPrimary}`}>
                    ${currentPrice.toFixed(2)} <span className="text-base sm:text-lg font-normal opacity-60">MXN</span>
                  </span>
                ) : isVariable ? (
                  <span className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${theme.textPrimary}`}>
                    Desde ${product.price_mxn.toFixed(2)} <span className="text-base sm:text-lg font-normal opacity-60">MXN</span>
                  </span>
                ) : (
                  <span className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${theme.textPrimary}`}>
                    ${product.price_mxn.toFixed(2)} <span className="text-base sm:text-lg font-normal opacity-60">MXN</span>
                  </span>
                )}
                {hasDiscount && currentPrice === product.sale_price_mxn && (
                  <span className={`text-sm sm:text-base lg:text-lg line-through ${theme.textSecondary}`}>
                    ${product.price_mxn.toFixed(2)}
                  </span>
                )}
              </div>
              {!isService && !isVariable && currentStock > 0 && (
                <p className={`text-xs sm:text-sm ${theme.textAccent} opacity-90`}>✓ {currentStock} disponibles</p>
              )}
              {!isService && !isVariable && currentStock === 0 && (
                <p className={`text-xs sm:text-sm ${theme.textAccent}`}>Producto agotado</p>
              )}
              {!isService && isVariable && !canAddToCart && hasAnyVariantStock && (
                <p className={`text-xs sm:text-sm ${theme.textSecondary}`}>Selecciona las opciones para ver disponibilidad.</p>
              )}
              {!isService && isVariable && !hasAnyVariantStock && (
                <p className={`text-xs sm:text-sm ${theme.textAccent}`}>Sin stock en ninguna variación</p>
              )}
              {isService && (
                <p className={`text-xs sm:text-sm ${theme.textSecondary}`}>
                  {isQuoteOnly
                    ? 'Coordina precio y detalles por WhatsApp.'
                    : 'Coordina disponibilidad y detalles por WhatsApp.'}
                </p>
              )}
            </div>

            <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2">
              {isService ? (
                effectiveSettings?.whatsapp_number ? (
                  <button
                    onClick={handleWhatsApp}
                    className={`w-full ${theme.buttonPrimary} px-5 py-3 sm:py-4 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base`}
                  >
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    {product.cta_label?.trim() || 'Consultar por WhatsApp'}
                  </button>
                ) : (
                  <button
                    disabled
                    className={`w-full ${theme.buttonPrimary} px-5 py-3 sm:py-4 opacity-50 cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base`}
                  >
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    WhatsApp aún no configurado
                  </button>
                )
              ) : (
                <>
                  <button
                    onClick={handleAddToCart}
                    disabled={!canAddToCart || (!isVariable && currentStock === 0)}
                    className={`w-full ${theme.buttonPrimary} px-5 py-3 sm:py-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm sm:text-base`}
                  >
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                    {isVariable && !canAddToCart
                      ? "Selecciona opciones"
                      : (currentStock === 0 && !isVariable)
                        ? "Agotado"
                        : "Agregar al carrito"}
                  </button>

                  {effectiveSettings?.whatsapp_number && (
                    <button
                      onClick={handleWhatsApp}
                      className={`w-full ${theme.buttonSecondary} px-5 py-3 sm:py-4 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base`}
                    >
                      <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      Consultar por WhatsApp
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 sm:mt-12" />
      </main>

      <CartSidebar checkoutConfig={checkoutConfig} />
    </div>
  );
};

export default ProductDetail;
