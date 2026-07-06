import { useToogoStore } from "@/hooks/store/useToogoStore";
import { DefaultTemplate } from "@/templates/layouts/DefaultTemplate/DefaultTemplate";
import { SimpleLiveTemplate } from "@/templates/layouts/SimpleLiveTemplate/SimpleLiveTemplate";
import { MinimalTemplate } from "@/templates/layouts/MinimalTemplate/MinimalTemplate";
import { FashionHeroTemplate } from "@/templates/layouts/FashionHeroTemplate/FashionHeroTemplate";
import { TrendyFashionTemplate } from "@/templates/layouts/TrendyFashionTemplate/TrendyFashionTemplate";
import { FashionTemplate } from "@/templates/layouts/FashionTemplate/FashionTemplate";
import { NatureTemplate } from "@/templates/layouts/NatureTemplate/NatureTemplate";
import { PremiumBrandTemplate } from "@/templates/layouts/PremiumBrandTemplate/PremiumBrandTemplate";
import { BauhausTemplate } from "@/templates/layouts/BauhausTemplate/BauhausTemplate";
import { CyberTemplate } from "@/templates/layouts/CyberTemplate/CyberTemplate";
import { StoreNotFound } from "./StoreNotFound";
import { ProductDetailModal } from "@/templates/productDetail/ProductDetailModal";
import { CardStyleContext } from "@/contexts/CardStyleContext";
import { heroFontFamily } from "@/lib/heroFonts";
import { useDeviceType, pickFontSize, pickEnabled, pickImage, pickPosition } from "@/hooks/useDeviceType";
import { useState } from "react";
import { useFavicon } from "@/hooks/useFavicon";

// Template Switcher Component — 10 templates available
const TemplateRenderer = (props: any) => {
  const { effectiveSettings } = props;
  const templateId = effectiveSettings?.template_id || 'default';

  // Resolve per-device font sizes (fontSize / fontSizeTablet / fontSizeMobile)
  // down to a single `fontSize` for the actual viewport, so templates need no
  // changes — they keep reading heroStyles[k].fontSize.
  const device = useDeviceType();
  const rawStyles = props.hero?.styles || {};
  const resolvedStyles: Record<string, any> = {};
  for (const k in rawStyles) {
    resolvedStyles[k] = { ...rawStyles[k], fontSize: pickFontSize(rawStyles[k], device), enabled: pickEnabled(rawStyles[k], device) };
  }
  // Per-device banner image + crop: resolve each banner's image/position for the
  // current device (with desktop fallback), so templates keep reading the same fields.
  const resolvedBanners = (props.banners || []).map((b: any) => {
    const img = pickImage(b, device);
    return { ...b, image: img, imageUrl: img, position: pickPosition(b, device) };
  });

  // Indico-level editing plumbing, shared by EVERY template: per-element text
  // styles (hero.styles[key]) and per-section backgrounds (hero.sectionBg[key]).
  // All values are optional overrides — a template that doesn't read them yet,
  // or a store that never edited them, renders its default look unchanged.
  const editable = {
    welcomeTitle: props.hero?.title,
    welcomeMessage: props.hero?.message,
    cta1Label: props.hero?.cta1Label,
    cta2Label: props.hero?.cta2Label,
    eyebrowText: props.hero?.eyebrowText,
    heroStyles: resolvedStyles,
    banners: resolvedBanners,
    sectionBg: props.hero?.sectionBg,
    hamburgerCount: props.hero?.hamburgerCount,
    hamburgerThickness: props.hero?.hamburgerThickness,
    hamburgerSize: props.hero?.hamburgerSize,
  };

  const cardText = props.hero?.styles?.productCardText;
  const cardSize = pickFontSize(cardText, device);
  const cardStyle = (cardText?.fontFamily || cardSize)
    ? { fontFamily: heroFontFamily(cardText?.fontFamily), fontSize: cardSize ? `${cardSize}px` : undefined }
    : undefined;
  const content = (() => {
  switch (templateId) {
    case 'simple_live':
    case 'sidebar': // Backwards compatibility if DB still has 'sidebar'
      return <SimpleLiveTemplate {...props} {...editable} featuredProducts={props.featuredProducts} />;
    case 'minimal':
      return <MinimalTemplate {...props} {...editable} />;
    case 'fashion_hero':
      return <FashionHeroTemplate {...props} {...editable} hamburgerCount={props.hero?.hamburgerCount} hamburgerThickness={props.hero?.hamburgerThickness} hamburgerSize={props.hero?.hamburgerSize} featuredProducts={props.featuredProducts} />;
    case 'trendy_fashion':
      return <TrendyFashionTemplate {...props} {...editable} heroShape={props.hero?.shape} heroShapeScale={props.hero?.scale} banners={resolvedBanners} contactData={props.contact} announcement={props.announcement} ticker={props.ticker} />;
    case 'fashion':
      return <FashionTemplate {...props} {...editable} banners={resolvedBanners} contactData={props.contact} announcement={props.announcement} ticker={props.ticker} textBanner={props.textBanner} />;
    case 'nature':
      return <NatureTemplate {...props} {...editable} featuredProducts={props.featuredProducts} />;
    case 'premium_brand':
      return <PremiumBrandTemplate {...props} {...editable} banners={resolvedBanners} contactData={props.contact} announcement={props.announcement} ticker={props.ticker} testimonials={props.testimonials} />;
    case 'bauhaus':
      return <BauhausTemplate {...props} {...editable} banners={resolvedBanners} contactData={props.contact} announcement={props.announcement} ticker={props.ticker} />;
    case 'cyber':
      return <CyberTemplate {...props} {...editable} banners={resolvedBanners} contactData={props.contact} announcement={props.announcement} ticker={props.ticker} textBanner={props.textBanner} featuredProducts={props.featuredProducts} featuredProducts2={props.featuredProducts2} />;
    default:
      return <DefaultTemplate {...props} {...editable} />;
  }
  })();
  return <CardStyleContext.Provider value={{ style: cardStyle }}>{content}</CardStyleContext.Provider>;
};

