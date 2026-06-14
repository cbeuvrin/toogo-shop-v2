import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingCart, Heart, Search, Menu, X, User, ChevronRight, Play } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { LogoDisplay } from "@/components/ui/LogoDisplay";
import { CheckoutModal } from "@/components/cart/CheckoutModal";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { heroFontFamily } from "@/lib/heroFonts";

export const SimpleLiveTemplate = (props: any) => {
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
        products: catalogProducts
    } = props;

    const settings = effectiveSettings || storeData?.settings || {};
    const hideNav = useHideOnScroll();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const activeCategory = searchParams.get('category');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showMobileSearch, setShowMobileSearch] = useState(false);

    const handleNavigate = (path: string, params: Record<string, string> = {}) => {
        const newParams = new URLSearchParams();

        // Preserve host param - try hook first, then window location fallback
        const currentUrlParams = new URLSearchParams(window.location.search);
        const host = searchParams.get('host') || currentUrlParams.get('host');

        if (host) {
            newParams.set('host', host);
        }

        // Add new params
        Object.entries(params).forEach(([key, value]) => {
            if (value) newParams.set(key, value);
        });

        const queryString = newParams.toString();
        const fullPath = `${path}${queryString ? `?${queryString}` : ''}`;
        navigate(fullPath);
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

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = direction === 'left' ? -300 : 300;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

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

    const mainBanner = banners?.[0];
    const secondaryBanner = banners?.[1] || banners?.[0]; // Use second banner or fallback

    const isCatalog = view === 'catalog';
    const displayProducts = isCatalog ? (catalogProducts || []) : products;

    // Extract visual settings
    const headerIconColor = settings?.header_icon_color || '#000000';
    const headerIconScale = settings?.header_icon_scale || 1;
    const footerBgColor = settings?.footer_bg_color || '#000000';
    const footerIconColor = settings?.footer_icon_color || '#ffffff';
    const footerIconScale = settings?.footer_icon_scale || 1;
    const cardBgColor = settings?.product_card_bg_color || '#ffffff'; // Start white
    const cardHoverColor = settings?.product_card_hover_color || '#000000'; // Hover black

    // Product Card Component
    const ProductCard = ({ product }: { product: any }) => {
        const isService = product.product_type === 'service';
        const pricingMode = isService ? (product.pricing_mode || 'fixed') : 'fixed';
        const isQuoteOnly = isService && pricingMode === 'quote';
        const basePrice = product.price_mxn || product.price;
        const displayPrice = !isService ? (product.sale_price_mxn || basePrice) : basePrice;
        return (
        <div className="w-full group cursor-pointer" onClick={() => (props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`))}>
            <div className="relative aspect-[3/4] rounded-sm overflow-hidden mb-4 transition-colors duration-300" style={{ backgroundColor: cardBgColor }}>
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
                <h3 className="font-bold text-gray-900 leading-tight mb-1">{product.title || product.name}</h3>
                {isQuoteOnly ? (
                    <span className="font-bold italic">A cotizar</span>
                ) : isService && pricingMode === 'starting_from' ? (
                    <span className="font-bold">Desde ${displayPrice} MXN</span>
                ) : isService ? (
                    <span className="font-bold">${displayPrice} MXN</span>
                ) : (
                    <span className="font-bold">${displayPrice}</span>
                )}
            </div>
        </div>
        );
    };

    return (
        <div className="min-h-screen font-sans text-black" style={{ backgroundColor: settings?.store_background_color || '#ffffff' }}>
            {/* Top Bar */}
            {(announcement?.enabled !== false) && (
                <div className="bg-gray-100 py-2 text-center text-xs font-semibold tracking-wide" style={{ ...(announcement?.bgColor ? { backgroundColor: announcement.bgColor } : {}), ...(announcement?.textColor ? { color: announcement.textColor } : {}) }}>
                    {announcement?.text || "¡Nuevos estilos cada semana! Visita el catálogo y encuentra tu look 👯‍♀️"}
                </div>
            )}

            {/* Header */}
            <header className={`sticky top-0 z-50 border-b border-transparent transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${hideNav ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`} style={{ backgroundColor: props.sectionBg?.navbar || settings?.navbar_bg_color || '#ffffff' }}>
                <div className="w-full px-6 h-20 flex items-center justify-between">



                    {/* Left Nav (Desktop) - Only on Home View */}
                    {!isCatalog ? (
                        <nav className="hidden md:flex gap-8 text-sm font-semibold text-gray-700" style={styleFor('navMenu')}>
                            {categories?.filter((cat: any) => !cat.parent_id && cat.show_on_home !== false).map((cat: any) => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleNavigate('/catalogo', { category: cat.name.toLowerCase() })}
                                    className="hover:text-black transition-colors uppercase"
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </nav>
                    ) : (
                        // Placeholder to keep Right Icons on the right
                        <div className="hidden md:block w-px" />
                    )}

                    {/* Mobile Menu Button */}
                    <button className="md:hidden" onClick={() => setIsMenuOpen(true)}>
                        <Menu className="w-6 h-6" style={{ color: headerIconColor }} />
                    </button>

                    {/* Mobile Menu Drawer */}
                    {isMenuOpen && (
                        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setIsMenuOpen(false)}>
                            <div className="fixed right-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between p-6 border-b">
                                    <span className="font-bold uppercase tracking-widest text-gray-900">Menú</span>
                                    <button onClick={() => setIsMenuOpen(false)}><X className="w-6 h-6 text-gray-900" /></button>
                                </div>
                                <nav className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {categories?.filter((cat: any) => !cat.parent_id && cat.show_on_home !== false).map((cat: any) => (
                                        <button key={cat.id} onClick={() => { handleNavigate('/catalogo', { category: cat.slug || cat.name }); setIsMenuOpen(false); }} className="block w-full text-left text-lg font-semibold text-gray-900 hover:text-gray-600">{cat.name}</button>
                                    ))}
                                    <button onClick={() => { handleNavigate('/catalogo'); setIsMenuOpen(false); }} className="block w-full text-left text-lg font-semibold text-gray-900 hover:text-gray-600">Ver catálogo</button>
                                </nav>
                            </div>
                        </div>
                    )}

                    {/* Logo (Center) */}
                    <div className="absolute left-1/2 -translate-x-1/2 cursor-pointer" onClick={() => handleNavigate('/tienda')}>
                        <LogoDisplay
                            logoUrl={settings?.logo_url}
                            fallbackText={settings?.store_name || 'LOGO'}
                            disableFetch={true}
                        logoSize={settings?.logo_size}
                        logoSizeMobile={(settings as any)?.logo_size_mobile}
                        logoSizeTablet={(settings as any)?.logo_size_tablet}
                            className="text-2xl font-extrabold uppercase tracking-tighter"
                        />
                    </div>

                    {/* Right Icons */}
                    <div className="flex items-center gap-6">
                        <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 hover:bg-gray-200 transition-colors w-64" style={{ height: `${40 * headerIconScale}px` }}>
                            <Search className="text-gray-500" style={{ color: headerIconColor, width: `${16 * headerIconScale}px`, height: `${16 * headerIconScale}px` }} />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="bg-transparent border-none outline-none text-sm placeholder:text-gray-500 w-full text-gray-700"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ fontSize: `${14 * headerIconScale}px` }}
                            />
                        </form>
                        <button className="md:hidden" onClick={() => setShowMobileSearch(!showMobileSearch)}>
                            <Search style={{ color: headerIconColor, width: `${24 * headerIconScale}px`, height: `${24 * headerIconScale}px` }} />
                        </button>
                        <Heart
                            className="hidden md:block cursor-pointer hover:scale-110 transition-transform"
                            style={{ color: headerIconColor, width: `${24 * headerIconScale}px`, height: `${24 * headerIconScale}px` }}
                        />
                        <User
                            className="cursor-pointer hover:scale-110 transition-transform"
                            style={{ color: headerIconColor, width: `${24 * headerIconScale}px`, height: `${24 * headerIconScale}px` }}
                        />
                        <div className="relative cursor-pointer hover:scale-110 transition-transform" onClick={() => setIsCartOpen(true)}>
                            <ShoppingCart
                                style={{ color: headerIconColor, width: `${24 * headerIconScale}px`, height: `${24 * headerIconScale}px` }}
                            />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                                    {cartCount}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {/* Mobile Search Overlay */}
                {
                    showMobileSearch && (
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
                    )
                }
            </header >



            {/* Hero Section */}
            <div className="relative w-full aspect-[4/3] md:aspect-[21/9] bg-gray-200 overflow-hidden" >
                <img
                    src={mainBanner?.imageUrl || mainBanner?.image || "/placeholder.svg"}
                    alt="Hero"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-8 md:p-16">
                    <h1 className="text-white text-4xl md:text-6xl font-extrabold uppercase mb-4 max-w-2xl leading-tight" style={styleFor('title')}>
                        {props.welcomeTitle || settings?.welcome_title || "Para Nuestros Atletas Híbridos"}
                    </h1>
                    <p className="text-white/90 text-sm md:text-lg mb-8 max-w-xl font-medium" style={styleFor('message')}>
                        {props.welcomeMessage || settings?.welcome_message || "Cuando lo das todo, tu equipo también debería hacerlo. Echa un vistazo a nuestros estilos más queridos."}
                    </p>
                    {(els?.cta1?.enabled !== false) && (
                        <div className="flex gap-4">
                            <Button
                                className="bg-white text-black hover:bg-gray-100 font-bold rounded-full px-10 py-6 text-base border-2 border-white uppercase tracking-wider"
                                style={styleFor('cta1')}
                                onClick={ctaClick('cta1')}
                            >
                                {props.cta1Label || 'TIENDA'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Category Navigation Bar - Only on Catalog View — inherits products-section bg */}
            {isCatalog && (
                <div style={{ backgroundColor: props.sectionBg?.section1 || undefined }}>
                <div className="container mx-auto px-6 py-8">
                    <div className="flex flex-wrap justify-center gap-4">
                        {categories?.filter((cat: any) => !cat.parent_id && cat.show_on_home !== false).map((cat: any) => {
                            const isActive = activeCategory === cat.name.toLowerCase();
                            return (
                                <Button
                                    key={cat.id}
                                    onClick={() => handleNavigate('/catalogo', { category: cat.name.toLowerCase() })}
                                    className={`${isActive ? 'bg-zinc-600 border-zinc-600' : 'bg-black border-black'} text-white hover:bg-zinc-800 font-bold rounded-full px-6 py-3 text-sm border-2 uppercase tracking-wider transition-all hover:scale-105`}
                                >
                                    {cat.name}
                                </Button>
                            );
                        })}
                        <Button
                            onClick={() => handleNavigate('/catalogo')}
                            className={`${!activeCategory || activeCategory === 'all' ? 'bg-zinc-600 border-zinc-600' : 'bg-black border-black'} text-white hover:bg-zinc-800 font-bold rounded-full px-6 py-3 text-sm border-2 uppercase tracking-wider transition-all hover:scale-105`}
                        >
                            Todos
                        </Button>
                    </div>
                </div>
                </div>
            )}

            {
                isCatalog ? (
                    <div style={{ backgroundColor: props.sectionBg?.section1 || undefined }}>
                    <div className="container mx-auto px-6 py-12 min-h-[60vh]">
                        <h1 className="text-3xl font-extrabold uppercase mb-8">Catálogo</h1>
                        {displayProducts.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
                                {displayProducts.map((product: any) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-gray-50 rounded-lg">
                                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg font-medium">No se encontraron productos.</p>
                                <Button variant="link" onClick={() => handleNavigate('/tienda')} className="mt-2">
                                    Volver al inicio
                                </Button>
                            </div>
                        )}
                    </div>
                    </div>
                ) : (
                    <>

                        {/* Scrolling Ticker / USPs */}
                        {
                            (ticker?.enabled !== false) && (
                                <div
                                    className="bg-black text-white py-3 overflow-hidden whitespace-nowrap"
                                    style={{
                                        ...(ticker?.bgColor ? { backgroundColor: ticker.bgColor } : {}),
                                        ...(ticker?.textColor ? { color: ticker.textColor } : {}),
                                    }}
                                >
                                    {ticker?.animated === false ? (
                                        <div
                                            className={`flex justify-center font-bold uppercase tracking-widest ${ticker?.fontSize ? '' : 'text-xs'}`}
                                            style={ticker?.fontSize ? { fontSize: `${ticker.fontSize}px` } : undefined}
                                        >
                                            <span>{ticker?.text || "Nuevos estilos cada semana"}</span>
                                        </div>
                                    ) : (
                                        <div
                                            className={`flex gap-16 justify-center font-bold uppercase tracking-widest animate-marquee ${ticker?.fontSize ? '' : 'text-xs'}`}
                                            style={ticker?.fontSize ? { fontSize: `${ticker.fontSize}px` } : undefined}
                                        >
                                            <span>{ticker?.text || "Nuevos estilos cada semana"}</span>
                                            <span>•</span>
                                            <span>{ticker?.text || "Nuevos estilos cada semana"}</span>
                                            <span>•</span>
                                            <span>{ticker?.text || "Nuevos estilos cada semana"}</span>
                                            <span>•</span>
                                            <span>{ticker?.text || "Nuevos estilos cada semana"}</span>
                                        </div>
                                    )}
                                </div>
                            )
                        }

                        {/* Product Section Header */}
                        <section style={{ backgroundColor: props.sectionBg?.section1 || undefined }}>
                        <div className="container mx-auto px-6 py-12 flex items-end justify-between">
                            <div>
                                <h2 className="text-3xl font-extrabold uppercase mb-2" style={styleFor('sectionTitle1')}>{els?.sectionTitle1?.text || 'Recién Llegados'}</h2>
                                <button onClick={() => handleNavigate('/catalogo')} className="text-sm font-semibold underline underline-offset-4 hover:text-gray-600" style={styleFor('sectionLink1')}>{els?.sectionLink1?.text || 'Ver todo'}</button>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => scroll('left')} className="rounded-full border-gray-300 hover:bg-gray-100"><ChevronRight className="w-5 h-5 rotate-180" /></Button>
                                <Button variant="outline" size="icon" onClick={() => scroll('right')} className="rounded-full border-gray-300 hover:bg-gray-100"><ChevronRight className="w-5 h-5" /></Button>
                            </div>
                        </div>

                        {/* Product Grid (Horizontal Scroll on Mobile) */}
                        <div id="products-grid" ref={scrollContainerRef} className="container mx-auto px-6 pb-20 overflow-x-auto pb-8 hide-scrollbar">
                            <div className="flex gap-6 min-w-max">
                                {(() => {
                                    const newArrivals = products?.filter((p: any) => p.features?.includes("new_arrival")) || [];
                                    const productsToShow = newArrivals.length > 0 ? newArrivals : products?.slice(0, 4);

                                    return productsToShow.map((product: any) => {
                                        const isNew = product.features?.includes("new_arrival");
                                        const isVariable = Array.isArray(product.variations) && product.variations.length > 0;
                                        const isService = product.product_type === 'service';
                                        return (
                                        <div key={product.id} className="w-[280px] md:w-[320px] group cursor-pointer" onClick={() => (props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`))}>
                                            <div className="relative aspect-[3/4] bg-gray-100 rounded-sm overflow-hidden mb-4">
                                                <img
                                                    src={(product.images?.[0] && typeof product.images[0] === 'object') ? product.images[0].url : (product.images?.[0] || product.image || "/placeholder.svg")}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                                {isNew && (
                                                    <div className="absolute top-3 left-3 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                                                        Nuevo
                                                    </div>
                                                )}
                                                <button
                                                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                                                >
                                                    <Heart className={`w-4 h-4 ${favorites?.includes(product.id) ? "fill-black" : ""}`} />
                                                </button>
                                                {!isService && (
                                                    <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                                        <Button
                                                            className="w-full bg-white/90 text-black hover:bg-white font-bold backdrop-blur-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isVariable) {
                                                                    props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`);
                                                                } else {
                                                                    addToCart(product);
                                                                }
                                                            }}
                                                        >
                                                            {isVariable ? 'Ver opciones' : 'Quick Add +'}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 leading-tight mb-1">{product.title || product.name}</h3>
                                                <span className="font-bold">${product.sale_price_mxn || product.price_mxn || product.price}</span>
                                            </div>
                                        </div>
                                        );
                                    })
                                })()}
                            </div>
                        </div>
                        </section>

                        {/* Mid Page Banner */}
                        {/* Mid Page Banner */}
                        {
                            (textBanner?.isActive !== false) && (
                                <section className="py-10">
                                    <div className="w-full h-[60vh] md:h-[80vh] bg-gray-900 relative">
                                        {textBanner?.imageUrl ? (
                                            <>
                                                <img
                                                    src={textBanner.imageUrl}
                                                    className="w-full h-full object-contain lg:object-cover opacity-80 absolute inset-0"
                                                    alt="Banner Background"
                                                />
                                                <div className="absolute inset-0 bg-black/40" />
                                            </>
                                        ) : secondaryBanner ? (
                                            <img src={secondaryBanner.imageUrl || secondaryBanner.image} className="w-full h-full object-contain lg:object-cover opacity-80" />
                                        ) : (
                                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                <span className="text-zinc-600 font-bold text-4xl uppercase">Área de Banner</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-10">
                                            <h2 className="text-4xl sm:text-5xl md:text-8xl font-black text-white uppercase italic tracking-tighter break-words mb-6">
                                                {textBanner?.text || "Sin Límites"}
                                            </h2>
                                            {(els?.midBannerCta?.enabled !== false) && (
                                                <Button
                                                    className="bg-white text-black text-lg px-10 py-7 rounded-full font-bold hover:scale-105 transition-transform"
                                                    style={styleFor('midBannerCta')}
                                                    onClick={ctaClick('midBannerCta')}
                                                >
                                                    {els?.midBannerCta?.text || 'Ver Colección'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            )
                        }

                        {/* Popular Categories Grid */}
                        <section style={{ backgroundColor: props.sectionBg?.section2 || undefined }}>
                        <div className="container mx-auto px-6 py-20" id="popular-grid">
                            <h2 className="text-3xl font-extrabold uppercase mb-8" style={styleFor('sectionTitle2')}>{els?.sectionTitle2?.text || 'Popular en este momento'}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Dynamic Featured Products */}
                                {(props.featuredProducts && props.featuredProducts.length > 0) ? (
                                    props.featuredProducts.map((productId: string) => {
                                        const product = props.products.find((p: any) => p.id === productId);

                                        if (!product) return null;

                                        // Determine image to show
                                        const firstImg = product.images?.[0];
                                        const image = (firstImg && typeof firstImg === 'object') ? firstImg.url : (firstImg || product.image || "/placeholder.svg");

                                        return (
                                            <div key={product.id} className="relative aspect-square md:aspect-[4/3] bg-gray-100 group overflow-hidden cursor-pointer" onClick={() => (props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`))}>
                                                <img src={image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                <div className="absolute bottom-8 left-8">
                                                    <h3 className="text-white text-3xl font-bold uppercase mb-2 drop-shadow-md">{product.title || product.name}</h3>
                                                    <span className="text-white underline font-semibold drop-shadow-md">Ver ahora</span>
                                                </div>
                                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                                            </div>
                                        );
                                    })
                                ) : (
                                    // Fallback if no products selected
                                    <>
                                        <div className="relative aspect-square md:aspect-[4/3] bg-gray-100 group overflow-hidden cursor-pointer">
                                            <img src="/placeholder.svg" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                            <div className="absolute bottom-8 left-8">
                                                <h3 className="text-white text-3xl font-bold uppercase mb-2">Sudaderas Hombre</h3>
                                                <span className="text-white underline font-semibold">Ver ahora</span>
                                            </div>
                                        </div>
                                        <div className="relative aspect-square md:aspect-[4/3] bg-gray-100 group overflow-hidden cursor-pointer">
                                            <img src="/placeholder.svg" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                            <div className="absolute bottom-8 left-8">
                                                <h3 className="text-white text-3xl font-bold uppercase mb-2">Leggings Mujer</h3>
                                                <span className="text-white underline font-semibold">Ver ahora</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        </section>
                    </>
                )
            }

            {/* Footer */}
            <footer className="text-white pt-16 pb-8" style={{ backgroundColor: props.sectionBg?.footer || footerBgColor }}>
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                        {/* Contact Column */}
                        <div>
                            <h4 className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500" style={styleFor('footerHeading1')}>{els?.footerHeading1?.text || 'Contacto'}</h4>
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
                                        <span className="text-gray-300">Email:</span> {contactData.email}
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* Location Column */}
                        <div>
                            <h4 className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500" style={styleFor('footerHeading2')}>{els?.footerHeading2?.text || 'Ubicación'}</h4>
                            <p className="text-sm font-medium leading-relaxed max-w-xs text-gray-300">
                                {contactData?.address || <span className="text-zinc-600 italic">Agrega tu dirección</span>}
                            </p>
                        </div>

                        {/* Socials Column */}
                        <div>
                            <h4 className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500" style={styleFor('footerHeading3')}>{els?.footerHeading3?.text || 'Síguenos'}</h4>
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

                    <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-600 text-[10px] uppercase tracking-wider">
                        <p>© {new Date().getFullYear()} {settings?.store_name || "Tu Tienda"}. Todos los derechos reservados.</p>
                        <p>Powered by Toogo</p>
                    </div>
                </div>
            </footer>


            {/* Cart Drawer - Simple Live (Bold/Sports Design) */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[450px] bg-white z-50 transform ${isCartOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out shadow-[0_0_40px_-15px_rgba(0,0,0,0.3)]`}>
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="p-6 md:p-8 border-b-2 border-black/5 flex justify-between items-center bg-zinc-50">
                        <h2 className="text-2xl font-extrabold uppercase tracking-tighter italic">Tu Carrito <span className="text-zinc-400 not-italic font-normal text-lg ml-2">({cartCount})</span></h2>
                        <button onClick={() => setIsCartOpen(false)} className="hover:rotate-90 transition-transform duration-300"><X className="w-8 h-8" /></button>
                    </div>

                    {/* Items */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8">
                        {cartItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                                <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center">
                                    <ShoppingCart className="w-8 h-8 text-zinc-400" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold uppercase mb-2">Tu carrito está vacío</p>
                                    <p className="text-zinc-500">¿Listo para mejorar tu equipo?</p>
                                </div>
                                <Button
                                    onClick={() => { setIsCartOpen(false); handleNavigate('/catalogo'); }}
                                    className="bg-black text-white hover:bg-zinc-800 font-bold uppercase px-8 py-6 rounded-full"
                                >
                                    Ir a la Tienda
                                </Button>
                            </div>
                        ) : (
                            <ul className="space-y-8">
                                {cartItems.map((item: any) => (
                                    <li key={item.id} className="flex gap-6 animate-in slide-in-from-right-10 duration-500 fade-in">
                                        <div className="relative w-24 aspect-[3/4] bg-zinc-100 rounded-sm overflow-hidden flex-shrink-0">
                                            <img
                                                src={item.image || item.images?.[0] || '/placeholder.svg'}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between py-1">
                                            <div>
                                                <div className="flex justify-between items-start gap-4 mb-2">
                                                    <h3 className="font-bold text-lg leading-tight uppercase">{item.name}</h3>
                                                    <span className="font-bold text-lg">${((item.price_mxn || item.price || 0) * item.quantity).toFixed(2)}</span>
                                                </div>
                                                <p className="text-sm text-zinc-500">Talla: Única</p>
                                            </div>

                                            <div className="flex justify-between items-end">
                                                <div className="flex items-center gap-4 bg-zinc-100 rounded-full px-3 py-1">
                                                    <button
                                                        className="w-6 h-6 flex items-center justify-center font-bold text-lg hover:text-zinc-600"
                                                        onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                                                    >-</button>
                                                    <span className="font-bold w-4 text-center">{item.quantity}</span>
                                                    <button
                                                        className="w-6 h-6 flex items-center justify-center font-bold text-lg hover:text-zinc-600"
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    >+</button>
                                                </div>
                                                <button onClick={() => removeItem(item.id)} className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wide border-b border-red-200">
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Footer - Checkout */}
                    {cartItems.length > 0 && (
                        <div className="p-6 md:p-8 bg-zinc-50 border-t border-zinc-200">
                            <div className="flex justify-between items-center mb-6">
                                <span className="font-bold text-zinc-500 uppercase tracking-wider text-sm">Subtotal</span>
                                <span className="font-extrabold text-2xl">${(cartTotal || 0).toFixed(2)}</span>
                            </div>
                            <Button onClick={() => { setIsCartOpen(false); setShowCheckout(true); }} className="w-full bg-black text-white hover:bg-zinc-800 font-bold uppercase rounded-full py-7 text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                                Finalizar Compra
                            </Button>
                            <p className="text-center text-xs text-zinc-400 mt-4">Impuestos y envío calculados al finalizar.</p>
                        </div>
                    )}
                </div>
            </div>
            {/* Overlay */}
            {isCartOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300" onClick={() => setIsCartOpen(false)} />}
            <CheckoutModal open={showCheckout} onOpenChange={setShowCheckout} />
        </div >
    );
};
