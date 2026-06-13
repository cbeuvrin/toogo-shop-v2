import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingCart, Heart, Search, Menu, X, User, ChevronRight, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { LogoDisplay } from "@/components/ui/LogoDisplay";
import { HamburgerButton } from "@/components/ui/HamburgerButton";
import { CheckoutModal } from "@/components/cart/CheckoutModal";
import { heroFontFamily } from "@/lib/heroFonts";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";

export const FashionHeroTemplate = (props: any) => {
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
    const hideNav = useHideOnScroll();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showMobileSearch, setShowMobileSearch] = useState(false);

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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            handleNavigate('/catalogo', { search: searchQuery });
            setShowMobileSearch(false);
        }
    };

    const { items: cartItems, removeItem, updateQuantity, totalPrice: cartTotal } = useCart();
    const cartCount = cartItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    // Auto-collapse header nav to hamburger when its intrinsic width would not
    // fit in the left column. We render an off-screen "measurer" nav with the
    // same content + styles, then compare its offsetWidth against the visible
    // left column's clientWidth.
    const navColRef = useRef<HTMLDivElement>(null);
    const navMeasurerRef = useRef<HTMLDivElement>(null);
    const [navOverflows, setNavOverflows] = useState(false);
    useEffect(() => {
      const col = navColRef.current;
      const measurer = navMeasurerRef.current;
      if (!col || !measurer) return;
      const check = () => {
        // Hamburger reserves ~32px when present. Leave a small safety margin.
        const available = col.clientWidth - 8;
        const needed = measurer.offsetWidth + 24; // 24px to keep nav off the logo
        setNavOverflows(needed > available);
      };
      check();
      const ro = new ResizeObserver(check);
      ro.observe(col);
      window.addEventListener('resize', check);
      return () => { ro.disconnect(); window.removeEventListener('resize', check); };
    }, [categories, view]);
    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
        }
    };

    const isCatalog = view === 'catalog';
    const displayProducts = isCatalog ? (catalogProducts || []) : products;
    const mainHeroImage = banners?.[0]?.imageUrl || banners?.[0]?.image;
    const secondaryBanner = banners?.[1] || banners?.[0];

    // Extract visual settings
    const headerIconColor = settings?.header_icon_color || '#000000';
    const headerIconScale = settings?.header_icon_scale || 1;
    const footerBgColor = settings?.footer_bg_color || '#111111';
    const footerIconColor = settings?.footer_icon_color || '#ffffff';
    const footerIconScale = settings?.footer_icon_scale || 1;
    const cardBgColor = settings?.product_card_bg_color || '#f5f5f5';
    const cardHoverColor = settings?.product_card_hover_color || '#000000';

    // Compact Product Card Component
    const ProductCard = ({ product }: { product: any }) => {
        const isService = product.product_type === 'service';
        const pricingMode = isService ? (product.pricing_mode || 'fixed') : 'fixed';
        const isQuoteOnly = isService && pricingMode === 'quote';
        const basePrice = product.price_mxn || product.price;
        const displayPrice = !isService ? (product.sale_price_mxn || basePrice) : basePrice;
        return (
        <div className="w-full group cursor-pointer" onClick={() => (props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`))}>
            <div className="relative aspect-[3/4] overflow-hidden mb-3 transition-colors duration-300" style={{ backgroundColor: cardBgColor }}>
                <div className="absolute inset-0 transition-colors duration-300 opacity-0 group-hover:opacity-100" style={{ backgroundColor: cardHoverColor }} />
                <img
                    src={(product.images?.[0] && typeof product.images[0] === 'object') ? product.images[0].url : (product.images?.[0] || product.image || "/placeholder.svg")}
                    alt={product.title || product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 relative z-10 mix-blend-multiply"
                />
                <button
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100 z-20"
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                >
                    <Heart className={`w-4 h-4 ${favorites?.includes(product.id) ? "fill-black" : ""}`} />
                </button>
            </div>
            <div>
                <h3 className="font-semibold text-gray-900 leading-tight mb-1 text-sm">{product.title || product.name}</h3>
                {isQuoteOnly ? (
                    <span className="font-bold text-sm italic">A cotizar</span>
                ) : isService && pricingMode === 'starting_from' ? (
                    <span className="font-bold text-sm">Desde ${displayPrice} MXN</span>
                ) : isService ? (
                    <span className="font-bold text-sm">${displayPrice} MXN</span>
                ) : (
                    <span className="font-bold text-sm">${displayPrice}</span>
                )}
            </div>
        </div>
        );
    };

    return (
        <div className="min-h-screen font-sans text-black" style={{ backgroundColor: settings?.store_background_color || '#ffffff' }}>

            {/* ─── HEADER ─── */}
            <header className={`sticky top-0 z-50 border-b border-gray-100 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${hideNav ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`} style={{ backgroundColor: props.sectionBg?.navbar || settings?.navbar_bg_color || '#ffffff' }}>
                {(() => {
                  // Indico: logo always centered. Grid with two equal flexible cols flanking
                  // an auto-width center keeps the logo on the geometric middle no matter
                  // how wide the nav or icons grow.
                  const navStyle = props.heroStyles?.navMenu || {};
                  const navFontFamily = heroFontFamily(navStyle.fontFamily);
                  const navInline = {
                    fontFamily: navFontFamily,
                    fontSize: navStyle.fontSize ? `${navStyle.fontSize}px` : undefined,
                    color: navStyle.color || undefined,
                  };
                  // Nav stays mounted so ResizeObserver can keep measuring it. When
                  // navOverflows is true we visually hide it (visibility:hidden, not display:none)
                  // and show the hamburger in its place.
                  const showNavVisible = !isCatalog && !navOverflows;
                  return (
                <div className="w-full px-6 min-h-16 py-3 grid items-center gap-4" style={{ gridTemplateColumns: '1fr auto 1fr' }}>

                    {/* LEFT col — nav (desktop, no overflow) OR hamburger */}
                    <div ref={navColRef} className="flex items-center gap-3 min-w-0 justify-start relative">
                      {/* Hamburger: always on mobile; on desktop only when nav overflows */}
                      <HamburgerButton
                        isOpen={isMenuOpen}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        count={props.hamburgerCount || 3}
                        thickness={props.hamburgerThickness || 2}
                        color={headerIconColor}
                        size={props.hamburgerSize || 24}
                        className={`${showNavVisible ? 'md:hidden' : 'md:block'}`}
                      />
                      {/* Visible desktop nav when there is room */}
                      {!isCatalog && showNavVisible && (
                          <nav className="hidden md:flex gap-7 text-sm font-medium text-gray-600 whitespace-nowrap">
                              {categories?.filter((cat: any) => !cat.parent_id && cat.show_on_home !== false).map((cat: any) => (
                                  <button
                                      key={cat.id}
                                      onClick={() => handleNavigate('/catalogo', { category: cat.name.toLowerCase() })}
                                      className="hover:text-black transition-colors uppercase tracking-wider text-xs flex-shrink-0"
                                      style={navInline}
                                  >
                                      {cat.name}
                                  </button>
                              ))}
                          </nav>
                      )}
                      {/* Off-screen measurer — same content/styles so we know the intrinsic width */}
                      {!isCatalog && (
                        <div
                          ref={navMeasurerRef}
                          aria-hidden="true"
                          className="hidden md:flex gap-7 text-sm font-medium whitespace-nowrap absolute left-0 top-0 pointer-events-none invisible"
                          style={{ ...navInline, transform: 'translateY(-9999px)' }}
                        >
                          {categories?.filter((cat: any) => !cat.parent_id && cat.show_on_home !== false).map((cat: any) => (
                            <span key={`m-${cat.id}`} className="uppercase tracking-wider text-xs flex-shrink-0">{cat.name}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CENTER col — logo ALWAYS centered */}
                    <div className="flex-shrink-0 cursor-pointer justify-self-center" onClick={() => handleNavigate('/tienda')}>
                        <LogoDisplay
                            logoUrl={settings?.logo_url}
                            logoSize={settings?.logo_size}
                            logoSizeMobile={(settings as any)?.logo_size_mobile}
                            logoSizeTablet={(settings as any)?.logo_size_tablet}
                            fallbackText={settings?.store_name || 'LOGO'}
                            disableFetch={true}
                            className="text-2xl font-black uppercase tracking-tighter"
                        />
                    </div>

                    {/* RIGHT col — icons */}
                    <div className="flex items-center gap-5 justify-end min-w-0">
                        <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 hover:bg-gray-100 transition-colors w-52">
                            <Search className="text-gray-400" style={{ color: headerIconColor, width: `${14 * headerIconScale}px`, height: `${14 * headerIconScale}px` }} />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="bg-transparent border-none outline-none text-xs placeholder:text-gray-400 w-full text-gray-700"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </form>
                        <button className="md:hidden" onClick={() => setShowMobileSearch(!showMobileSearch)}>
                            <Search style={{ color: headerIconColor, width: `${22 * headerIconScale}px`, height: `${22 * headerIconScale}px` }} />
                        </button>
                        <User
                            className="cursor-pointer hover:scale-110 transition-transform hidden md:block"
                            style={{ color: headerIconColor, width: `${22 * headerIconScale}px`, height: `${22 * headerIconScale}px` }}
                        />
                        <div className="relative cursor-pointer hover:scale-110 transition-transform" onClick={() => setIsCartOpen(true)}>
                            <ShoppingCart style={{ color: headerIconColor, width: `${22 * headerIconScale}px`, height: `${22 * headerIconScale}px` }} />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                                    {cartCount}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                  );
                })()}

                {/* Mobile Search Overlay */}
                {showMobileSearch && (
                    <div className="md:hidden w-full px-6 pb-4">
                        <form onSubmit={handleSearch} className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 w-full">
                            <Search className="w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Buscar productos..."
                                className="bg-transparent border-none outline-none text-sm placeholder:text-gray-500 w-full text-gray-700"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </form>
                    </div>
                )}
            </header>

            {/* ─── HAMBURGER MENU — opens from the LEFT, also on desktop when nav collapses ─── */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)} />
                    <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b">
                            <span
                              className="font-black uppercase tracking-tighter text-lg"
                              style={{
                                fontFamily: heroFontFamily(props.heroStyles?.menuDrawerTitle?.fontFamily),
                                fontSize: props.heroStyles?.menuDrawerTitle?.fontSize ? `${props.heroStyles.menuDrawerTitle.fontSize}px` : undefined,
                                color: props.heroStyles?.menuDrawerTitle?.color || undefined,
                              }}
                            >
                              {props.heroStyles?.menuDrawerTitle?.text || "Categorías"}
                            </span>
                            <button
                              onClick={() => setIsMenuOpen(false)}
                              className="group p-1 transition-transform duration-200 hover:rotate-90 hover:scale-110"
                              aria-label="Cerrar menú"
                            >
                              <X className="w-6 h-6 transition-colors group-hover:text-red-500" />
                            </button>
                        </div>
                        <nav className="flex-1 p-6 space-y-6">
                            {categories?.filter((cat: any) => !cat.parent_id && cat.show_on_home !== false).map((cat: any) => (
                                <button
                                    key={cat.id}
                                    onClick={() => { handleNavigate('/catalogo', { category: cat.name.toLowerCase() }); setIsMenuOpen(false); }}
                                    className="block w-full text-left font-medium uppercase tracking-widest text-sm hover:text-gray-500"
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            {/* ─── HERO SECTION (Photo + Text split) — only on home, hidden in catalog ─── */}
            {!isCatalog && (
            <section className="w-full flex flex-col-reverse lg:flex-row min-h-[70vh] lg:min-h-0">
                {/* Photo Side */}
                <div className="relative w-full lg:w-3/5 aspect-[4/5] lg:aspect-auto lg:h-[78vh] overflow-hidden bg-gray-100">
                    {mainHeroImage ? (
                        <img
                            src={mainHeroImage}
                            alt="Hero"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                            <span className="text-gray-400 font-serif italic text-2xl">Agrega tu foto hero</span>
                        </div>
                    )}
                    {/* Subtle overlay */}
                    <div className="absolute inset-0 bg-black/10" />
                </div>

                {/* Text Side — each text element can carry its own styles from the
                    Indico per-element editor (props.heroStyles.{eyebrow|title|message|cta1|cta2}). */}
                {(() => {
                  const fontTok = heroFontFamily;
                  const s = props.heroStyles || {};
                  const styleFor = (k: 'eyebrow' | 'title' | 'message' | 'cta1' | 'cta2') => ({
                    fontFamily: fontTok(s?.[k]?.fontFamily),
                    fontSize: s?.[k]?.fontSize ? `${s[k].fontSize}px` : undefined,
                    color: s?.[k]?.color || undefined,
                    // Buttons (cta1/cta2) can override their background; text nodes leave it undefined.
                    backgroundColor: s?.[k]?.bgColor || undefined,
                  });
                  return (
                    <div className="w-full lg:w-2/5 flex flex-col justify-center px-6 sm:px-8 md:px-14 py-12 sm:py-16 bg-white min-w-0" style={{ backgroundColor: props.sectionBg?.hero || undefined }}>
                        <p
                            className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] text-gray-400 mb-4 sm:mb-6 break-words"
                            style={styleFor('eyebrow')}
                        >
                            {props.eyebrowText || settings?.store_name || "Nueva Colección"}
                        </p>
                        <h1
                            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-[0.95] mb-4 sm:mb-6 break-words [overflow-wrap:anywhere]"
                            style={styleFor('title')}
                        >
                            {welcomeTitle || props.welcomeTitle || settings?.welcome_title || "Estilo\nque Inspira"}
                        </h1>
                        <p
                            className="text-gray-500 text-sm leading-relaxed mb-8 sm:mb-10 max-w-sm break-words"
                            style={styleFor('message')}
                        >
                            {welcomeMessage || props.welcomeMessage || settings?.welcome_message || "Descubre nuestra nueva colección diseñada para quienes viven con propósito. Calidad, estilo y comodidad en cada pieza."}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            {(() => {
                              // Build click handler from styles[key].action / categorySlug / customUrl
                              const ctaClick = (k: 'cta1' | 'cta2') => () => {
                                const cfg = s?.[k] || {};
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
                              return (
                                <>
                                  {(s?.cta1?.enabled !== false) && (
                                    <Button
                                      className="bg-black text-white hover:bg-gray-800 font-bold rounded-none px-8 sm:px-10 py-5 sm:py-6 text-xs uppercase tracking-widest group"
                                      style={styleFor('cta1')}
                                      onClick={ctaClick('cta1')}
                                    >
                                      {props.cta1Label || "Ver Colección"}
                                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                  )}
                                  {(s?.cta2?.enabled !== false) && (
                                    <Button
                                      variant="outline"
                                      className="border-black text-black hover:bg-black hover:text-white rounded-none px-8 sm:px-10 py-5 sm:py-6 text-xs uppercase tracking-widest transition-colors"
                                      style={styleFor('cta2')}
                                      onClick={ctaClick('cta2')}
                                    >
                                      {props.cta2Label || "Novedades"}
                                    </Button>
                                  )}
                                </>
                              );
                            })()}
                        </div>
                    </div>
                  );
                })()}
            </section>
            )}

            {/* ─── CATALOG VIEW — inherits the "Recién Llegados" section bg so the catalog matches home ─── */}
            {isCatalog && (
                <div style={{ backgroundColor: props.sectionBg?.section1 || undefined }}>
                <div className="container mx-auto px-6 py-8">
                    <div className="flex flex-wrap justify-center gap-4 mb-8">
                        {categories?.filter((cat: any) => !cat.parent_id && cat.show_on_home !== false).map((cat: any) => {
                            const isActive = activeCategory === cat.name.toLowerCase();
                            return (
                                <Button
                                    key={cat.id}
                                    onClick={() => handleNavigate('/catalogo', { category: cat.name.toLowerCase() })}
                                    className={`${isActive ? 'bg-zinc-700' : 'bg-black'} text-white hover:bg-zinc-800 font-bold rounded-none px-6 py-3 text-xs uppercase tracking-widest transition-all`}
                                >
                                    {cat.name}
                                </Button>
                            );
                        })}
                        <Button
                            onClick={() => handleNavigate('/catalogo')}
                            className={`${!activeCategory ? 'bg-zinc-700' : 'bg-black'} text-white hover:bg-zinc-800 font-bold rounded-none px-6 py-3 text-xs uppercase tracking-widest`}
                        >
                            Todos
                        </Button>
                    </div>

                    <div className="container mx-auto px-6 py-6 min-h-[50vh]">
                        <h2 className="text-2xl font-black uppercase mb-6 tracking-tighter">Catálogo</h2>
                        {displayProducts.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
                                {displayProducts.map((product: any) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-gray-50">
                                <p className="text-gray-500 font-medium">No se encontraron productos.</p>
                                <Button variant="link" onClick={() => handleNavigate('/tienda')} className="mt-2">
                                    Volver al inicio
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                </div>
            )}

            {/* ─── HOME SECTIONS ─── */}
            {!isCatalog && (
                <>
                    {/* Ticker / USP Bar — animated marquee or static centered text */}
                    {(ticker?.enabled !== false) && (
                        <div
                            className="bg-black text-white py-3 overflow-hidden whitespace-nowrap"
                            style={{
                                ...(ticker?.bgColor ? { backgroundColor: ticker.bgColor } : {}),
                                ...(ticker?.textColor ? { color: ticker.textColor } : {}),
                            }}
                        >
                            {ticker?.animated === false ? (
                                <div
                                    className="flex justify-center font-bold uppercase tracking-widest"
                                    style={{ fontSize: `${ticker?.fontSize || 10}px` }}
                                >
                                    <span>{ticker?.text || "Envíos en 24h · Calidad Premium · Garantía Total"}</span>
                                </div>
                            ) : (
                                <div
                                    className="flex gap-16 justify-center font-bold uppercase tracking-widest animate-marquee"
                                    style={{ fontSize: `${ticker?.fontSize || 10}px` }}
                                >
                                    <span>{ticker?.text || "Envíos en 24h · Calidad Premium · Garantía Total"}</span>
                                    <span>•</span>
                                    <span>{ticker?.text || "Envíos en 24h · Calidad Premium · Garantía Total"}</span>
                                    <span>•</span>
                                    <span>{ticker?.text || "Envíos en 24h · Calidad Premium · Garantía Total"}</span>
                                    <span>•</span>
                                    <span>{ticker?.text || "Envíos en 24h · Calidad Premium · Garantía Total"}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── PRODUCTS SECTION (Recién Llegados) ─── */}
                    <div style={{ backgroundColor: props.sectionBg?.section1 || undefined }}>
                    <div className="container mx-auto px-6 py-12 flex items-end justify-between">
                        <div>
                            {(() => {
                              const s = props.heroStyles || {};
                              const fontTok = heroFontFamily;
                              const sStyle = (k: string) => ({
                                fontFamily: fontTok(s?.[k]?.fontFamily),
                                fontSize: s?.[k]?.fontSize ? `${s[k].fontSize}px` : undefined,
                                color: s?.[k]?.color || undefined,
                              });
                              return (
                                <>
                                  <h2 className="text-3xl font-black uppercase mb-1 tracking-tighter" style={sStyle('sectionTitle1')}>
                                    {s?.sectionTitle1?.text || "Recién Llegados"}
                                  </h2>
                                  <button
                                    className="text-sm font-semibold underline underline-offset-4 hover:text-gray-500"
                                    style={sStyle('sectionLink1')}
                                    onClick={() => handleNavigate('/catalogo')}
                                  >{s?.sectionLink1?.text || "Ver todo"}</button>
                                </>
                              );
                            })()}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={() => scroll('left')} className="rounded-full border-gray-300 hover:bg-gray-100">
                                <ChevronRight className="w-5 h-5 rotate-180" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => scroll('right')} className="rounded-full border-gray-300 hover:bg-gray-100">
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Products Scroll */}
                    <div ref={scrollContainerRef} className="container mx-auto px-6 pb-16 overflow-x-auto hide-scrollbar">
                        <div className="flex gap-6 min-w-max">
                            {(() => {
                                const newArrivals = products?.filter((p: any) => p.features?.includes("new_arrival")) || [];
                                const productsToShow = newArrivals.length > 0 ? newArrivals : products?.slice(0, 6);
                                return productsToShow?.map((product: any) => (
                                    <div key={product.id} className="w-[240px] md:w-[280px] group cursor-pointer" onClick={() => (props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`))}>
                                        <div className="relative aspect-[3/4] overflow-hidden mb-3" style={{ backgroundColor: cardBgColor }}>
                                            <img
                                                src={(product.images?.[0] && typeof product.images[0] === 'object') ? product.images[0].url : (product.images?.[0] || product.image || "/placeholder.svg")}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute top-3 left-3 bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">NUEVO</div>
                                            <button
                                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
                                                onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                                            >
                                                <Heart className={`w-4 h-4 ${favorites?.includes(product.id) ? "fill-black" : ""}`} />
                                            </button>
                                            <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                                <Button
                                                    className="w-full bg-white/90 text-black hover:bg-white font-bold backdrop-blur-sm text-xs rounded-none"
                                                    style={{
                                                      fontFamily: heroFontFamily(props.heroStyles?.productCardCta?.fontFamily),
                                                      fontSize: props.heroStyles?.productCardCta?.fontSize ? `${props.heroStyles.productCardCta.fontSize}px` : undefined,
                                                      color: props.heroStyles?.productCardCta?.color || undefined,
                                                    }}
                                                >
                                                    {props.heroStyles?.productCardCta?.text || "Agregar +"}
                                                </Button>
                                            </div>
                                        </div>
                                        <h3 className="font-semibold text-gray-900 leading-tight mb-1 text-sm">{product.title || product.name}</h3>
                                        <span className="font-bold text-sm">${product.sale_price_mxn || product.price_mxn || product.price}</span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                    </div>

                    {/* ─── MID-PAGE IMAGE BANNER ─── */}
                    {(textBanner?.isActive !== false) && (
                        <section className="py-10">
                            <div className="w-full h-[55vh] md:h-[75vh] bg-gray-900 relative overflow-hidden">
                                {textBanner?.imageUrl ? (
                                    <>
                                        <img
                                            src={textBanner.imageUrl}
                                            className="w-full h-full object-cover opacity-80 absolute inset-0"
                                            alt="Banner Background"
                                        />
                                        <div className="absolute inset-0 bg-black/40" />
                                    </>
                                ) : secondaryBanner ? (
                                    <img src={secondaryBanner.imageUrl || secondaryBanner.image} className="w-full h-full object-cover opacity-80" alt="Mid Banner" />
                                ) : (
                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                        <span className="text-zinc-600 font-black text-4xl uppercase">Mid Banner</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-10">
                                    {textBanner?.showTitle !== false && (
                                      <h2 className="text-4xl sm:text-5xl md:text-8xl font-black text-white uppercase tracking-tighter break-words mb-6">
                                          {textBanner?.text || "Sin Límites"}
                                      </h2>
                                    )}
                                    {textBanner?.buttonEnabled !== false && (
                                      <Button
                                        className="bg-white text-black text-xs md:text-base px-10 py-5 md:py-7 font-bold uppercase tracking-widest hover:scale-105 transition-transform rounded-none"
                                        onClick={() => {
                                          const action = (textBanner as any)?.buttonAction || 'catalog';
                                          if (action === 'link' && (textBanner as any)?.buttonCustomUrl) {
                                            window.open((textBanner as any).buttonCustomUrl, '_blank', 'noopener,noreferrer');
                                          } else if (action === 'category' && (textBanner as any)?.buttonCategorySlug) {
                                            handleNavigate('/catalogo', { category: (textBanner as any).buttonCategorySlug });
                                          } else {
                                            handleNavigate('/catalogo');
                                          }
                                        }}
                                      >
                                        {textBanner?.buttonLabel || "Explorar Colección"}
                                      </Button>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* ─── Popular / Featured Grid (Populares ahora) ─── */}
                    <div style={{ backgroundColor: props.sectionBg?.section2 || undefined }}>
                    <div className="container mx-auto px-6 py-16" id="popular-grid">
                        {(() => {
                          const s = props.heroStyles || {};
                          const fontTok = heroFontFamily;
                          const sStyle = {
                            fontFamily: fontTok(s?.sectionTitle2?.fontFamily),
                            fontSize: s?.sectionTitle2?.fontSize ? `${s.sectionTitle2.fontSize}px` : undefined,
                            color: s?.sectionTitle2?.color || undefined,
                          };
                          return (
                            <h2 className="text-3xl font-black uppercase mb-8 tracking-tighter" style={sStyle}>
                              {s?.sectionTitle2?.text || "Populares ahora"}
                            </h2>
                          );
                        })()}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(featuredProductIds && featuredProductIds.length > 0) ? (
                                featuredProductIds.map((productId: string) => {
                                    const product = products?.find((p: any) => p.id === productId);
                                    if (!product) return null;
                                    const firstImg = product.images?.[0];
                                    const image = (firstImg && typeof firstImg === 'object') ? firstImg.url : (firstImg || product.image || "/placeholder.svg");
                                    return (
                                        <div key={product.id} className="relative aspect-square md:aspect-[4/3] bg-gray-100 group overflow-hidden cursor-pointer" onClick={() => (props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`))}>
                                            <img src={image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={product.title} />
                                            <div className="absolute bottom-8 left-8 right-8">
                                                <h3 className="text-white text-2xl md:text-3xl font-black uppercase mb-2 drop-shadow-md tracking-tight">{product.title || product.name}</h3>
                                                <span className="text-white underline font-semibold drop-shadow-md text-sm uppercase tracking-wider">Ver ahora</span>
                                            </div>
                                            <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors" />
                                        </div>
                                    );
                                })
                            ) : (
                                <>
                                    <div className="relative aspect-square md:aspect-[4/3] bg-gray-100 group overflow-hidden cursor-pointer">
                                        <img src="/placeholder.svg" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Placeholder" />
                                        <div className="absolute bottom-8 left-8">
                                            <h3 className="text-white text-2xl md:text-3xl font-black uppercase mb-2 tracking-tight">Nueva Llegada</h3>
                                            <span className="text-white underline font-semibold text-sm uppercase tracking-wider">Ver ahora</span>
                                        </div>
                                    </div>
                                    <div className="relative aspect-square md:aspect-[4/3] bg-gray-100 group overflow-hidden cursor-pointer">
                                        <img src="/placeholder.svg" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Placeholder" />
                                        <div className="absolute bottom-8 left-8">
                                            <h3 className="text-white text-2xl md:text-3xl font-black uppercase mb-2 tracking-tight">Colección VIP</h3>
                                            <span className="text-white underline font-semibold text-sm uppercase tracking-wider">Ver ahora</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    </div>
                </>
            )}

            {/* ─── FOOTER ─── */}
            <footer className="text-white pt-16 pb-8" style={{ backgroundColor: props.sectionBg?.footer || footerBgColor }}>
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                        {/* Contact */}
                        <div>
                            <h4
                                className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500"
                                style={{
                                  fontFamily: heroFontFamily(props.heroStyles?.footerHeading1?.fontFamily),
                                  fontSize: props.heroStyles?.footerHeading1?.fontSize ? `${props.heroStyles.footerHeading1.fontSize}px` : undefined,
                                  color: props.heroStyles?.footerHeading1?.color || undefined,
                                }}
                            >
                                {props.heroStyles?.footerHeading1?.text || "Contacto"}
                            </h4>
                            <ul className="space-y-4 text-sm font-medium">
                                {contactData?.whatsapp && (
                                    <li className="flex items-center gap-3">
                                        <a href={`https://wa.me/${contactData.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                                            <span className="text-gray-300">WhatsApp:</span> {contactData.whatsapp}
                                        </a>
                                    </li>
                                )}
                                {contactData?.email && (
                                    <li className="flex items-center gap-3">
                                        <a href={`mailto:${contactData.email}`} className="hover:text-white transition-colors">
                                            <span className="text-gray-300">Email:</span> {contactData.email}
                                        </a>
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* Location */}
                        <div>
                            <h4
                                className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500"
                                style={{
                                  fontFamily: heroFontFamily(props.heroStyles?.footerHeading2?.fontFamily),
                                  fontSize: props.heroStyles?.footerHeading2?.fontSize ? `${props.heroStyles.footerHeading2.fontSize}px` : undefined,
                                  color: props.heroStyles?.footerHeading2?.color || undefined,
                                }}
                            >
                                {props.heroStyles?.footerHeading2?.text || "Ubicación"}
                            </h4>
                            <p className="text-sm font-medium leading-relaxed max-w-xs text-gray-300">
                                {contactData?.address || "Dirección no configurada"}
                            </p>
                        </div>

                        {/* Socials */}
                        <div>
                            <h4
                                className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500"
                                style={{
                                  fontFamily: heroFontFamily(props.heroStyles?.footerHeading3?.fontFamily),
                                  fontSize: props.heroStyles?.footerHeading3?.fontSize ? `${props.heroStyles.footerHeading3.fontSize}px` : undefined,
                                  color: props.heroStyles?.footerHeading3?.color || undefined,
                                }}
                            >
                                {props.heroStyles?.footerHeading3?.text || "Síguenos"}
                            </h4>
                            <div className="flex flex-col gap-3 text-sm">
                                {contactData?.instagram && (
                                    <a href={contactData.instagram} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" style={{ color: footerIconColor, fontSize: `${14 * footerIconScale}px` }}>Instagram</a>
                                )}
                                {contactData?.facebook && (
                                    <a href={contactData.facebook} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" style={{ color: footerIconColor, fontSize: `${14 * footerIconScale}px` }}>Facebook</a>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-600 text-[10px] uppercase tracking-wider">
                        <p>© {new Date().getFullYear()} {settings?.store_name || "Tu Tienda"}. Todos los derechos reservados.</p>
                        <p>Powered by Toogo</p>
                    </div>
                </div>
            </footer>

            {/* ─── CART DRAWER ─── */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[430px] bg-white z-50 transform ${isCartOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out shadow-[0_0_40px_-15px_rgba(0,0,0,0.3)]`}>
                <div className="h-full flex flex-col">
                    <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-xl font-black uppercase tracking-tight">Tu Carrito <span className="text-gray-400 font-normal text-base ml-1">({cartCount})</span></h2>
                        <button onClick={() => setIsCartOpen(false)} className="hover:rotate-90 transition-transform duration-300"><X className="w-7 h-7" /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8">
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
                        <div className="p-6 md:p-8 border-t border-gray-100">
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
            {isCartOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300" onClick={() => setIsCartOpen(false)} />}
            <CheckoutModal open={showCheckout} onOpenChange={setShowCheckout} />
        </div>
    );
};