const Tienda = () => {
  const store = useToogoStore();
  const { isLoading, storeData, forcedTenantId, hostname, hostOverride, effectiveSettings } = store;

  // Favicon con el logo de la tienda (solo planes de pago), igual que en el catálogo
  useFavicon({
    logoUrl: effectiveSettings?.logo_url,
    plan: store.tenant?.plan
  });

  const [modalProduct, setModalProduct] = useState<any | null>(null);
  const handleProductClick = (product: any) => setModalProduct(product);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tienda...</p>
        </div>
      </div>
    );
  }

  // Same Logic for "Store Not Found" as before
  if (!store.tenant?.id && !storeData?.ok) {
    const isSandbox = hostname.includes('lovable') || hostname.includes('localhost');
    const isTenantNotFound = storeData?.error === 'tenant_not_found' || !storeData;

    if (isSandbox && isTenantNotFound && !forcedTenantId && !hostOverride) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md text-center space-y-4">
            <div className="text-6xl">🏪</div>
            <h1 className="text-2xl font-bold">Vista Previa del Editor</h1>
            <p className="text-muted-foreground">Para previsualizar, añade ?host=tu-dominio.toogo.store</p>
          </div>
        </div>
      );
    }
    return <StoreNotFound domain={hostname} />;
  }

  // Pass ALL store state and actions to the renderer + the modal opener.
  // Templates use onProductClick (falls back to /product/:slug nav if absent).
  return (
    <>
      <TemplateRenderer {...store} onProductClick={handleProductClick} />
      <ProductDetailModal
        open={!!modalProduct}
        onOpenChange={(open) => { if (!open) setModalProduct(null); }}
        product={modalProduct}
        effectiveSettings={effectiveSettings}
      />
    </>
  );
};


export default Tienda;