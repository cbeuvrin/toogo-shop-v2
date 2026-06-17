// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingCart, Search, Menu, X, User, Zap, ChevronRight } from 'lucide-react';
import { useCart } from "@/contexts/CartContext";
import { useCardStyle } from "@/contexts/CardStyleContext";
import { LogoDisplay } from "@/components/ui/LogoDisplay";
import { CheckoutModal } from "@/components/cart/CheckoutModal";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { heroFontFamily } from "@/lib/heroFonts";
import { storeDisplayName } from "@/utils/storeDisplayName";

export const CyberTemplate = (props: any) => {
    const {
        storeData,
        products,
        categories,
        addToCart,
        effectiveSettings,
        banners,
        contactData,
        announcement,
        ticker,
        view = 'home',
        products: catalogProducts
    } = props;

    const settings = effectiveSettings || storeData?.settings || {};
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const hideNav = useHideOnScroll();

    const { items: cartItems, removeItem, updateQuantity, totalPrice: cartTotal } = useCart();
    const cartCount = cartItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);

    const handleNavigate = (path: string, params: Record<string, string> = {}) => {
        const newParams = new URLSearchParams();
        const currentUrlParams = new URLSearchParams(window.location.search);
        const host = searchParams.get('host') || currentUrlParams.get('host');
        if (host) newParams.set('host', host);
        Object.entries(params).forEach(([key, value]) => {
            if (value) newParams.set(key, value);
        });
        const queryString = newParams.toString();
        navigate(`${path}${queryString ? `?${queryString}` : ''}`);
    };

    const isCatalog = view === 'catalog';
    // Home grid: hand-picked featured products when chosen in the editor,
    // otherwise the first products as fallback.
    const featuredIds = props.featuredProducts;
    const homeProducts = (featuredIds && featuredIds.length > 0)
        ? featuredIds.map((id: string) => (products || []).find((p: any) => p.id === id)).filter(Boolean)
        : (products || []).slice(0, 8);
    const displayProducts = isCatalog ? (catalogProducts || []) : homeProducts;
    // "Otros productos": hand-picked via a second product selector, or the next
    // batch not already shown in the main grid as fallback.
    const homeIds = new Set(homeProducts.map((p: any) => p?.id));
    const featured2 = props.featuredProducts2;
    const otherProducts = (featured2 && featured2.length > 0)
        ? featured2.map((id: string) => (products || []).find((p: any) => p.id === id)).filter(Boolean)
        : (products || []).filter((p: any) => !homeIds.has(p.id)).slice(0, 8);

    // Cyber palette — neon on dark
    const cyberBg = settings?.store_background_color || '#0A0A14';
    const cyberSurface = '#13131E';
    const cyberBorder = '#2A2A3E';
    const cyberNeon = settings?.primary_color || '#00F5FF';
    const cyberMagenta = settings?.secondary_color || '#FF00E5';
    const cyberText = '#E8E8F0';
    const cyberMuted = '#8888A0';

    const heroTitle = props.welcomeTitle || settings?.welcome_title || 'FUTURO\nDIGITAL.\nDISEÑADO\nHOY.';
    const heroMessage = props.welcomeMessage || settings?.welcome_message || 'Productos del mañana. Tecnología que se adelanta. Bienvenido al perímetro.';

    const heroBanner = banners?.[0];
    const topCategories = categories?.filter((c: any) => !c.parent_id && c.show_on_home !== false).slice(0, 5) || [];

    const tickerText = ticker?.text || announcement?.text || '◢ NUEVA TEMPORADA  ◢ ENVÍO INMEDIATO  ◢ 100% GARANTIZADO  ◢ COMPRA SEGURA';

    // Indico-level per-element styles (hero.styles[key]) + per-section backgrounds.
    const els = props.heroStyles || {};
    const { style: cardTextStyle } = useCardStyle();
    const styleFor = (k: string) => {
        const e = els?.[k] || {};
        const st: any = {};
        if (e.fontFamily) st.fontFamily = heroFontFamily(e.fontFamily);
        if (e.fontSize) st.fontSize = `${e.fontSize}px`;
        if (e.color) st.color = e.color;
        if (e.bgColor) st.backgroundColor = e.bgColor;
        return st;
    };
    const ctaClick = (k: string) => () => {
        const cfg = els?.[k] || {};
        if (cfg.action === 'link' && cfg.customUrl) { window.open(cfg.customUrl, '_blank', 'noopener,noreferrer'); return; }
        if (cfg.action === 'category' && cfg.categorySlug) { handleNavigate('/catalogo', { category: cfg.categorySlug }); return; }
        handleNavigate('/catalogo');
    };
    const elText = (k: string, fallback: string) => els?.[k]?.text || fallback;


    return (
        <div className="min-h-screen font-sans" style={{ backgroundColor: cyberBg, color: cyberText, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>

            {/* Top ticker — animated marquee or static centered text */}
            {announcement?.enabled !== false && (
                <div className="overflow-hidden border-b" style={{ borderColor: cyberBorder, backgroundColor: ticker?.bgColor || cyberSurface }}>
                    {ticker?.animated === false ? (
                        <div className="flex justify-center whitespace-nowrap py-2">
                            <span
                                className={`font-bold tracking-[0.2em] mx-8 ${ticker?.fontSize ? '' : 'text-xs'}`}
                                style={{ color: ticker?.textColor || cyberNeon, ...(ticker?.fontSize ? { fontSize: `${ticker.fontSize}px` } : {}) }}
                            >
                                {tickerText}
                            </span>
                        </div>
                    ) : (
                        <div className="flex animate-marquee whitespace-nowrap py-2">
                            {[...Array(4)].map((_, i) => (
                                <span
                                    key={i}
                                    className={`font-bold tracking-[0.2em] mx-8 ${ticker?.fontSize ? '' : 'text-xs'}`}
                                    style={{ color: ticker?.textColor || cyberNeon, ...(ticker?.fontSize ? { fontSize: `${ticker.fontSize}px` } : {}) }}
                                >
                                    {tickerText}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Header — glassmorphic */}
            <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${hideNav ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`} style={{ backgroundColor: props.sectionBg?.navbar || settings?.navbar_bg_color || `${cyberBg}cc`, borderColor: cyberBorder }}>
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <button className="md:hidden" onClick={() => setIsMenuOpen(true)}>
                        <Menu className="w-6 h-6" style={{ color: cyberNeon }} />
                    </button>

                    <div className="cursor-pointer flex items-center gap-2" onClick={() => handleNavigate('/tienda')}>
                        <LogoDisplay
                            logoUrl={settings?.logo_url}
                            fallbackText={settings?.store_name || 'CYBER'}
                            disableFetch={true}
                        logoSize={settings?.logo_size}
                        logoSizeMobile={(settings as any)?.logo_size_mobile}
                        logoSizeTablet={(settings as any)?.logo_size_tablet}
                            className="text-xl md:text-2xl font-black tracking-[0.15em] uppercase"
                        />
                    </div>

                    <nav className="hidden md:flex items-center gap-8 text-xs font-bold tracking-[0.15em] uppercase" style={styleFor('navMenu')}>
                        {(topCategories.length > 0 ? topCategories : [{ name: 'Catálogo' }, { name: 'Drops' }, { name: 'Tech' }]).map((cat: any, i: number) => (
                            <button
                                key={i}
                                onClick={() => cat.id ? handleNavigate('/catalogo', { category: cat.name.toLowerCase() }) : handleNavigate('/catalogo')}
                                className="relative group"
                                style={{ color: cyberText }}
                            >
                                <span className="relative z-10 group-hover:opacity-100 transition-opacity">{cat.name}</span>
                                <span className="absolute inset-x-0 -bottom-1 h-px scale-x-0 group-hover:scale-x-100 transition-transform origin-left" style={{ backgroundColor: cyberNeon, boxShadow: `0 0 6px ${cyberNeon}` }} />
                            </button>
                        ))}
                    </nav>

                    <div className="flex items-center gap-4">
                        <Search className="hidden md:block w-5 h-5 cursor-pointer hover:opacity-70" style={{ color: cyberText }} />
                        <User className="hidden md:block w-5 h-5 cursor-pointer hover:opacity-70" style={{ color: cyberText }} />
                        <button onClick={() => setIsCartOpen(true)} className="relative">
                            <ShoppingCart className="w-5 h-5" style={{ color: cyberText }} />
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full" style={{ backgroundColor: cyberMagenta, color: '#fff', boxShadow: `0 0 8px ${cyberMagenta}` }}>
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* HERO — glow + gradient + grid */}
            {!isCatalog && (
                <section className="relative overflow-hidden" style={{ backgroundColor: props.sectionBg?.hero || undefined }}>
                    {/* Background grid */}
                    <div className="absolute inset-0 opacity-[0.07]" style={{
                        backgroundImage: `linear-gradient(${cyberText} 1px, transparent 1px), linear-gradient(90deg, ${cyberText} 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }} />
                    {/* Radial glow */}
                    <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ backgroundColor: cyberNeon }} />
                    <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ backgroundColor: cyberMagenta }} />

                    <div className="relative container mx-auto px-6 py-20 md:py-32">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div>
                                {els?.heroBadge?.enabled !== false && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-6 text-xs tracking-[0.3em] uppercase" style={{ borderColor: cyberNeon, color: cyberNeon, ...styleFor('heroBadge') }}>
                                    {els?.heroBadge?.text || 'SYSTEM ONLINE'}
                                </div>
                                )}
                                <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight uppercase whitespace-pre-line break-words mb-6"
                                    style={els?.title?.color ? styleFor('title') : {
                                        background: `linear-gradient(135deg, ${cyberText} 0%, ${cyberNeon} 50%, ${cyberMagenta} 100%)`,
                                        WebkitBackgroundClip: 'text',
                                        backgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        ...styleFor('title'),
                                    }}
                                >
                                    {heroTitle}
                                </h1>
                                <p className="text-base md:text-lg mb-8 max-w-md leading-relaxed" style={{ color: cyberMuted, ...styleFor('message') }}>{heroMessage}</p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    {(els?.cta1?.enabled !== false) && (
                                    <button
                                        onClick={ctaClick('cta1')}
                                        className="group relative px-8 py-4 text-sm font-bold tracking-widest uppercase overflow-hidden transition-all hover:scale-[1.02]"
                                        style={{
                                            background: els?.cta1?.bgColor || `linear-gradient(135deg, ${cyberNeon} 0%, ${cyberMagenta} 100%)`,
                                            color: cyberBg,
                                            boxShadow: `0 0 30px ${cyberNeon}40`,
                                            ...styleFor('cta1'),
                                        }}
                                    >
                                        <span className="relative z-10 flex items-center gap-2">{props.cta1Label || 'Explorar drops'} <ChevronRight className="w-4 h-4" /></span>
                                    </button>
                                    )}
                                    {(els?.cta2?.enabled !== false) && (
                                    <button
                                        onClick={ctaClick('cta2')}
                                        className="px-8 py-4 text-sm font-bold tracking-widest uppercase border transition-all hover:bg-white/5"
                                        style={{ borderColor: cyberBorder, color: cyberText, ...styleFor('cta2') }}
                                    >
                                        {props.cta2Label || 'Ver catálogo'}
                                    </button>
                                    )}
                                </div>

                                {/* Stats line — editable values/labels; whole block hideable via stat1 */}
                                {(els?.stat1?.enabled !== false) && (
                                <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-12 pt-8 border-t" style={{ borderColor: cyberBorder }}>
                                    <div>
                                        <div className="text-2xl font-black" style={{ color: cyberNeon, ...styleFor('stat1') }}>{elText('stat1', '24/7')}</div>
                                        <div className="text-[10px] tracking-widest uppercase" style={{ color: cyberMuted, ...styleFor('statLabel1') }}>{elText('statLabel1', 'Soporte')}</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black" style={{ color: cyberMagenta, ...styleFor('stat2') }}>{elText('stat2', '100%')}</div>
                                        <div className="text-[10px] tracking-widest uppercase" style={{ color: cyberMuted, ...styleFor('statLabel2') }}>{elText('statLabel2', 'Garantía')}</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black" style={{ color: cyberNeon, ...styleFor('stat3') }}>{elText('stat3', 'FAST')}</div>
                                        <div className="text-[10px] tracking-widest uppercase" style={{ color: cyberMuted, ...styleFor('statLabel3') }}>{elText('statLabel3', 'Envíos')}</div>
                                    </div>
                                </div>
                                )}
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 rounded-2xl blur-2xl opacity-40" style={{
                                    background: `linear-gradient(135deg, ${cyberNeon} 0%, ${cyberMagenta} 100%)`
                                }} />
                                <div className="relative aspect-video rounded-2xl overflow-hidden border-2" style={{ borderColor: cyberBorder, backgroundColor: cyberSurface }}>
                                    {heroBanner ? (
                                        <img src={heroBanner.imageUrl || heroBanner.image} alt="Hero" className="w-full h-full object-contain lg:object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center" style={{
                                            background: `linear-gradient(135deg, ${cyberBg} 0%, ${cyberSurface} 100%)`
                                        }}>
                                            <div className="text-center">
                                                <div className="w-32 h-32 mx-auto mb-4 rounded-full opacity-40" style={{
                                                    background: `linear-gradient(135deg, ${cyberNeon} 0%, ${cyberMagenta} 100%)`,
                                                    filter: 'blur(2px)'
                                                }} />
                                                <p className="text-xs tracking-widest uppercase" style={{ color: cyberMuted }}>Hero Banner</p>
                                            </div>
                                        </div>
                                    )}
                                    {/* Corner brackets */}
                                    <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2" style={{ borderColor: cyberNeon }} />
                                    <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2" style={{ borderColor: cyberNeon }} />
                                    <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2" style={{ borderColor: cyberMagenta }} />
                                    <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2" style={{ borderColor: cyberMagenta }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Products */}
            <section style={{ backgroundColor: props.sectionBg?.section1 || undefined }}>
            <div className="container mx-auto px-6 py-16 md:py-24">
                <div className="flex items-end justify-between mb-12">
                    <div>
                        <div className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: cyberNeon, ...styleFor('sectionEyebrow1') }}>{els?.sectionEyebrow1?.text || 'PRODUCTS'}</div>
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight" style={styleFor('sectionTitle1')}>{isCatalog ? 'Catálogo' : elText('sectionTitle1', 'Drops activos')}</h2>
                    </div>
                    {!isCatalog && (
                        <button
                            onClick={() => handleNavigate('/catalogo')}
                            className="hidden md:flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase hover:opacity-80"
                            style={{ color: cyberNeon }}
                        >
                            Ver todo <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {displayProducts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {displayProducts.map((product: any) => {
                            const isService = product.product_type === 'service';
                            const pricingMode = isService ? (product.pricing_mode || 'fixed') : 'fixed';
                            const isQuoteOnly = isService && pricingMode === 'quote';
                            const image = (product.images?.[0] && typeof product.images[0] === 'object') ? product.images[0].url : (product.images?.[0] || product.image || '/placeholder.svg');
                            const price = !isService ? (product.sale_price_mxn || product.price_mxn || product.price || 0) : (product.price_mxn || product.price || 0);
                            const onSale = !isService && product.sale_price_mxn !== null && product.sale_price_mxn !== undefined;
                            return (
                                <div
                                    key={product.id}
                                    className="group cursor-pointer rounded-xl overflow-hidden border transition-all hover:border-opacity-100"
                                    style={{ borderColor: cyberBorder, backgroundColor: cyberSurface }}
                                    onClick={() => (props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`))}
                                >
                                    <div className="relative aspect-square overflow-hidden">
                                        <img src={image} alt={product.title || product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {onSale && (
                                            <span className="absolute top-2 left-2 px-2 py-1 text-[10px] font-bold tracking-widest uppercase rounded" style={{
                                                background: `linear-gradient(135deg, ${cyberMagenta} 0%, ${cyberNeon} 100%)`,
                                                color: cyberBg
                                            }}>OFERTA</span>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-sm font-bold uppercase tracking-tight line-clamp-1 mb-1" style={cardTextStyle}>{product.title || product.name}</h3>
                                        <div className="flex items-center justify-between">
                                            {isQuoteOnly ? (
                                                <span className="text-base font-black italic" style={{ color: cyberNeon }}>A cotizar</span>
                                            ) : isService && pricingMode === 'starting_from' ? (
                                                <span className="text-base font-black" style={{ color: cyberNeon }}>Desde ${Number(price).toFixed(0)} MXN</span>
                                            ) : isService ? (
                                                <span className="text-base font-black" style={{ color: cyberNeon }}>${Number(price).toFixed(0)} MXN</span>
                                            ) : (
                                                <span className="text-base font-black" style={{ color: cyberNeon }}>{product.priceVaries ? 'Desde ' : ''}${Number(price).toFixed(0)}</span>
                                            )}
                                            {!isService && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const isVar = Array.isArray(product.variations) && product.variations.length > 0;
                                                        if (isVar) { props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`); }
                                                        else { addToCart(product); }
                                                    }}
                                                    className="text-[10px] font-bold tracking-widest uppercase opacity-60 hover:opacity-100"
                                                    style={{ color: cyberMagenta }}
                                                >
                                                    {(Array.isArray(product.variations) && product.variations.length > 0) ? 'OPC.' : '+ ADD'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-20 text-center" style={{ color: cyberMuted }}>
                        <p>// No hay productos disponibles</p>
                    </div>
                )}
            </div>
            </section>

            {/* CTA banner — background image uploadable via textBanner */}
            {!isCatalog && (els?.newsletter?.enabled !== false) && (
                <section style={{ backgroundColor: props.sectionBg?.section2 || undefined }}>
                <div className="container mx-auto px-6 py-16">
                    <div
                        className="relative overflow-hidden rounded-2xl p-8 md:p-16 border bg-contain lg:bg-cover bg-center bg-no-repeat"
                        style={{
                            borderColor: cyberBorder,
                            backgroundColor: cyberSurface,
                            backgroundImage: props.textBanner?.imageUrl ? `url(${props.textBanner.imageUrl})` : undefined,
                            backgroundPosition: props.textBanner?.imagePosition || '50% 50%',
                        }}
                    >
                        {props.textBanner?.imageUrl ? (
                            <div className="absolute inset-0" style={{ backgroundColor: `${cyberBg}99` }} />
                        ) : (
                            <div className="absolute inset-0 opacity-30" style={{
                                background: `radial-gradient(circle at 20% 50%, ${cyberNeon}40 0%, transparent 50%), radial-gradient(circle at 80% 50%, ${cyberMagenta}40 0%, transparent 50%)`
                            }} />
                        )}
                        <div className="relative text-center max-w-2xl mx-auto">
                            <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4" style={styleFor('newsletterTitle')}>
                                {els?.newsletterTitle?.text || 'Sé el primero en saber.'}
                            </h3>
                            <p style={{ color: cyberMuted, ...styleFor('newsletterText') }}>{elText('newsletterText', 'Drops exclusivos. Ofertas anticipadas. Cero spam.')}</p>
                        </div>
                    </div>
                </div>
                </section>
            )}

            {/* Otros productos — second grid below the banner */}
            {!isCatalog && otherProducts.length > 0 && (
                <section style={{ backgroundColor: props.sectionBg?.section3 || undefined }}>
                <div className="container mx-auto px-6 pb-16 md:pb-24">
                    <div className="mb-12">
                        <div className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: cyberNeon, ...styleFor('sectionEyebrow3') }}>{els?.sectionEyebrow3?.text || 'MÁS'}</div>
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight" style={styleFor('sectionTitle3')}>{elText('sectionTitle3', 'También te puede interesar')}</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {otherProducts.map((product: any) => {
                            const isService = product.product_type === 'service';
                            const pricingMode = isService ? (product.pricing_mode || 'fixed') : 'fixed';
                            const isQuoteOnly = isService && pricingMode === 'quote';
                            const image = (product.images?.[0] && typeof product.images[0] === 'object') ? product.images[0].url : (product.images?.[0] || product.image || '/placeholder.svg');
                            const price = !isService ? (product.sale_price_mxn || product.price_mxn || product.price || 0) : (product.price_mxn || product.price || 0);
                            const onSale = !isService && product.sale_price_mxn !== null && product.sale_price_mxn !== undefined;
                            return (
                                <div
                                    key={product.id}
                                    className="group cursor-pointer rounded-xl overflow-hidden border transition-all hover:border-opacity-100"
                                    style={{ borderColor: cyberBorder, backgroundColor: cyberSurface }}
                                    onClick={() => (props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`))}
                                >
                                    <div className="relative aspect-square overflow-hidden">
                                        <img src={image} alt={product.title || product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {onSale && (
                                            <span className="absolute top-2 left-2 px-2 py-1 text-[10px] font-bold tracking-widest uppercase rounded" style={{
                                                background: `linear-gradient(135deg, ${cyberMagenta} 0%, ${cyberNeon} 100%)`,
                                                color: cyberBg
                                            }}>OFERTA</span>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-sm font-bold uppercase tracking-tight line-clamp-1 mb-1" style={cardTextStyle}>{product.title || product.name}</h3>
                                        <div className="flex items-center justify-between">
                                            {isQuoteOnly ? (
                                                <span className="text-base font-black italic" style={{ color: cyberNeon }}>A cotizar</span>
                                            ) : isService && pricingMode === 'starting_from' ? (
                                                <span className="text-base font-black" style={{ color: cyberNeon }}>Desde ${Number(price).toFixed(0)} MXN</span>
                                            ) : isService ? (
                                                <span className="text-base font-black" style={{ color: cyberNeon }}>${Number(price).toFixed(0)} MXN</span>
                                            ) : (
                                                <span className="text-base font-black" style={{ color: cyberNeon }}>{product.priceVaries ? 'Desde ' : ''}${Number(price).toFixed(0)}</span>
                                            )}
                                            {!isService && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const isVar = Array.isArray(product.variations) && product.variations.length > 0;
                                                        if (isVar) { props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`); }
                                                        else { addToCart(product); }
                                                    }}
                                                    className="text-[10px] font-bold tracking-widest uppercase opacity-60 hover:opacity-100"
                                                    style={{ color: cyberMagenta }}
                                                >
                                                    {(Array.isArray(product.variations) && product.variations.length > 0) ? 'OPC.' : '+ ADD'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                </section>
            )}

            {/* Footer */}
            <footer className="border-t mt-12" style={{ borderColor: cyberBorder, backgroundColor: props.sectionBg?.footer || cyberSurface }}>
                <div className="container mx-auto px-6 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <LogoDisplay
                                    logoUrl={settings?.logo_url}
                                    fallbackText={settings?.store_name || 'CYBER'}
                                    disableFetch={true}
                                    className="text-xl font-black tracking-[0.15em] uppercase"
                                />
                            </div>
                            <p className="text-sm" style={{ color: cyberMuted }}>{contactData?.address || <span className="italic opacity-60">Agrega tu dirección</span>}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ color: cyberNeon, ...styleFor('footerHeading1') }}>{els?.footerHeading1?.text || '// Tienda'}</h4>
                            <ul className="space-y-2 text-sm">
                                <li><button onClick={() => handleNavigate('/catalogo')} className="hover:opacity-100" style={{ color: cyberMuted }}>Catálogo</button></li>
                                <li><button onClick={() => handleNavigate('/catalogo', { onSale: 'true' })} className="hover:opacity-100" style={{ color: cyberMuted }}>Drops</button></li>
                                <li><button onClick={() => handleNavigate('/catalogo')} className="hover:opacity-100" style={{ color: cyberMuted }}>Tech</button></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ color: cyberNeon, ...styleFor('footerHeading2') }}>{els?.footerHeading2?.text || '// Contacto'}</h4>
                            <ul className="space-y-2 text-sm">
                                {contactData?.whatsapp && (
                                    <li><a href={`https://wa.me/${contactData.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-100" style={{ color: cyberMuted }}>WhatsApp</a></li>
                                )}
                                {contactData?.email && (
                                    <li><a href={`mailto:${contactData.email}`} className="hover:opacity-100" style={{ color: cyberMuted }}>{contactData.email}</a></li>
                                )}
                                {!contactData?.whatsapp && !contactData?.email && (
                                    <li className="italic opacity-60" style={{ color: cyberMuted }}>Agrega tus datos</li>
                                )}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ color: cyberNeon, ...styleFor('footerHeading3') }}>{els?.footerHeading3?.text || '// Legal'}</h4>
                            <ul className="space-y-2 text-sm">
                                <li><a href="/terminos-condiciones" target="_blank" rel="noopener noreferrer" className="hover:opacity-100" style={{ color: cyberMuted }}>Términos</a></li>
                                <li><a href="/politica-privacidad" target="_blank" rel="noopener noreferrer" className="hover:opacity-100" style={{ color: cyberMuted }}>Privacidad</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t pt-6 flex flex-col md:flex-row justify-between items-center gap-2 text-xs tracking-[0.2em] uppercase" style={{ borderColor: cyberBorder, color: cyberMuted }}>
                        <span>© {new Date().getFullYear()} {storeDisplayName(settings)}</span>
                        <span>// Powered by Toogo</span>
                    </div>
                </div>
            </footer>

            {/* Mobile menu */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-50" onClick={() => setIsMenuOpen(false)}>
                    <div className="absolute inset-0 backdrop-blur-xl" style={{ backgroundColor: `${cyberBg}e0` }} />
                    <div className="absolute left-0 top-0 bottom-0 w-80 p-6 flex flex-col border-r" style={{ backgroundColor: cyberSurface, borderColor: cyberBorder }} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-8">
                            <span className="text-lg font-black tracking-[0.2em] uppercase" style={{ color: cyberNeon }}>// MENÚ</span>
                            <button onClick={() => setIsMenuOpen(false)}><X className="w-6 h-6" style={{ color: cyberText }} /></button>
                        </div>
                        <nav className="flex flex-col gap-4">
                            {(topCategories.length > 0 ? topCategories : [{ name: 'Catálogo' }, { name: 'Drops' }, { name: 'Tech' }]).map((cat: any, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => { handleNavigate('/catalogo', cat.id ? { category: cat.name.toLowerCase() } : {}); setIsMenuOpen(false); }}
                                    className="text-left text-xl font-black uppercase tracking-tight hover:opacity-70"
                                    style={{ color: cyberText }}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            {/* Cart drawer */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[400px] z-50 transform ${isCartOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 shadow-2xl border-l`} style={{ backgroundColor: cyberSurface, borderColor: cyberBorder }}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: cyberBorder }}>
                        <h2 className="text-lg font-black tracking-[0.15em] uppercase">// Carrito ({cartCount})</h2>
                        <button onClick={() => setIsCartOpen(false)}><X className="w-6 h-6" style={{ color: cyberText }} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {cartItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                                <ShoppingCart className="w-12 h-12 opacity-30" />
                                <p className="font-bold tracking-widest uppercase text-sm" style={{ color: cyberMuted }}>// Vacío</p>
                                <button
                                    onClick={() => { setIsCartOpen(false); handleNavigate('/catalogo'); }}
                                    className="px-6 py-3 text-xs font-bold tracking-widest uppercase rounded-lg"
                                    style={{ background: `linear-gradient(135deg, ${cyberNeon} 0%, ${cyberMagenta} 100%)`, color: cyberBg }}
                                >
                                    Explorar →
                                </button>
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {cartItems.map((item: any) => (
                                    <li key={item.id} className="flex gap-3 p-3 rounded-lg border" style={{ borderColor: cyberBorder }}>
                                        <div className="w-20 h-20 rounded overflow-hidden flex-shrink-0" style={{ backgroundColor: cyberBg }}>
                                            <img src={item.image || item.images?.[0] || '/placeholder.svg'} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-bold text-sm leading-tight">{item.name}</h3>
                                                <p className="text-sm font-black mt-1" style={{ color: cyberNeon }}>${((item.price_mxn || item.price || 0)).toFixed(0)}</p>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 px-2 py-1 rounded border" style={{ borderColor: cyberBorder }}>
                                                    <button onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))} className="font-black w-4" style={{ color: cyberNeon }}>−</button>
                                                    <span className="font-bold w-4 text-center text-xs">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="font-black w-4" style={{ color: cyberNeon }}>+</button>
                                                </div>
                                                <button onClick={() => removeItem(item.id)} className="text-[10px] font-bold tracking-widest uppercase" style={{ color: cyberMagenta }}>Eliminar</button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {cartItems.length > 0 && (
                        <div className="p-6 border-t" style={{ borderColor: cyberBorder }}>
                            <div className="flex justify-between mb-4">
                                <span className="text-xs tracking-widest uppercase" style={{ color: cyberMuted }}>// Subtotal</span>
                                <span className="font-black text-2xl" style={{ color: cyberNeon }}>${(cartTotal || 0).toFixed(0)}</span>
                            </div>
                            <button onClick={() => { setIsCartOpen(false); setShowCheckout(true); }} className="w-full py-4 rounded-lg font-bold text-sm tracking-widest uppercase" style={{
                                background: `linear-gradient(135deg, ${cyberNeon} 0%, ${cyberMagenta} 100%)`,
                                color: cyberBg,
                                boxShadow: `0 0 20px ${cyberNeon}40`
                            }}>
                                Finalizar compra →
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {isCartOpen && <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />}
            <CheckoutModal open={showCheckout} onOpenChange={setShowCheckout} />
        </div>
    );
};
