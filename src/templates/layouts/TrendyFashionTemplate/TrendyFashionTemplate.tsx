// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingCart, Heart, Search, Menu, X, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { LogoDisplay } from "@/components/ui/LogoDisplay";
import { CheckoutModal } from "@/components/cart/CheckoutModal";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { heroFontFamily } from "@/lib/heroFonts";
import { footerTextColors } from "@/utils/contrastColor";
import { getHeroShapeRadius } from "@/lib/heroShapes";

export const TrendyFashionTemplate = (props: any) => {
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
        view = 'home',
        products: catalogProducts
    } = props;

    const settings = effectiveSettings || storeData?.settings || {};
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const activeCategory = searchParams.get('category');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [heroIndex, setHeroIndex] = useState(0);
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
    // "Nueva Colección" grid: hand-picked featured products when chosen in the
    // editor, otherwise the first 8 products as fallback.
    const featuredIds = props.featuredProducts;
    const homeProducts = (featuredIds && featuredIds.length > 0)
        ? featuredIds.map((id: string) => (products || []).find((p: any) => p.id === id)).filter(Boolean)
        : (products || []).slice(0, 8);

    // Extract settings
    const headerIconColor = settings?.header_icon_color || '#1a3a3a';
    const headerIconScale = settings?.header_icon_scale || 1;
    const footerBgColor = settings?.footer_bg_color || '#1a3a3a';
    const footerCol = footerTextColors(props.sectionBg?.footer || footerBgColor);
    const footerIconColor = settings?.footer_icon_color || '#ffffff';
    const footerIconScale = settings?.footer_icon_scale || 1;
    const cardBgColor = settings?.product_card_bg_color || '#f8f8f8';
    const cardHoverColor = settings?.product_card_hover_color || '#1a3a3a';

    const heroTitle = props.welcomeTitle || settings?.welcome_title || 'Los Mejores Productos\nPara Ti';
    const heroMessage = props.welcomeMessage || settings?.welcome_message || 'Descubre nuestra colección diseñada para cada ocasión.';

    // Indico-level per-element styles (hero.styles[key]) + per-section backgrounds.
    // Everything is an optional override — undefined keeps the template's default look.
    const els = props.heroStyles || {};
    const styleFor = (k: string) => ({
        fontFamily: heroFontFamily(els?.[k]?.fontFamily),
        fontSize: els?.[k]?.fontSize ? `${els[k].fontSize}px` : undefined,
        color: els?.[k]?.color || undefined,
        backgroundColor: els?.[k]?.bgColor || undefined,
    });
    // Buttons can route to catalog / a category / a custom link (same as Indico).
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

    // Real hero carousel: the arrows cycle through every uploaded banner
    // (up to 3 slots in the banners editor for this template).
    const totalHeroSlides = Math.max(banners?.length || 1, 1);
    const heroBanner = banners?.[heroIndex % totalHeroSlides] || banners?.[0];
    const topCategories = categories?.filter((c: any) => !c.parent_id && c.show_on_home !== false).slice(0, 6) || [];

    // CSS for circular rotating text
    const circularTextCSS = `
      @keyframes rotate-text {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .rotating-badge {
        animation: rotate-text 10s linear infinite;
      }
      @keyframes trendy-marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .trendy-ticker {
        animation: trendy-marquee 20s linear infinite;
      }
    `;

    // Product Card
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
            <div
                className="relative aspect-[3/4] overflow-hidden rounded-2xl mb-3 transition-all duration-500"
                style={{ backgroundColor: cardBgColor }}
            >

                <img
                    src={(product.images?.[0] && typeof product.images[0] === 'object') ? product.images[0].url : (product.images?.[0] || product.image || '/placeholder.svg')}
                    alt={product.title || product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <button
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    onClick={(e) => { e.stopPropagation(); toggleFavorite?.(product.id); }}
                >
                    <Heart className={`w-4 h-4 ${favorites?.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                </button>
            </div>
            <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{settings?.store_name || 'Brand'}</p>
                <h3 className="font-medium text-gray-900 text-sm leading-snug line-clamp-2 mb-1 group-hover:text-gray-600">{product.title || product.name}</h3>
                {isQuoteOnly ? (
                    <span className="font-bold text-gray-900 text-sm italic">A cotizar</span>
                ) : isService && pricingMode === 'starting_from' ? (
                    <span className="font-bold text-gray-900 text-sm">Desde ${displayPrice} MXN</span>
                ) : isService ? (
                    <span className="font-bold text-gray-900 text-sm">${displayPrice} MXN</span>
                ) : (
                    <span className="font-bold text-gray-900 text-sm">{product.priceVaries ? 'Desde ' : ''}${displayPrice}</span>
                )}
            </div>
        </div>
        );
    };

    const heroShapeRadius = getHeroShapeRadius(props.heroShape || settings?.hero_image_shape || 'organic');

    return (
        <div className="min-h-screen font-sans text-gray-900" style={{ backgroundColor: settings?.store_background_color || '#e8f0ef' }}>
            <style>{circularTextCSS}</style>

            {/* Announcement Bar */}
            {announcement?.enabled !== false && announcement?.text && (
                <div className="bg-gray-800 text-white text-center py-2 text-xs font-medium tracking-wide" style={{ ...(announcement?.bgColor ? { backgroundColor: announcement.bgColor } : {}), ...(announcement?.textColor ? { color: announcement.textColor } : {}) }}>
                    {announcement.text}
                </div>
            )}

            {/* Header */}
            <header className={`sticky top-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${hideNav ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`} style={{ backgroundColor: props.sectionBg?.navbar || settings?.navbar_bg_color || 'transparent' }}>
                {/* Logo */}
                <div className="cursor-pointer" onClick={() => handleNavigate('/tienda')}>
                    <LogoDisplay
                        logoUrl={settings?.logo_url}
                        fallbackText={settings?.store_name || 'LOGO'}
                        disableFetch={true}
                        logoSize={settings?.logo_size}
                        logoSizeMobile={(settings as any)?.logo_size_mobile}
                        logoSizeTablet={(settings as any)?.logo_size_tablet}
                        className="text-2xl font-serif font-bold tracking-tight text-gray-900"
                    />
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700" style={styleFor('navMenu')}>
                    {topCategories.slice(0, 5).map((cat: any) => (
                        <button
                            key={cat.id}
                            onClick={() => handleNavigate('/catalogo', { category: cat.name.toLowerCase() })}
                            className="hover:text-gray-900 transition-colors"
                        >
                            {cat.name}
                        </button>
                    ))}
                    {topCategories.length === 0 && (
                        <>
                            <button className="hover:text-gray-900 transition-colors">Belleza</button>
                            <button className="hover:text-gray-900 transition-colors">Hombre</button>
                            <button className="hover:text-gray-900 transition-colors">Mujer</button>
                            <button className="hover:text-gray-900 transition-colors">Niños</button>
                            <button className="hover:text-gray-900 transition-colors">Soporte</button>
                            <button className="hover:text-gray-900 transition-colors">Nosotros</button>
                        </>
                    )}
                </nav>

                {/* Right Icons */}
                <div className="flex items-center gap-4">
                    <div
                        className="relative cursor-pointer hover:scale-110 transition-transform"
                        onClick={() => setIsCartOpen(true)}
                    >
                        <ShoppingCart
                            style={{ color: headerIconColor, width: `${22 * headerIconScale}px`, height: `${22 * headerIconScale}px` }}
                        />
                        {cartCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-gray-900 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full">
                                {cartCount}
                            </span>
                        )}
                    </div>
                    <Heart
                        className="hidden md:block cursor-pointer hover:scale-110 transition-transform"
                        style={{ color: headerIconColor, width: `${22 * headerIconScale}px`, height: `${22 * headerIconScale}px` }}
                    />
                    <button
                        onClick={() => handleNavigate('/catalogo')}
                        className="hidden md:flex items-center gap-2 bg-gray-900 text-white text-xs font-semibold px-5 py-2.5 rounded-full hover:bg-gray-700 transition-colors"
                    >
                        Contacto
                    </button>
                    <button className="md:hidden" onClick={() => setIsMenuOpen(true)}>
                        <Menu style={{ color: headerIconColor, width: `${22 * headerIconScale}px`, height: `${22 * headerIconScale}px` }} />
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            {!isCatalog && (
                <section className="relative w-full min-h-[80vh] flex flex-col lg:flex-row items-center px-6 lg:px-16 py-8 lg:py-0 overflow-hidden" style={{ backgroundColor: props.sectionBg?.hero || undefined }}>
                    {/* Left Content */}
                    <div className="w-full lg:w-1/2 z-10 flex flex-col justify-center py-8 lg:py-20 lg:order-1">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight mb-8 text-gray-900 whitespace-pre-line" style={styleFor('title')}>
                            {heroTitle}
                        </h1>

                        {/* CTA buttons */}
                        <div className="flex gap-4 mb-8">
                            {(els?.cta1?.enabled !== false) && (
                                <button
                                    onClick={ctaClick('cta1')}
                                    className="bg-gray-900 text-white px-8 py-3 rounded-none text-sm font-semibold hover:bg-gray-700 transition-colors"
                                    style={styleFor('cta1')}
                                >
                                    {props.cta1Label || 'Ver Ahora'}
                                </button>
                            )}
                            {(els?.cta2?.enabled !== false) && (
                                <button
                                    onClick={ctaClick('cta2')}
                                    className="border border-gray-900 text-gray-900 px-8 py-3 rounded-none text-sm font-semibold hover:bg-gray-900 hover:text-white transition-colors"
                                    style={styleFor('cta2')}
                                >
                                    {props.cta2Label || 'Nueva Colección'}
                                </button>
                            )}
                        </div>

                        {/* Promotional text — custom override renders as plain text */}
                        <p className="text-sm text-gray-600" style={styleFor('promoText')}>
                            {els?.promoText?.text
                                ? els.promoText.text
                                : (<>¡Ahorra <span className="text-xl font-bold text-gray-900">20% Ahora!</span></>)}
                        </p>

                        {/* Decorative star */}
                        <div className="absolute left-[45%] top-[35%] hidden lg:block text-gray-400 opacity-60 text-2xl pointer-events-none select-none">✦</div>
                    </div>

                    {/* Right: Hero Image */}
                    <div className="w-full lg:w-1/2 flex items-center justify-center relative lg:order-2">
                        {/* Circular rotating badge */}
                        <div className="absolute top-8 right-8 lg:top-10 lg:right-10 z-20 w-20 h-20">
                            <svg viewBox="0 0 100 100" className="w-full h-full rotating-badge">
                                <defs>
                                    <path id="circle-path" d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
                                </defs>
                                <text className="fill-gray-600" fontSize="10.5" letterSpacing="3.5">
                                    <textPath href="#circle-path">{settings?.store_name ? `${settings.store_name} • ${settings.store_name} • ` : 'Fashion • Fashion • Fashion • '}</textPath>
                                </text>
                                <circle cx="50" cy="50" r="8" fill="#f5e6d3" />
                            </svg>
                        </div>

                        {/* Image container with shape selector */}
                        <div className="relative w-72 h-96 lg:w-80 lg:h-[480px] mt-8 lg:mt-0 flex items-center justify-center">
                            <div
                                className="w-full h-full overflow-hidden shadow-2xl transition-transform duration-500"
                                style={{
                                    borderRadius: heroShapeRadius,
                                    backgroundColor: '#f5e6d3',
                                    transform: `scale(${(props.heroShapeScale || 100) / 100})`
                                }}
                            >
                                {heroBanner ? (
                                    <img
                                        key={heroIndex}
                                        src={heroBanner.imageUrl || heroBanner.image}
                                        alt="Hero"
                                        className="w-full h-full object-cover transition-transform duration-700 animate-in fade-in"
                                        style={{ objectPosition: heroBanner.position || 'center' }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User className="w-24 h-24 text-gray-300" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Slide counter */}
                        <div className="absolute bottom-4 right-4 lg:bottom-10 lg:right-2 text-right">
                            <p className="text-lg font-semibold text-gray-700">
                                <span className="text-gray-900">0{(heroIndex % totalHeroSlides) + 1}</span>/ {totalHeroSlides < 10 ? `0${totalHeroSlides}` : totalHeroSlides}
                            </p>
                        </div>

                        {/* Navigation arrows — only when there's something to cycle */}
                        {totalHeroSlides > 1 && (
                            <div className="absolute bottom-4 right-20 lg:bottom-10 lg:right-24 flex gap-2">
                                <button
                                    onClick={() => setHeroIndex(prev => (prev - 1 + totalHeroSlides) % totalHeroSlides)}
                                    className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors text-xs"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setHeroIndex(prev => (prev + 1) % totalHeroSlides)}
                                    className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors text-xs"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Ticker */}
            {ticker?.enabled !== false && !isCatalog && (
                <div
                    className="border-y border-gray-300 bg-white py-3 overflow-hidden"
                    style={ticker?.bgColor ? { backgroundColor: ticker.bgColor } : undefined}
                >
                    {ticker?.animated === false ? (
                        <div className="flex justify-center whitespace-nowrap">
                            <span
                                className={`font-bold uppercase tracking-widest text-gray-500 ${ticker?.fontSize ? '' : 'text-xs'}`}
                                style={{
                                    ...(ticker?.fontSize ? { fontSize: `${ticker.fontSize}px` } : {}),
                                    ...(ticker?.textColor ? { color: ticker.textColor } : {}),
                                }}
                            >{ticker?.text || 'NEW COLLECTION • FREE SHIPPING • PREMIUM QUALITY • TRENDY STYLES'}</span>
                        </div>
                    ) : (
                        <div className="flex gap-16 whitespace-nowrap trendy-ticker">
                            {Array(8).fill(ticker?.text || 'NEW COLLECTION • FREE SHIPPING • PREMIUM QUALITY • TRENDY STYLES').map((text, i) => (
                                <span
                                    key={i}
                                    className={`font-bold uppercase tracking-widest text-gray-500 shrink-0 ${ticker?.fontSize ? '' : 'text-xs'}`}
                                    style={{
                                        ...(ticker?.fontSize ? { fontSize: `${ticker.fontSize}px` } : {}),
                                        ...(ticker?.textColor ? { color: ticker.textColor } : {}),
                                    }}
                                >{text}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Catalog Filter Bar (catalog view) — inherits products-section bg */}
            {isCatalog && (
                <div style={{ backgroundColor: props.sectionBg?.section1 || undefined }}>
                <div className="container mx-auto px-6 pt-8 pb-4">
                    <div className="flex flex-wrap justify-center gap-3">
                        {topCategories.map((cat: any) => {
                            const isActive = !!activeCategory && (activeCategory === cat.slug || activeCategory === cat.id || activeCategory === cat.name?.toLowerCase());
                            return (
                            <button
                                key={cat.id}
                                onClick={() => handleNavigate('/catalogo', { category: cat.name.toLowerCase() })}
                                className={`${isActive ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'} text-xs font-semibold px-5 py-2 rounded-full transition-colors`}
                            >
                                {cat.name}
                            </button>
                            );
                        })}
                        <button
                            onClick={() => handleNavigate('/catalogo')}
                            className={`${!activeCategory ? 'bg-gray-900 text-white border border-gray-900' : 'border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'} text-xs font-semibold px-5 py-2 rounded-full transition-colors`}
                        >
                            Todos
                        </button>
                    </div>
                </div>
                </div>
            )}

            {/* Products Section */}
            <section style={{ backgroundColor: props.sectionBg?.section1 || undefined }}>
            <div className="container mx-auto px-6 py-12">
                {!isCatalog && (
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h2 className="text-3xl font-serif font-bold text-gray-900" style={styleFor('sectionTitle1')}>{els?.sectionTitle1?.text || 'Nueva Colección'}</h2>
                            <p className="text-gray-500 text-sm mt-1" style={styleFor('sectionSubtitle1')}>{els?.sectionSubtitle1?.text || 'Los mejores estilos de temporada'}</p>
                        </div>
                        <button
                            onClick={() => handleNavigate('/catalogo')}
                            className="text-sm font-semibold underline underline-offset-4 text-gray-700 hover:text-gray-900"
                            style={styleFor('sectionLink1')}
                        >
                            {els?.sectionLink1?.text || 'Ver todo'}
                        </button>
                    </div>
                )}
                {isCatalog && (
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold mb-6 sm:mb-8">Catálogo</h1>
                )}

                {displayProducts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
                        {(isCatalog ? displayProducts : homeProducts).map((product: any) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center text-gray-400">
                        <p className="text-lg">No hay productos disponibles.</p>
                    </div>
                )}
            </div>
            </section>

            {/* Footer */}
            <footer className="pt-16 pb-8" style={{ backgroundColor: props.sectionBg?.footer || footerBgColor, color: footerCol.text }}>
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                        <div>
                            <h4 className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500" style={styleFor('footerHeading1')}>{els?.footerHeading1?.text || 'Contacto'}</h4>
                            <ul className="space-y-4 text-sm font-medium">
                                {contactData?.whatsapp && (
                                    <li className="flex items-center gap-3">
                                        <a href={`https://wa.me/${contactData.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                                            <span style={{ color: footerCol.muted }}>WhatsApp:</span> {contactData.whatsapp}
                                        </a>
                                    </li>
                                )}
                                {contactData?.email && (
                                    <li className="flex items-center gap-3">
                                        <a href={`mailto:${contactData.email}`} className="hover:text-white transition-colors">
                                            <span style={{ color: footerCol.muted }}>Email:</span> {contactData.email}
                                        </a>
                                    </li>
                                )}
                                {!contactData?.whatsapp && !contactData?.email && (
                                    <li className="text-zinc-600 italic">Agrega tus datos de contacto</li>
                                )}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500" style={styleFor('footerHeading2')}>{els?.footerHeading2?.text || 'Ubicación'}</h4>
                            <p className="text-sm font-medium leading-relaxed max-w-xs" style={{ color: footerCol.muted }}>
                                {contactData?.address || <span className="italic opacity-70">Configura tu dirección</span>}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold uppercase mb-6 text-sm tracking-widest text-zinc-500" style={styleFor('footerHeading3')}>{els?.footerHeading3?.text || 'Síguenos'}</h4>
                            <div className="flex flex-col gap-3 text-sm">
                                {contactData?.instagram && (
                                    <a href={contactData.instagram} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" style={{ color: footerIconColor, fontSize: `${14 * footerIconScale}px` }}>Instagram</a>
                                )}
                                {contactData?.facebook && (
                                    <a href={contactData.facebook} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" style={{ color: footerIconColor, fontSize: `${14 * footerIconScale}px` }}>Facebook</a>
                                )}
                                {!contactData?.instagram && !contactData?.facebook && (
                                    <span className="text-zinc-600 italic">Agrega tus redes sociales</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-wider" style={{ borderColor: footerCol.border, color: footerCol.muted }}>
                        <p>© {new Date().getFullYear()} {settings?.store_name || 'Tu Tienda'}. Todos los derechos reservados.</p>
                        <p>Powered by Toogo</p>
                    </div>
                </div>
            </footer>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsMenuOpen(false)}>
                    <div className="fixed right-0 top-0 h-full w-72 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b">
                            <span className="font-bold text-lg">Menú</span>
                            <button onClick={() => setIsMenuOpen(false)}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <nav className="p-5 space-y-4">
                            {topCategories.map((cat: any) => (
                                <button key={cat.id} onClick={() => { handleNavigate('/catalogo', { category: cat.name.toLowerCase() }); setIsMenuOpen(false); }} className="block py-2 text-gray-700 font-medium border-b border-gray-100 w-full text-left">{cat.name}</button>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            {/* Cart Drawer */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[400px] bg-white z-50 transform ${isCartOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out shadow-2xl`}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b flex justify-between items-center">
                        <h2 className="text-xl font-bold font-serif">Tu Carrito <span className="text-gray-400 font-normal text-base ml-1">({cartCount})</span></h2>
                        <button onClick={() => setIsCartOpen(false)} className="hover:rotate-90 transition-transform duration-300"><X className="w-6 h-6" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {cartItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                <ShoppingCart className="w-12 h-12 text-gray-200" />
                                <p className="font-semibold text-gray-500">Tu carrito está vacío</p>
                                <button onClick={() => { setIsCartOpen(false); handleNavigate('/catalogo'); }} className="border border-gray-900 text-gray-900 px-6 py-2 text-sm font-semibold hover:bg-gray-900 hover:text-white transition-colors">Ver colección</button>
                            </div>
                        ) : (
                            <ul className="space-y-6">
                                {cartItems.map((item: any) => (
                                    <li key={item.id} className="flex gap-4">
                                        <div className="w-20 aspect-[3/4] bg-gray-100 overflow-hidden rounded-sm flex-shrink-0">
                                            <img src={item.image || item.images?.[0] || '/placeholder.svg'} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between py-1">
                                            <div className="flex justify-between gap-2">
                                                <h3 className="font-medium text-sm leading-snug">{item.name}</h3>
                                                <span className="font-bold text-sm">${((item.price_mxn || item.price || 0) * item.quantity).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3 border border-gray-200 px-3 py-1 rounded-full">
                                                    <button className="text-gray-600 font-bold" onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}>-</button>
                                                    <span className="font-medium w-4 text-center text-sm">{item.quantity}</span>
                                                    <button className="text-gray-600 font-bold" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                                </div>
                                                <button onClick={() => removeItem(item.id)} className="text-xs text-red-500 font-medium">Eliminar</button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {cartItems.length > 0 && (
                        <div className="p-6 border-t bg-gray-50">
                            <div className="flex justify-between mb-5">
                                <span className="text-gray-500 font-medium">Subtotal</span>
                                <span className="font-bold text-xl">${(cartTotal || 0).toFixed(2)}</span>
                            </div>
                            <button onClick={() => { setIsCartOpen(false); setShowCheckout(true); }} className="w-full bg-gray-900 text-white py-4 font-semibold text-sm tracking-widest uppercase hover:bg-gray-700 transition-colors">Finalizar Compra</button>
                        </div>
                    )}
                </div>
            </div>
            {isCartOpen && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsCartOpen(false)} />}
            <CheckoutModal open={showCheckout} onOpenChange={setShowCheckout} />
        </div>
    );
};
