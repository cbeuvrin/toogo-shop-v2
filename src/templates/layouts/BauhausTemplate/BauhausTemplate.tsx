// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingCart, Search, Menu, X, User } from 'lucide-react';
import { useCart } from "@/contexts/CartContext";
import { useCardStyle } from "@/contexts/CardStyleContext";
import { LogoDisplay } from "@/components/ui/LogoDisplay";
import { CheckoutModal } from "@/components/cart/CheckoutModal";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { heroFontFamily } from "@/lib/heroFonts";

export const BauhausTemplate = (props: any) => {
    const {
        storeData,
        products,
        categories,
        addToCart,
        effectiveSettings,
        banners,
        contactData,
        announcement,
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
        : (products || []).slice(0, 6);
    const displayProducts = isCatalog ? (catalogProducts || []) : homeProducts;

    // Bauhaus palette — strict primaries
    const bauhausRed = settings?.primary_color || '#E63946';
    const bauhausYellow = settings?.secondary_color || '#FFD60A';
    const bauhausBlue = '#003049';
    const bauhausBg = settings?.store_background_color || '#FAF6EE';
    const bauhausBlack = '#0A0A0A';

    const heroTitle = props.welcomeTitle || settings?.welcome_title || 'FORMA\nSIGUE\nFUNCIÓN';
    const heroMessage = props.welcomeMessage || settings?.welcome_message || 'Una colección curada de piezas esenciales. Geometría, color, propósito.';

    const heroBanner = banners?.[0];
    const sideBanner1 = banners?.[1];
    const sideBanner2 = banners?.[2];

    const topCategories = categories?.filter((c: any) => !c.parent_id && c.show_on_home !== false).slice(0, 5) || [];

    // Indico-level per-element styles (hero.styles[key]) + per-section backgrounds.
    const els = props.heroStyles || {};
    const { style: cardTextStyle } = useCardStyle();
    // Only include keys that actually have a value, so merging with a base style
    // (e.g. { color: bauhausRed, ...styleFor(k) }) never wipes the base with undefined.
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
        <div className="min-h-screen font-sans" style={{ backgroundColor: bauhausBg, color: bauhausBlack }}>

            {/* Announcement bar */}
            {announcement?.enabled !== false && (
                <div className="text-center py-2 text-xs font-bold tracking-[0.3em] uppercase" style={{ backgroundColor: announcement?.bgColor || bauhausBlack, color: announcement?.textColor || bauhausYellow }}>
                    {announcement?.text || "ENVÍO GRATIS EN PEDIDOS MAYORES A $999"}
                </div>
            )}

            {/* Header — asymmetric */}
            <header className={`sticky top-0 z-40 border-b-[3px] px-6 py-5 flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${hideNav ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`} style={{ borderColor: bauhausBlack, backgroundColor: props.sectionBg?.navbar || settings?.navbar_bg_color || 'transparent' }}>
                <button className="md:hidden" onClick={() => setIsMenuOpen(true)}>
                    <Menu className="w-6 h-6" />
                </button>

                <div className="flex-1 md:flex-none cursor-pointer text-center md:text-left" onClick={() => handleNavigate('/tienda')}>
                    <LogoDisplay
                        logoUrl={settings?.logo_url}
                        fallbackText={settings?.store_name || 'BAUHAUS'}
                        disableFetch={true}
                        logoSize={settings?.logo_size}
                        logoSizeMobile={(settings as any)?.logo_size_mobile}
                        logoSizeTablet={(settings as any)?.logo_size_tablet}
                        className="text-2xl md:text-3xl font-black tracking-tighter uppercase"
                    />
                </div>

                <nav className="hidden md:flex items-center gap-8 mx-auto text-sm font-bold tracking-wide uppercase" style={styleFor('navMenu')}>
                    {(topCategories.length > 0 ? topCategories : [{ name: 'Tienda' }, { name: 'Colección' }, { name: 'Diario' }]).map((cat: any, i: number) => (
                        <button
                            key={i}
                            onClick={() => cat.id ? handleNavigate('/catalogo', { category: cat.name.toLowerCase() }) : handleNavigate('/catalogo')}
                            className="relative hover:opacity-60 transition-opacity"
                        >
                            {cat.name}
                        </button>
                    ))}
                </nav>

                <div className="flex items-center gap-4">
                    <Search className="hidden md:block w-5 h-5 cursor-pointer hover:opacity-60" />
                    <User className="hidden md:block w-5 h-5 cursor-pointer hover:opacity-60" />
                    <button onClick={() => setIsCartOpen(true)} className="relative">
                        <ShoppingCart className="w-5 h-5" />
                        {cartCount > 0 && (
                            <span className="absolute -top-2 -right-2 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full" style={{ backgroundColor: bauhausRed, color: '#fff' }}>
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* HERO — asymmetric grid Bauhaus */}
            {!isCatalog && (
                <section style={{ backgroundColor: props.sectionBg?.hero || undefined }}>
                    <div className="container mx-auto px-6 py-12 md:py-20">
                    <div className="grid grid-cols-12 gap-4 md:gap-6">
                        {/* Big number — editable text + can be hidden */}
                        {(els?.heroNumber?.enabled !== false) && (
                            <div className="col-span-12 md:col-span-2 flex items-start order-3 md:order-1">
                                <div className="text-[80px] sm:text-[120px] md:text-[160px] font-black leading-none" style={{ color: bauhausRed, ...styleFor('heroNumber') }}>
                                    {els?.heroNumber?.text || '01'}
                                </div>
                            </div>
                        )}

                        {/* Hero text — breaks the grid */}
                        <div className="col-span-12 md:col-span-6 flex flex-col justify-center order-1 md:order-2">
                            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black leading-[0.85] tracking-tighter uppercase whitespace-pre-line break-words mb-6" style={styleFor('title')}>
                                {heroTitle}
                            </h1>
                            <p className="text-base md:text-lg max-w-md mb-8 leading-relaxed" style={styleFor('message')}>{heroMessage}</p>
                            {(els?.cta1?.enabled !== false) && (
                            <button
                                onClick={ctaClick('cta1')}
                                className="self-start px-8 py-4 text-sm font-bold tracking-widest uppercase transition-all hover:opacity-80"
                                style={{ backgroundColor: bauhausBlack, color: bauhausYellow, ...styleFor('cta1') }}
                            >
                                {props.cta1Label || 'Explorar colección →'}
                            </button>
                            )}
                        </div>

                        {/* Hero image — geometric circle frame */}
                        <div className="col-span-12 md:col-span-4 relative order-2 md:order-3">
                            <div className="absolute inset-0 translate-x-3 translate-y-3" style={{ backgroundColor: bauhausYellow }} />
                            <div className="relative aspect-[3/4] overflow-hidden">
                                {heroBanner ? (
                                    <img src={heroBanner.imageUrl || heroBanner.image} alt="Hero" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full" style={{ backgroundColor: bauhausBlue }} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Geometric divider */}
                    <div className="flex items-center gap-4 mt-16">
                        <div className="h-[3px] flex-1" style={{ backgroundColor: bauhausBlack }} />
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: bauhausRed }} />
                        <div className="w-4 h-4" style={{ backgroundColor: bauhausYellow }} />
                        <div className="w-4 h-4 rotate-45" style={{ backgroundColor: bauhausBlue }} />
                        <div className="h-[3px] flex-1" style={{ backgroundColor: bauhausBlack }} />
                    </div>
                    </div>
                </section>
            )}

            {/* Products — asymmetric Bauhaus grid */}
            <section style={{ backgroundColor: props.sectionBg?.section1 || undefined }}>
            <div className="container mx-auto px-6 py-12 md:py-20">
                <div className="flex items-end justify-between mb-12">
                    <div>
                        <div className="text-sm font-bold tracking-widest uppercase mb-2" style={{ color: bauhausRed }}>02 — Catálogo</div>
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter" style={styleFor('sectionTitle1')}>
                            {isCatalog ? 'Productos' : (els?.sectionTitle1?.text || 'Selección')}
                        </h2>
                    </div>
                    {!isCatalog && (
                        <button
                            onClick={() => handleNavigate('/catalogo')}
                            className="hidden md:block text-sm font-bold tracking-widest uppercase underline underline-offset-4 hover:no-underline"
                        >
                            Ver todo →
                        </button>
                    )}
                </div>

                {displayProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-10">
                        {displayProducts.map((product: any, i: number) => {
                            const isService = product.product_type === 'service';
                            const pricingMode = isService ? (product.pricing_mode || 'fixed') : 'fixed';
                            const isQuoteOnly = isService && pricingMode === 'quote';
                            const colors = [bauhausRed, bauhausYellow, bauhausBlue];
                            const accentColor = colors[i % 3];
                            const image = (product.images?.[0] && typeof product.images[0] === 'object') ? product.images[0].url : (product.images?.[0] || product.image || '/placeholder.svg');
                            const price = !isService ? (product.sale_price_mxn || product.price_mxn || product.price || 0) : (product.price_mxn || product.price || 0);
                            return (
                                <div
                                    key={product.id}
                                    className="group cursor-pointer"
                                    onClick={() => (props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`))}
                                >
                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 translate-x-2 translate-y-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3" style={{ backgroundColor: accentColor }} />
                                        <div className="relative aspect-square overflow-hidden bg-gray-100">
                                            <img src={image} alt={product.title || product.name} className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <div className="flex items-baseline justify-between">
                                        <h3 className="text-lg font-bold uppercase tracking-tight line-clamp-1" style={cardTextStyle}>{product.title || product.name}</h3>
                                        {isQuoteOnly ? (
                                            <span className="text-base font-black italic" style={{ color: accentColor }}>A cotizar</span>
                                        ) : isService && pricingMode === 'starting_from' ? (
                                            <span className="text-base font-black" style={{ color: accentColor }}>Desde ${Number(price).toFixed(0)} MXN</span>
                                        ) : isService ? (
                                            <span className="text-base font-black" style={{ color: accentColor }}>${Number(price).toFixed(0)} MXN</span>
                                        ) : (
                                            <span className="text-base font-black" style={{ color: accentColor }}>${Number(price).toFixed(0)}</span>
                                        )}
                                    </div>
                                    {!isService && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const isVariable = Array.isArray(product.variations) && product.variations.length > 0;
                                                if (isVariable) { props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`); }
                                                else { addToCart(product); }
                                            }}
                                            className="mt-3 text-xs font-bold tracking-widest uppercase underline underline-offset-4 hover:no-underline"
                                        >
                                            {(Array.isArray(product.variations) && product.variations.length > 0) ? 'Ver opciones' : 'Agregar al carrito'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-20 text-center text-gray-500">No hay productos disponibles.</div>
                )}
            </div>
            </section>

            {/* Manifesto block — geometric duo banners */}
            {!isCatalog && (
                <section style={{ backgroundColor: props.sectionBg?.section2 || undefined }}>
                    <div className="container mx-auto px-6 py-12 md:py-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        <div className="aspect-[4/5] relative overflow-hidden" style={{ backgroundColor: bauhausBlue }}>
                            {sideBanner1 ? (
                                <img src={sideBanner1.imageUrl || sideBanner1.image} alt="Banner" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-48 h-48 rounded-full" style={{ backgroundColor: bauhausYellow }} />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/20" />
                            <div className="absolute bottom-8 left-8 right-8 text-white">
                                <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: bauhausYellow }}>03 — Manifiesto</div>
                                <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none" style={styleFor('manifesto1')}>
                                    {els?.manifesto1?.text || 'Menos pero mejor'}
                                </h3>
                            </div>
                        </div>
                        <div className="aspect-[4/5] relative overflow-hidden" style={{ backgroundColor: bauhausRed }}>
                            {sideBanner2 ? (
                                <img src={sideBanner2.imageUrl || sideBanner2.image} alt="Banner" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-48 h-48" style={{ backgroundColor: bauhausBlack }} />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/20" />
                            <div className="absolute bottom-8 left-8 right-8 text-white">
                                <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: bauhausYellow }}>04 — Filosofía</div>
                                <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none" style={styleFor('manifesto2')}>
                                    {els?.manifesto2?.text || 'Diseño honesto'}
                                </h3>
                            </div>
                        </div>
                    </div>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="border-t-[3px] mt-12" style={{ borderColor: bauhausBlack, backgroundColor: props.sectionBg?.footer || bauhausBg }}>
                <div className="container mx-auto px-6 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <LogoDisplay
                                logoUrl={settings?.logo_url}
                                fallbackText={settings?.store_name || 'BAUHAUS'}
                                disableFetch={true}
                                className="text-3xl font-black uppercase tracking-tighter mb-4"
                            />
                            <p className="text-sm leading-relaxed">{contactData?.address || <span className="italic opacity-50">Agrega tu dirección</span>}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: bauhausRed, ...styleFor('footerHeading1') }}>{els?.footerHeading1?.text || 'Tienda'}</h4>
                            <ul className="space-y-2 text-sm">
                                <li><button onClick={() => handleNavigate('/catalogo')} className="hover:underline">Catálogo</button></li>
                                <li><button onClick={() => handleNavigate('/catalogo', { onSale: 'true' })} className="hover:underline">Ofertas</button></li>
                                <li><button onClick={() => handleNavigate('/catalogo')} className="hover:underline">Novedades</button></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: bauhausRed, ...styleFor('footerHeading2') }}>{els?.footerHeading2?.text || 'Contacto'}</h4>
                            <ul className="space-y-2 text-sm">
                                {contactData?.whatsapp && (
                                    <li><a href={`https://wa.me/${contactData.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:underline">WhatsApp</a></li>
                                )}
                                {contactData?.email && (
                                    <li><a href={`mailto:${contactData.email}`} className="hover:underline">{contactData.email}</a></li>
                                )}
                                {!contactData?.whatsapp && !contactData?.email && (
                                    <li className="italic opacity-50">Agrega tus datos</li>
                                )}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: bauhausRed, ...styleFor('footerHeading3') }}>{els?.footerHeading3?.text || 'Legal'}</h4>
                            <ul className="space-y-2 text-sm">
                                <li><a href="/terminos-condiciones" target="_blank" rel="noopener noreferrer" className="hover:underline">Términos</a></li>
                                <li><a href="/politica-privacidad" target="_blank" rel="noopener noreferrer" className="hover:underline">Privacidad</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t-2 pt-4 flex flex-col md:flex-row justify-between items-center gap-2 text-xs font-bold tracking-widest uppercase" style={{ borderColor: bauhausBlack }}>
                        <span>© {new Date().getFullYear()} {settings?.store_name || 'Tu Tienda'}</span>
                        <span>Powered by Toogo</span>
                    </div>
                </div>
            </footer>

            {/* Mobile menu */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-50" onClick={() => setIsMenuOpen(false)}>
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute left-0 top-0 bottom-0 w-80 p-6 flex flex-col" style={{ backgroundColor: bauhausBg }} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-8">
                            <span className="text-xl font-black uppercase">Menú</span>
                            <button onClick={() => setIsMenuOpen(false)}><X className="w-6 h-6" /></button>
                        </div>
                        <nav className="flex flex-col gap-4">
                            {(topCategories.length > 0 ? topCategories : [{ name: 'Tienda' }, { name: 'Colección' }, { name: 'Diario' }]).map((cat: any, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => { handleNavigate('/catalogo', cat.id ? { category: cat.name.toLowerCase() } : {}); setIsMenuOpen(false); }}
                                    className="text-left text-2xl font-black uppercase tracking-tighter hover:opacity-60"
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            {/* Cart drawer */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[400px] z-50 transform ${isCartOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 shadow-2xl`} style={{ backgroundColor: bauhausBg }}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b-[3px] flex justify-between items-center" style={{ borderColor: bauhausBlack }}>
                        <h2 className="text-xl font-black uppercase tracking-tight">Carrito ({cartCount})</h2>
                        <button onClick={() => setIsCartOpen(false)}><X className="w-6 h-6" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {cartItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                                <ShoppingCart className="w-12 h-12 opacity-30" />
                                <p className="font-bold uppercase">Tu carrito está vacío</p>
                                <button
                                    onClick={() => { setIsCartOpen(false); handleNavigate('/catalogo'); }}
                                    className="px-6 py-3 text-xs font-bold tracking-widest uppercase"
                                    style={{ backgroundColor: bauhausBlack, color: bauhausYellow }}
                                >
                                    Explorar →
                                </button>
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {cartItems.map((item: any) => (
                                    <li key={item.id} className="flex gap-3 border-b-2 pb-4" style={{ borderColor: bauhausBlack }}>
                                        <div className="w-20 h-20 bg-gray-100 flex-shrink-0">
                                            <img src={item.image || item.images?.[0] || '/placeholder.svg'} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-bold uppercase text-sm leading-tight">{item.name}</h3>
                                                <p className="text-sm font-black mt-1">${((item.price_mxn || item.price || 0)).toFixed(0)}</p>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 border-2 px-2 py-1" style={{ borderColor: bauhausBlack }}>
                                                    <button onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))} className="font-black w-4">−</button>
                                                    <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="font-black w-4">+</button>
                                                </div>
                                                <button onClick={() => removeItem(item.id)} className="text-[10px] font-bold tracking-widest uppercase underline" style={{ color: bauhausRed }}>Eliminar</button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {cartItems.length > 0 && (
                        <div className="p-6 border-t-[3px]" style={{ borderColor: bauhausBlack }}>
                            <div className="flex justify-between mb-4">
                                <span className="font-bold uppercase tracking-widest text-sm">Total</span>
                                <span className="font-black text-2xl">${(cartTotal || 0).toFixed(0)}</span>
                            </div>
                            <button onClick={() => { setIsCartOpen(false); setShowCheckout(true); }} className="w-full py-4 font-bold text-sm tracking-widest uppercase" style={{ backgroundColor: announcement?.bgColor || bauhausBlack, color: announcement?.textColor || bauhausYellow }}>
                                Finalizar compra →
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {isCartOpen && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setIsCartOpen(false)} />}
            <CheckoutModal open={showCheckout} onOpenChange={setShowCheckout} />
        </div>
    );
};
