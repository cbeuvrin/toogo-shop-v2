// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { X, ShoppingCart, MessageCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { ProductImageGallery } from "@/components/ui/product-image-gallery";
import { ProductVariationSelector } from "@/components/ui/ProductVariationSelector";
import { getProductDetailTheme } from "./themes";

/**
 * Themed product detail modal used by all 10 storefront templates.
 * Click on a product card opens this modal (no page navigation).
 * Direct visits to /product/:slug still hit the page version,
 * which uses the same themes.ts and renders the same content.
 */

interface ProductDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any | null;
  effectiveSettings: any;
}

export const ProductDetailModal = ({
  open,
  onOpenChange,
  product,
  effectiveSettings,
}: ProductDetailModalProps) => {
  const theme = useMemo(
    () => getProductDetailTheme(effectiveSettings?.template_id),
    [effectiveSettings?.template_id]
  );
  const { addItem } = useCart();
  const { toast } = useToast();

  // Normalize images from RPC shape ({id,url,sort}) to plain URL strings.
  const images = useMemo(() => {
    if (!product?.images || !Array.isArray(product.images)) return [];
    return product.images
      .map((img: any) => (typeof img === "string" ? img : img?.url))
      .filter(Boolean);
  }, [product]);

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
      const sale = product.sale_price_mxn;
      const base = product.price_mxn;
      setCurrentPrice(sale > 0 && sale < base ? sale : base);
      setCurrentStock(product.stock || 0);
      setCanAddToCart((product.stock || 0) > 0);
    } else {
      setCurrentPrice(0);
      setCurrentStock(0);
      setCanAddToCart(false);
    }
    setSelectedVariation(null);
  }, [product, isVariable, isService]);

  if (!product) return null;

  const hasDiscount = !isVariable && !isService
    && product.sale_price_mxn > 0
    && product.sale_price_mxn < product.price_mxn;

  const hasAnyVariantStock = isVariable
    ? Array.isArray(product.variations) && product.variations.some((v: any) => Number(v.stock) > 0)
    : false;

  const handleAddToCart = () => {
    if (isService) return;
    if (!canAddToCart || (!isVariable && currentStock === 0)) return;
    const finalPrice = currentPrice || product.price_mxn;
    addItem({
      id: product.id,
      title: product.title,
      price_mxn: finalPrice,
      images,
      stock: currentStock || product.stock || 0,
      variation_id: selectedVariation?.id,
      variation_data: selectedVariation ? {
        combination: selectedVariation.combination,
        sku: selectedVariation.sku,
      } : undefined,
    });
    toast({ title: "Agregado al carrito", description: product.title });
    onOpenChange(false);
  };

  const handleWhatsApp = () => {
    const number = effectiveSettings?.whatsapp_number;
    if (!number) return;
    const tpl: string | undefined = effectiveSettings?.whatsapp_message;
    let text: string;
    if (isService) {
      const priceLine = isQuoteOnly
        ? 'Precio: A cotizar'
        : pricingMode === 'starting_from'
          ? `Precio: Desde $${(product.price_mxn || 0).toFixed(2)} MXN`
          : `Precio: $${(product.price_mxn || 0).toFixed(2)} MXN`;
      text = tpl && tpl.trim()
        ? tpl
            .replace(/{producto}/gi, product.title)
            .replace(/{precio}/gi, priceLine.replace(/^Precio:\s*/, ''))
        : `Hola 👋, me interesa este servicio:\n\n*${product.title}*\n${priceLine}\n\n¿Podemos coordinar?`;
    } else {
      const finalPrice = currentPrice || product.price_mxn;
      text = `Hola 👋, me interesa este producto:\n\n*${product.title}*\nPrecio: $${finalPrice.toFixed(2)} MXN\n\n¿Está disponible?`;
    }
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${theme.pageBg} ${theme.fontFamily} ${theme.textPrimary} w-[95vw] max-w-4xl max-h-[92vh] overflow-y-auto p-0 ${theme.buttonRadius} border-0`}
      >
        <DialogTitle className="sr-only">{product.title}</DialogTitle>
        <DialogClose asChild>
          <button
            className={`absolute top-3 right-3 z-20 w-8 h-8 ${theme.buttonRadius} ${theme.surfaceBg} hover:opacity-80 flex items-center justify-center`}
            aria-label="Cerrar"
          >
            <X className={`w-4 h-4 ${theme.textPrimary}`} />
          </button>
        </DialogClose>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8">
          <div>
            {/* The theme's aspect goes straight to the gallery's main image so the
                photo FILLS it (no empty gap below, e.g. square image inside
                Indico's 3:4 box used to leave ~25% dead space at the bottom). */}
            <ProductImageGallery
              images={images}
              productName={product.title}
              showOutOfStock={isService ? false : (isVariable ? !hasAnyVariantStock : currentStock === 0)}
              mainClassName={`${theme.galleryAspect} ${theme.buttonRadius}`}
            />
          </div>

          <div className="space-y-3 sm:space-y-5">
            <div>
              <h2 className={`${theme.headingScale} ${theme.headingFont} ${theme.textPrimary} flex items-start gap-2 sm:gap-3 flex-wrap`}>
                <span>{product.title}</span>
                {hasDiscount && (
                  <span className={`${theme.saleBg} ${theme.saleText} text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:py-1 ${theme.buttonRadius} whitespace-nowrap mt-1`}>
                    -{Math.round(((product.price_mxn - product.sale_price_mxn) / product.price_mxn) * 100)}% OFF
                  </span>
                )}
              </h2>
              {product.sku && (
                <p className={`text-[11px] sm:text-xs ${theme.textSecondary} mt-1.5`}>SKU: {product.sku}</p>
              )}
            </div>

            {product.description && (
              <p className={`${theme.textPrimary} text-sm sm:text-base leading-relaxed whitespace-pre-line opacity-90`}>
                {product.description}
              </p>
            )}

            {product.features && product.features.length > 0 && (
              <div>
                <h3 className={`font-semibold ${theme.textPrimary} mb-1.5 text-sm`}>Características</h3>
                <ul className="space-y-1">
                  {product.features.map((feature: string, index: number) => (
                    <li key={index} className={`${theme.textPrimary} flex items-start text-sm opacity-90`}>
                      <span className={`w-1.5 h-1.5 ${theme.saleBg} rounded-full mr-2 mt-1.5 flex-shrink-0`}></span>
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

            <div className="space-y-1">
              <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                {isService ? (
                  isQuoteOnly ? (
                    <span className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${theme.textPrimary} italic`}>
                      A cotizar
                    </span>
                  ) : (
                    <span className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${theme.textPrimary}`}>
                      {pricingMode === 'starting_from' ? 'Desde ' : ''}${(product.price_mxn || 0).toFixed(2)} <span className="text-sm sm:text-base font-normal opacity-60">MXN</span>
                    </span>
                  )
                ) : currentPrice > 0 ? (
                  <span className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${theme.textPrimary}`}>
                    ${currentPrice.toFixed(2)} <span className="text-sm sm:text-base font-normal opacity-60">MXN</span>
                  </span>
                ) : isVariable ? (
                  <span className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${theme.textPrimary}`}>
                    Desde ${product.price_mxn.toFixed(2)} <span className="text-sm sm:text-base font-normal opacity-60">MXN</span>
                  </span>
                ) : (
                  <span className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${theme.textPrimary}`}>
                    ${product.price_mxn.toFixed(2)} <span className="text-sm sm:text-base font-normal opacity-60">MXN</span>
                  </span>
                )}
                {hasDiscount && currentPrice === product.sale_price_mxn && (
                  <span className={`text-sm sm:text-base line-through ${theme.textSecondary}`}>
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
              {isService && (
                <p className={`text-xs sm:text-sm ${theme.textSecondary}`}>
                  {isQuoteOnly
                    ? 'Coordina precio y detalles por WhatsApp.'
                    : 'Coordina disponibilidad y detalles por WhatsApp.'}
                </p>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
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
      </DialogContent>
    </Dialog>
  );
};
