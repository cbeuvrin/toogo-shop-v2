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
import { useState } from "react";

// Template Switcher Component — 10 templates available
const TemplateRenderer = (props: any) => {
  const { effectiveSettings } = props;
  const templateId = effectiveSettings?.template_id || 'default';

  switch (templateId) {
    case 'simple_live':
    case 'sidebar': // Backwards compatibility if DB still has 'sidebar'
      return <SimpleLiveTemplate {...props} welcomeTitle={props.hero?.title} welcomeMessage={props.hero?.message} featuredProducts={props.featuredProducts} />;
    case 'minimal':
      return <MinimalTemplate {...props} />;
    case 'fashion_hero':
      return <FashionHeroTemplate {...props} welcomeTitle={props.hero?.title} welcomeMessage={props.hero?.message} cta1Label={props.hero?.cta1Label} cta2Label={props.hero?.cta2Label} eyebrowText={props.hero?.eyebrowText} heroStyles={props.hero?.styles} featuredProducts={props.featuredProducts} />;
    case 'trendy_fashion':
      return <TrendyFashionTemplate {...props} welcomeTitle={props.hero?.title} welcomeMessage={props.hero?.message} heroShape={props.hero?.shape} heroShapeScale={props.hero?.scale} banners={props.banners} contactData={props.contact} announcement={props.announcement} ticker={props.ticker} />;
    case 'fashion':
      return <FashionTemplate {...props} welcomeTitle={props.hero?.title} welcomeMessage={props.hero?.message} banners={props.banners} contactData={props.contact} announcement={props.announcement} ticker={props.ticker} />;
    case 'nature':
      return <NatureTemplate {...props} welcomeTitle={props.hero?.title} welcomeMessage={props.hero?.message} featuredProducts={props.featuredProducts} />;
    case 'premium_brand':
      return <PremiumBrandTemplate {...props} welcomeTitle={props.hero?.title} welcomeMessage={props.hero?.message} banners={props.banners} contactData={props.contact} announcement={props.announcement} ticker={props.ticker} testimonials={props.testimonials} />;
    case 'bauhaus':
      return <BauhausTemplate {...props} welcomeTitle={props.hero?.title} welcomeMessage={props.hero?.message} banners={props.banners} contactData={props.contact} announcement={props.announcement} ticker={props.ticker} />;
    case 'cyber':
      return <CyberTemplate {...props} welcomeTitle={props.hero?.title} welcomeMessage={props.hero?.message} banners={props.banners} contactData={props.contact} announcement={props.announcement} ticker={props.ticker} />;
    default:
      return <DefaultTemplate {...props} />;
  }
};

const Tienda = () => {
  const store = useToogoStore();
  const { isLoading, storeData, forcedTenantId, hostname, hostOverride, effectiveSettings } = store;

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