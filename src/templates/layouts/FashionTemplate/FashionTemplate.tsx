// @ts-nocheck
import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    ShoppingCart, Heart, Search, Menu, X, User
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { LogoDisplay } from "@/components/ui/LogoDisplay";
import { CheckoutModal } from "@/components/cart/CheckoutModal";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { heroFontFamily } from "@/lib/heroFonts";

export const FashionTemplate = (props: any) => {
    const {
        storeData,
        products,
        categories,
        favorites,
        toggleFavorite,
        addToCart,
        effectiveSettings,
        banners,
        contactData,
        announcement,
        ticker,
        textBanner,
        view = 'home',
        products: catalogProducts,
        welcomeTitle,
        welcomeMessage,
        featuredProducts: featuredProductIds,
    } = props;

    const settings = effectiveSettings || storeData?.settings || {};
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const activeCategory = searchParams.get('category');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
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
    const displayProducts = isCatalog ? (catalogProducts || []) : products;
    const topCategories = categories?.filter((c: any) => !c.parent_id && c.show_on_home !== false) || [];

    const headerIconColor = settings?.header_icon_color || '#000000';
    const headerIconScale = settings?.header_icon_scale || 1;
    const footerBgColor = settings?.footer_bg_color || '#ffffff';
    const footerIconColor = settings?.footer_icon_color || '#111111';
    const footerIconScale = settings?.footer_icon_scale || 1;
    const cardBgColor = settings?.product_card_bg_color || '#f5f5f5';
    const cardHoverColor = settings?.product_card_hover_color || '#000000';

    const mainHeroImg = banners?.[0]?.imageUrl || banners?.[0]?.image;
    const secondHeroImg = banners?.[1]?.imageUrl || banners?.[1]?.image;
    const thirdHeroImg = banners?.[2]?.imageUrl || banners?.[2]?.image;
    const editorialBannerImg = banners?.[3]?.imageUrl || banners?.[3]?.image;

    // Indico-level per-element styles (hero.styles[key]) + per-section backgrounds.
    // All optional overrides — undefined keeps the template's default look.
    const els = props.heroStyles || {};
    const styleFor = (k: string) => ({
        fontFamily: heroFontFamily(els?.[k]?.fontFamily),
        fontSize: els?.[k]?.fontSize ? `${els[k].fontSize}px` : undefined,
        color: els?.[k]?.color || undefined,
        backgroundColor: els?.[k]?.bgColor || undefined,
    });
    // Buttons route to catalog / a category / a custom link (same as Indico).
    const ctaClick = (k: string) => () => {
        const cfg = els?.[k] || {};
        if (cfg.action === 'link' && cfg.customUrl) {
            window.open(cfg.customUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        if (cfg.action === 'category' && cfg.categorySlug) {
            handleNavigate('/catalogo', { category: cfg.categorySlug });
            return;
        }
        handleNavigate('/catalogo');
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            handleNavigate('/catalogo', { search: searchQuery });
            setSearchOpen(false);
        }
    };

    // Marquee for the news ticker (the editor's "animado" switch had no CSS before)
    const tickerCSS = `
      @keyframes fashion-marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .fashion-ticker { animation: fashion-marquee 25s linear infinite; }
    `;

    // Product card
    const ProductCard = ({ product }: { product: any }) => {
        const isService = product.product_type === 'service';
        const pricingMode = isService ? (product.pricing_mode || 'fixed') : 'fixed';
        const isQuoteOnly = isService && pricingMode === 'quote';
        const basePrice = product.price_mxn || product.price;
        const displayPrice = !isService ? (product.sale_price_mxn || basePrice) : basePrice;
        return (
        <div
            className="group cursor-pointer"
            onClick={() => (props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`))}
        >
            <div className="relative aspect-[3/4] overflow-hidden mb-3" style={{ backgroundColor: cardBgColor }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" style={{ backgroundColor: cardHoverColor }} />
                <img
                    src={(product.images?.[0] && typeof product.images[0] === 'object') ? product.images[0].url : (product.images?.[0] || product.image || '/placeholder.svg')}
                    alt={product.title || product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 relative z-10 mix-blend-multiply"
                />
                <button
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100 z-20"
                    onClick={(e) => { e.stopPropagation(); toggleFavorite?.(product.id); }}
                >
                    <Heart className={`w-4 h-4 ${favorites?.includes(product.id) ? 'fill-black' : ''}`} />
                </button>
            </div>
            <div className="text-center">
                <h3 className="text-sm text-gray-900 font-medium mb-1 line-clamp-1">{product.title || product.name}</h3>
                {isQuoteOnly ? (
                    <span className="text-gray-500 font-light italic">A cotizar</span>
                ) : isService && pricingMode === 'starting_from' ? (
                    <span className="text-gray-500 font-light">Desde ${displayPrice} MXN</span>
                ) : isService ? (
                    <span className="text-gray-500 font-light">${displayPrice} MXN</span>
                ) : (
                    <span className="text-gray-500 font-light">${displayPrice}</span>
                )}
            </div>
        </div>
        );
    };

    return (
        <div className="min-h-screen font-sans bg-white text-black" style={{ backgroundColor: settings?.store_background_color || '#ffffff' }}>
            <style>{tickerCSS}</style>

            {/* ─── HEADER ─── */}
            <header className={`px-6 py-4 flex flex-col gap-4 border-b border-gray-200 sticky top-0 z-50 bg-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${hideNav ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`} style={{ backgroundColor: props.sectionBg?.navbar || settings?.navbar_bg_color || '#ffffff' }}>
                <div className="flex items-center justify-between">
                    {/* Left: Social links */}
                    <div className="hidden md:flex items-center gap-4 text-xs font-semibold tracking-wider text-gray-500">
                        {contactData?.facebook && (
                            <a href={contactData.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors" style={{ color: headerIconColor }}>f</a>
                        )}
                        {contactData?.instagram && (
                            <a href={contactData.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors" style={{ color: headerIconColor }}>in</a>
                        )}
                        {announcement?.enabled && announcement?.text && (
                            <span className="ml-4 text-[10px] text-black" style={announcement?.textColor ? { color: announcement.textColor } : undefined}>{announcement.text}</span>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button className="md:hidden" onClick={() => setIsMenuOpen(true)}>
                        <Menu className="h-6 w-6" style={{ color: headerIconColor }} />
                    </button>

                    {/* Center: Logo */}
                    <div className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 cursor-pointer" onClick={() => handleNavigate('/tienda')}>
                        <LogoDisplay
                            logoUrl={settings?.logo_url}
                            fallbackText={settings?.store_name || 'LOGO'}
                            disableFetch={true}
                        logoSize={settings?.logo_size}
                        logoSizeMobile={(settings as any)?.logo_size_mobile}
                        logoSizeTablet={(settings as any)?.logo_size_tablet}
                            className="text-3xl font-black uppercase tracking-tighter"
                        />
                    </div>

                    {/* Right: Icons */}
                    <div className="flex items-center gap-4 md:gap-6">
                        <User className="h-5 w-5 stroke-1 hidden md:block cursor-pointer hover:scale-110 transition-transform" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                        <button onClick={() => setSearchOpen(!searchOpen)} aria-label="Buscar">
                            <Search className="h-5 w-5 stroke-1 cursor-pointer hover:scale-110 transition-transform" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                        </button>
                        <Heart className="h-5 w-5 stroke-1 hidden md:block cursor-pointer hover:scale-110 transition-transform" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                        <div className="relative cursor-pointer hover:scale-110 transition-transform" onClick={() => setIsCartOpen(true)}>
                            <ShoppingCart className="h-5 w-5 stroke-1" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] w-3 h-3 flex items-center justify-center rounded-full">{cartCount}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search bar (toggled by the magnifier icon) */}
                {searchOpen && (
                    <form onSubmit={handleSearch} className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-4 py-2 max-w-md mx-auto w-full">
                        <Search className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                            type="text"
                            autoFocus
                            placeholder="Buscar productos..."
                            className="bg-transparent border-none outline-none text-sm placeholder:text-gray-400 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className="text-xs font-bold uppercase tracking-widest hover:text-gray-500">Buscar</button>
                    </form>
                )}

                {/* Bottom Nav */}
                <nav className="hidden md:flex justify-center gap-8 text-xs font-bold uppercase tracking-widest text-black" style={styleFor('navMenu')}>
                    {topCategories.slice(0, 5).map((cat: any) => (
                        <button
                            key={cat.id}
                            onClick={() => handleNavigate('/catalogo', { category: cat.name.toLowerCase() })}
                            className="cursor-pointer hover:text-gray-500 transition-colors"
                        >
                            {cat.name}
                        </button>
                    ))}
                    {topCategories.length === 0 && (
                        <>
                            <span className="cursor-pointer hover:text-gray-500">Inicio ▾</span>
                            <span className="cursor-pointer hover:text-gray-500">Tienda ▾</span>
                            <span className="cursor-pointer hover:text-gray-500">Blog ▾</span>
                            <span className="cursor-pointer hover:text-gray-500">Páginas ▾</span>
                            <button onClick={() => handleNavigate('/catalogo')} className="cursor-pointer hover:text-gray-500">Contacto</button>
                        </>
                    )}
                </nav>
            </header>

            {/* ─── MOBILE MENU ─── */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)} />
                    <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b">
                            <span className="font-black uppercase tracking-tighter text-lg">{settings?.store_name || "FASHION"}</span>
                            <button onClick={() => setIsMenuOpen(false)}><X className="w-6 h-6" /></button>
                        </div>
                        <nav className="flex-1 p-6 space-y-6">
                            {topCategories.map((cat: any) => (
                                <button key={cat.id} onClick={() => { handleNavigate('/catalogo', { category: cat.name.toLowerCase() }); setIsMenuOpen(false); }} className="block w-full text-left font-medium uppercase tracking-widest text-sm hover:text-gray-500">
                                    {cat.name}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            {/* ─── HERO SECTION ─── */}
            {!isCatalog && (
                <div className="flex flex-col lg:flex-row w-full bg-white relative">
                    {/* Main hero image */}
                    <div className="w-full lg:w-1/2 aspect-[4/5] lg:aspect-auto lg:h-[80vh] bg-gray-100 order-2 lg:order-1">
                        {mainHeroImg ? (
                            <img src={mainHeroImg} className="w-full h-full object-cover" alt="Hero Principal" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                <span className="text-gray-400 font-serif italic text-2xl">Agrega tu foto hero</span>
                            </div>
                        )}
                    </div>

                    {/* Right text + small images */}
                    <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center px-8 lg:px-20 py-16 relative order-1 lg:order-2" style={{ backgroundColor: props.sectionBg?.hero || undefined }}>
                        {secondHeroImg && (
                            <div className="hidden lg:block absolute top-12 right-20 w-32 h-32 bg-gray-100 z-10">
                                <img src={secondHeroImg} className="w-full h-full object-cover" alt="Hero secundario" />
                            </div>
                        )}

                        <div className="max-w-xl relative z-20">
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-6 whitespace-pre-wrap" style={styleFor('title')}>
                                {welcomeTitle || "Nueva Colección\nde Verano"}
                            </h1>
                            <p className="text-gray-500 text-sm mb-10 max-w-md font-medium leading-relaxed" style={styleFor('message')}>
                                {welcomeMessage || "Descubre la nueva colección de moda con colores vibrantes, estampados únicos y piezas cómodas perfectas para cualquier ocasión."}
                            </p>

                            <div className="flex gap-4 flex-wrap">
                                {(els?.cta1?.enabled !== false) && (
                                    <Button
                                        className="bg-black text-white hover:bg-black/90 rounded-none px-8 py-6 text-xs font-bold uppercase tracking-widest"
                                        style={styleFor('cta1')}
                                        onClick={ctaClick('cta1')}
                                    >
                                        {props.cta1Label || "Ver Colección"}
                                    </Button>
                                )}
                                {(els?.cta2?.enabled !== false) && (
                                    <Button
                                        variant="outline"
                                        className="border-black text-black hover:bg-gray-50 rounded-none px-8 py-6 text-xs font-bold uppercase tracking-widest"
                                        style={styleFor('cta2')}
                                        onClick={ctaClick('cta2')}
                                    >
                                        {props.cta2Label || "Novedades"}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {thirdHeroImg && (
                            <div className="hidden lg:block absolute bottom-0 right-12 w-48 h-64 bg-gray-100 z-10">
                                <img src={thirdHeroImg} className="w-full h-full object-cover" alt="Hero terciario" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── TICKER ─── */}
            {(ticker?.enabled !== false) && !isCatalog && (
                <div
                    className="border-y-2 border-black bg-white py-4 overflow-hidden"
                    style={ticker?.bgColor ? { backgroundColor: ticker.bgColor } : undefined}
                >
                    <div
                        className={`flex flex-nowrap whitespace-nowrap gap-8 font-black uppercase tracking-tighter ${ticker?.animated === false ? 'justify-center' : 'fashion-ticker'} ${ticker?.fontSize ? '' : 'text-lg lg:text-3xl'}`}
                        style={{
                            ...(ticker?.fontSize ? { fontSize: `${ticker.fontSize}px` } : {}),
                            ...(ticker?.textColor ? { color: ticker.textColor } : {}),
                        }}
                    >
                        {(ticker?.animated === false
                            ? [ticker?.text || "SOPORTE 24/7 • CALIDAD PREMIUM • ENVÍO GRATIS • GARANTÍA TOTAL"]
                            : Array(8).fill(ticker?.text || "SOPORTE 24/7 • CALIDAD PREMIUM • ENVÍO GRATIS • GARANTÍA TOTAL")
                        ).map((text, i) => (
                            <span key={i} className="shrink-0">{text}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── CATALOG VIEW — inherits the products-section bg so it matches home ─── */}
            {isCatalog && (
                <div style={{ backgroundColor: props.sectionBg?.section1 || undefined }}>
                <div className="container mx-auto px-6 py-8">
                    {/* Category filter */}
                    <div className="flex flex-wrap justify-center gap-4 mb-8">
                        {topCategories.map((cat: any) => {
                            const isActive = !!activeCategory && (activeCategory === cat.slug || activeCategory === cat.id || activeCategory === cat.name?.toLowerCase());
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => handleNavigate('/catalogo', { category: cat.name.toLowerCase() })}
                                    className={`${isActive ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-black'} pb-1 font-bold uppercase tracking-widest text-sm transition-colors cursor-pointer`}
                                >
                                    {cat.name}
                                </button>
                            );
                        })}
                    </div>

                    <h1 className="text-3xl font-black uppercase tracking-tighter mb-8">Catálogo</h1>

                    {displayProducts.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-8 md:gap-y-16">
                            {displayProducts.map((product: any) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center">
                            <p className="text-gray-400 font-medium">No se encontraron productos.</p>
                            <Button variant="link" onClick={() => handleNavigate('/tienda')} className="mt-2">Volver al inicio</Button>
                        </div>
                    )}
                </div>
                </div>
            )}

            {/* ─── HOME PRODUCTS SECTION ─── */}
            {!isCatalog && (
                <section className="py-20 bg-white" style={{ backgroundColor: props.sectionBg?.section1 || undefined }}>
                    <div className="container mx-auto px-4 text-center mb-12">
                        <h2 className="text-4xl sm:text-5xl md:text-8xl font-black uppercase tracking-tighter break-words mb-8" style={styleFor('sectionTitle1')}>
                            {els?.sectionTitle1?.text || 'RECIÉN LLEGADOS'}
                        </h2>

                        <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-sm font-bold uppercase tracking-widest text-gray-400">
                            {topCategories.slice(0, 4).map((cat: any) => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleNavigate('/catalogo', { category: cat.name.toLowerCase() })}
                                    className="cursor-pointer hover:text-black hover:border-b-2 hover:border-black pb-1 transition-colors"
                                >
                                    {cat.name}
                                </button>
                            ))}
                            {topCategories.length === 0 && (
                                <>
                                    <span className="cursor-pointer hover:text-black">Mujeres</span>
                                    <span className="cursor-pointer hover:text-black">Hombres</span>
                                    <span className="cursor-pointer hover:text-black">Niños</span>
                                    <span className="cursor-pointer hover:text-black">Accesorios</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Zero-gap Grid */}
                    <div className="w-full flex flex-col md:flex-row relative z-10">
                        {(products?.slice(0, 4) || []).map((product: any) => (
                            <div
                                key={product.id}
                                className="w-full md:w-1/4 group cursor-pointer border-r border-gray-100 last:border-r-0 hover:bg-gray-50 transition-colors"
                                onClick={() => (props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`))}
                            >
                                <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
                                    <img
                                        src={(product.images?.[0] && typeof product.images[0] === 'object') ? product.images[0].url : (product.images?.[0] || product.image || '/placeholder.svg')}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        alt={product.title || product.name}
                                    />
                                    <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            className="w-10 h-10 rounded-full bg-white text-black shadow-md hover:bg-black hover:text-white flex items-center justify-center transition-colors"
                                            onClick={(e) => { e.stopPropagation(); toggleFavorite?.(product.id); }}
                                        >
                                            <Heart className={`w-4 h-4 ${favorites?.includes(product.id) ? 'fill-black' : ''}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-transparent p-6 pb-8">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 mt-1">{settings?.store_name || "Marca"}</p>
                                    <h3 className="text-sm font-medium text-black mb-3 line-clamp-2 md:line-clamp-1">{product.title || product.name}</h3>
                                    <div className="flex gap-3 items-center">
                                        {(() => {
                                          // Service-aware price so the home shows "Desde $X" / "A cotizar".
                                          const isService = product.product_type === 'service';
                                          const pMode = isService ? (product.pricing_mode || 'fixed') : 'fixed';
                                          const base = product.price_mxn || product.price;
                                          const disp = !isService ? (product.sale_price_mxn || base) : base;
                                          if (isService && pMode === 'quote') return <span className="text-sm font-bold text-gray-600 italic">A cotizar</span>;
                                          if (isService && pMode === 'starting_from') return <span className="text-sm font-bold text-gray-600">Desde ${disp} MXN</span>;
                                          if (isService) return <span className="text-sm font-bold text-gray-600">${disp} MXN</span>;
                                          return <span className="text-sm font-bold text-gray-600">${disp}</span>;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ─── EDITORIAL BANNER (banners[3], after Recién Llegados) ─── */}
            {!isCatalog && editorialBannerImg && (
                <section className="relative w-full h-[45vh] md:h-[55vh] overflow-hidden bg-gray-100">
                    <img
                        src={editorialBannerImg}
                        alt="Banner editorial"
                        className="w-full h-full object-contain lg:object-cover"
                        style={{ objectPosition: banners?.[3]?.position || 'center center' }}
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center px-6">
                        <h2 className="text-white text-4xl md:text-6xl font-black uppercase tracking-tighter text-center drop-shadow-md" style={styleFor('midBannerTitle')}>
                            {els?.midBannerTitle?.text || 'Estilo Sin Límites'}
                        </h2>
                    </div>
                </section>
            )}

            {/* ─── POPULARES — products hand-picked in the editor (featured grid);
                 falls back to the next products (5th onwards) when none chosen ─── */}
            {!isCatalog && (() => {
                const popularProducts = (featuredProductIds && featuredProductIds.length > 0)
                    ? featuredProductIds.map((id: string) => products?.find((p: any) => p.id === id)).filter(Boolean)
                    : (products || []).slice(4, 12);
                if (popularProducts.length === 0) return null;
                return (
                    <section className="py-20" style={{ backgroundColor: props.sectionBg?.section2 || undefined }}>
                        <div className="container mx-auto px-6">
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-12 text-center" style={styleFor('sectionTitle2')}>
                                {els?.sectionTitle2?.text || 'POPULARES'}
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-8">
                                {popularProducts.map((product: any) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </div>
                    </section>
                );
            })()}

            {/* ─── PROMO BANNER (textBanner — imagen subible vía editor) ─── */}
            {!isCatalog && (textBanner?.isActive !== false) && (
                <section className="py-10">
                    <div className="w-full h-[55vh] md:h-[70vh] bg-gray-900 relative overflow-hidden">
                        {textBanner?.imageUrl ? (
                            <>
                                <img src={textBanner.imageUrl} className="w-full h-full object-contain lg:object-cover absolute inset-0" style={{ objectPosition: textBanner.imagePosition || 'center center' }} alt="Banner" />
                                <div className="absolute inset-0 bg-black/40" />
                            </>
                        ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                <span className="text-zinc-600 font-black text-4xl uppercase tracking-tighter">Área de banner</span>
                            </div>
                        )}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-10">
                            <h2 className="text-4xl sm:text-5xl md:text-8xl font-black text-white uppercase italic tracking-tighter break-words mb-6 drop-shadow-md">
                                {textBanner?.text || 'Sin Límites'}
                            </h2>
                            {(textBanner?.buttonEnabled !== false) && (
                                <Button
                                    className="bg-white text-black text-lg px-10 py-7 rounded-full font-bold hover:scale-105 transition-transform"
                                    onClick={() => {
                                        if (textBanner?.buttonAction === 'link' && textBanner?.buttonCustomUrl) { window.open(textBanner.buttonCustomUrl, '_blank', 'noopener,noreferrer'); }
                                        else if (textBanner?.buttonAction === 'category' && textBanner?.buttonCategorySlug) { handleNavigate('/catalogo', { category: textBanner.buttonCategorySlug }); }
                                        else { handleNavigate('/catalogo'); }
                                    }}
                                >
                                    {textBanner?.buttonLabel || 'Ver Colección'}
                                </Button>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* ─── FOOTER ─── */}
            <footer className="border-t-2 border-gray-100 py-16 px-6 flex flex-col md:flex-row justify-between items-center text-xs font-bold uppercase tracking-widest gap-8 text-gray-400" style={{ backgroundColor: props.sectionBg?.footer || footerBgColor }}>
                <div className="flex gap-6">
                    {contactData?.facebook && (
                        <a href={contactData.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors" style={{ color: footerIconColor }}>Facebook</a>
                    )}
                    {contactData?.instagram && (
                        <a href={contactData.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors" style={{ color: footerIconColor }}>Instagram</a>
                    )}
                </div>
                <div className="text-black text-center">
                    © {new Date().getFullYear()} {settings?.store_name || "TIENDA FASHION"}
                </div>
                <div className="flex gap-6">
                    <a href="/politica-privacidad" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Política de Privacidad</a>
                    <a href="/terminos-condiciones" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Términos y Condiciones</a>
                </div>
            </footer>

            {/* ─── CART DRAWER ─── */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[420px] bg-white z-50 transform ${isCartOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out shadow-2xl`}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b flex justify-between items-center">
                        <h2 className="text-xl font-black uppercase tracking-tight">Tu Carrito <span className="text-gray-400 font-normal text-base ml-1">({cartCount})</span></h2>
                        <button onClick={() => setIsCartOpen(false)} className="hover:rotate-90 transition-transform duration-300"><X className="w-7 h-7" /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {cartItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                                <div className="w-16 h-16 bg-gray-100 flex items-center justify-center">
                                    <ShoppingCart className="w-7 h-7 text-gray-300" />
                                </div>
                                <div>
                                    <p className="text-lg font-black uppercase mb-1">Carrito vacío</p>
                                    <p className="text-gray-400 text-sm">Agrega productos para comenzar</p>
                                </div>
                                <Button onClick={() => { setIsCartOpen(false); handleNavigate('/catalogo'); }} className="bg-black text-white font-bold uppercase px-8 py-5 rounded-none text-xs tracking-widest">
                                    Ir a la Tienda
                                </Button>
                            </div>
                        ) : (
                            <ul className="space-y-8">
                                {cartItems.map((item: any) => (
                                    <li key={item.id} className="flex gap-6">
                                        <div className="relative w-20 aspect-[3/4] bg-gray-100 overflow-hidden flex-shrink-0">
                                            <img src={item.image || item.images?.[0] || '/placeholder.svg'} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between py-1">
                                            <div>
                                                <div className="flex justify-between items-start gap-4 mb-1">
                                                    <h3 className="font-bold text-sm leading-tight uppercase">{item.name}</h3>
                                                    <span className="font-bold text-sm">${((item.price_mxn || item.price || 0) * item.quantity).toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="flex items-center gap-3 border border-gray-200 px-3 py-1">
                                                    <button className="font-bold text-lg hover:text-gray-500" onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}>−</button>
                                                    <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                                                    <button className="font-bold text-lg hover:text-gray-500" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                                </div>
                                                <button onClick={() => removeItem(item.id)} className="text-xs text-gray-400 hover:text-black uppercase tracking-wide">Quitar</button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {cartItems.length > 0 && (
                        <div className="p-6 border-t">
                            <div className="flex justify-between items-center mb-5">
                                <span className="font-bold text-gray-400 uppercase tracking-wider text-xs">Subtotal</span>
                                <span className="font-black text-2xl">${(cartTotal || 0).toFixed(2)}</span>
                            </div>
                            <Button onClick={() => { setIsCartOpen(false); setShowCheckout(true); }} className="w-full bg-black text-white hover:bg-gray-800 font-bold uppercase py-6 text-sm tracking-widest shadow-lg hover:shadow-xl transition-all rounded-none">
                                Finalizar Compra
                            </Button>
                            <p className="text-center text-xs text-gray-400 mt-3">Envío e impuestos calculados al finalizar.</p>
                        </div>
                    )}
                </div>
            </div>
            {isCartOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setIsCartOpen(false)} />}
            <CheckoutModal open={showCheckout} onOpenChange={setShowCheckout} />
        </div>
    );
};
