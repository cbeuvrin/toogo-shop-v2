
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Heart, Search, Menu, X, Instagram, Facebook } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { LogoDisplay } from "@/components/ui/LogoDisplay";
import { CheckoutModal } from "@/components/cart/CheckoutModal";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { heroFontFamily } from "@/lib/heroFonts";
import { storeDisplayName } from "@/utils/storeDisplayName";

// --- Components (Internal to this template for cohesion) ---

const Navigation = ({ onCategoryClick, onContactClick, isMenuOpen, setIsMenuOpen, storeName }: any) => {
    return (
        <>
            {/* Mobile Navigation Overlay */}
            {isMenuOpen && (
                <div className="fixed inset-0 bg-white z-50 flex flex-col p-6 animate-in slide-in-from-left duration-300">
                    <div className="flex justify-between items-center mb-10">
                        <span className="text-xl font-serif font-bold tracking-tighter">{storeName || 'Store'}</span>
                        <button onClick={() => setIsMenuOpen(false)}><X className="h-6 w-6" /></button>
                    </div>
                    <ul className="flex flex-col gap-6 text-2xl font-light text-center">
                        <li>
                            <button onClick={() => {
                                onCategoryClick(null);
                                setIsMenuOpen(false);
                                const productSection = document.getElementById('products');
                                productSection?.scrollIntoView({ behavior: 'smooth' });
                            }}>Catálogo</button>
                        </li>
                        <li>
                            <button onClick={() => {
                                setIsMenuOpen(false);
                                onContactClick();
                            }}>Contacto</button>
                        </li>
                    </ul>
                </div>
            )}
        </>
    );
};

const ProductCard = ({ product, addToCart, toggleFavorite, isFavorite, onOpenDetail }: any) => {
    const isService = product.product_type === 'service';
    const pricingMode = isService ? (product.pricing_mode || 'fixed') : 'fixed';
    const isQuoteOnly = isService && pricingMode === 'quote';
    const basePrice = product.price_mxn || product.price || 0;
    // Variable products must pick options first → the hover button opens the
    // detail modal instead of silently adding the base product to the cart.
    const isVariable = Array.isArray(product.variations) && product.variations.length > 0;
    const hasSale = !isService && product.sale_price_mxn && product.sale_price_mxn < (product.price_mxn || product.price);
    const displayPrice = hasSale ? product.sale_price_mxn : basePrice;
    return (
        <div className="group cursor-pointer" onClick={() => onOpenDetail?.(product)}>
            <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden mb-4">
                <img
                    src={product.image || product.image_url || '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {hasSale && (
                    <span className="absolute top-2 left-2 bg-black text-white text-[10px] uppercase tracking-widest px-2 py-1">
                        Oferta
                    </span>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-white/0 text-transparent hover:text-black group-hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                >
                    <Heart className={`h-5 w-5 ${isFavorite ? "fill-black text-black" : "text-black"}`} />
                </button>

                {!isService && (
                    <div className="absolute bottom-0 inset-x-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/50 to-transparent flex justify-center">
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isVariable) { onOpenDetail?.(product); } else { addToCart(product); }
                            }}
                            className="bg-white text-black hover:bg-gray-100 border-none rounded-none uppercase text-xs tracking-widest w-full"
                        >
                            {isVariable ? 'Ver opciones' : 'Agregar al carrito'}
                        </Button>
                    </div>
                )}
            </div>
            <div className="text-center">
                <h3 className="text-sm text-gray-900 font-medium mb-1 line-clamp-1">{product.name || product.title}</h3>
                <div className="flex justify-center gap-3 text-sm">
                    {isQuoteOnly ? (
                        <span className="text-gray-500 font-light italic">A cotizar</span>
                    ) : isService && pricingMode === 'starting_from' ? (
                        <span className="text-gray-500 font-light">Desde ${Number(basePrice).toFixed(2)} MXN</span>
                    ) : isService ? (
                        <span className="text-gray-500 font-light">${Number(basePrice).toFixed(2)} MXN</span>
                    ) : (
                        <span className="text-gray-500 font-light">{product.priceVaries ? 'Desde ' : ''}${Number(displayPrice).toFixed(2)}</span>
                    )}
                    {hasSale && (
                        <span className="text-gray-300 line-through font-light">${Number(basePrice).toFixed(2)}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export const MinimalTemplate = (props: any) => {
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
        view = 'home'
    } = props; // Destructure props

    // Use effectiveSettings which contains the merged settings (including template_id patch)
    const settings = effectiveSettings || storeData?.settings || {};

    // Normalize products to ensure images are strings, not objects
    const formattedProducts = products?.map((p: any) => {
        let imageUrl = '/placeholder.svg';
        if (p.images && p.images.length > 0) {
            const firstImg = p.images[0];
            imageUrl = typeof firstImg === 'string' ? firstImg : (firstImg?.url || '/placeholder.svg');
        } else if (p.image_url) {
            imageUrl = p.image_url;
        }

        return {
            ...p,
            name: p.title || p.name || 'Producto sin nombre',
            price: p.price_mxn || p.price || 0,
            image: imageUrl
        };
    }) || [];

    // Extract visual settings
    const bgColor = settings?.store_background_color || '#ffffff';
    const navColor = settings?.navbar_bg_color || '#ffffff';
    const headerIconColor = settings?.header_icon_color || '#000000';
    const headerIconScale = settings?.header_icon_scale || 1;
    const footerBgColor = settings?.footer_bg_color || '#f9fafb';
    const footerIconColor = settings?.footer_icon_color || '#9ca3af';
    const footerIconScale = settings?.footer_icon_scale || 1;

    const hideNav = useHideOnScroll();

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Cart Logic from Context (using context for state, but props for add)
    const { items, removeItem, updateQuantity, totalPrice: total, clearCart } = useCart();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);

    // Filter Logic
    const filteredProducts = formattedProducts?.filter((p: any) => {
        // Normalization fallback
        const pCats = p.categories || [];
        const matchesCategory = selectedCategory
            ? (p.category_id === selectedCategory || pCats.some((c: any) => c.id === selectedCategory))
            : true;

        const matchesSearch = (p.name || p.title || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Derived state
    const cartItemCount = items.reduce((acc: number, item: any) => acc + item.quantity, 0);

    // Banner Logic

    // Banner Logic
    const mainBanner = banners && banners.length > 0 ? banners[0] : null;

    const scrollToContact = () => {
        const footer = document.querySelector('footer');
        footer?.scrollIntoView({ behavior: 'smooth' });
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
    // Hero CTA: default scrolls to the product grid; can be re-routed to a
    // category or custom link from the editor (same options as Indico).
    const heroCtaClick = () => {
        const cfg = els?.cta1 || {};
        if (cfg.action === 'link' && cfg.customUrl) {
            window.open(cfg.customUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        if (cfg.action === 'category' && cfg.categorySlug) {
            const cat = categories?.find((c: any) => (c.slug || c.name)?.toLowerCase() === cfg.categorySlug);
            if (cat) { setSelectedCategory(cat.id); return; }
        }
        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen font-sans selection:bg-gray-200" style={{ backgroundColor: bgColor }}>

            {/* Search Overlay */}
            {isSearchOpen && (
                <div className="fixed top-0 inset-x-0 h-32 bg-white z-50 flex items-center justify-center border-b border-gray-100 animate-in slide-in-from-top duration-200">
                    <div className="container max-w-2xl relative">
                        <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            autoFocus
                            placeholder="Buscar productos..."
                            className="w-full text-2xl font-light border-b border-gray-200 focus:border-black outline-none py-2 pl-8 placeholder:text-gray-200"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button onClick={() => setIsSearchOpen(false)} className="absolute right-0 top-1/2 -translate-y-1/2">
                            <X className="h-5 w-5 text-gray-500 hover:text-black" />
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className={`px-6 py-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md text-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${hideNav ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`} style={{ backgroundColor: props.sectionBg?.navbar || navColor }}>

                {/* Desktop Navigation Links (Left) */}
                <nav className="hidden md:flex md:flex-1 md:justify-start gap-8 text-sm uppercase tracking-widest text-gray-500 font-medium" style={styleFor('navMenu')}>
                    <button onClick={() => {
                        setSelectedCategory(null);
                        const productSection = document.getElementById('products');
                        productSection?.scrollIntoView({ behavior: 'smooth' });
                    }} className="hover:text-black transition-colors">
                        Catálogo
                    </button>
                    <button onClick={scrollToContact} className="hover:text-black transition-colors">
                        Contacto
                    </button>
                </nav>

                {/* Mobile Menu Trigger */}
                <button className="md:hidden" onClick={() => setIsMenuOpen(true)}>
                    <Menu className="h-6 w-6 stroke-1" style={{ color: headerIconColor }} />
                </button>

                {/* Logo (Center) */}
                <div className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:flex-1 md:flex md:justify-center">
                    <div className="scale-75 md:scale-100 origin-center cursor-pointer" onClick={() => setSelectedCategory(null)}>
                        <LogoDisplay
                            logoUrl={settings?.logo_url}
                            logoSize={settings?.logo_size || 'md'}
                            fallbackText={settings?.store_name || 'LOGO'}
                            disableFetch={true}
                            className="text-2xl md:text-3xl font-serif font-bold tracking-tighter"
                        />
                    </div>
                </div>

                {/* Icons (Right) */}
                <div className="flex items-center gap-6 md:flex-1 md:justify-end">
                    <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="hidden md:block hover:opacity-70 transition-opacity">
                        <Search className="h-5 w-5 stroke-1" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                    </button>
                    <button onClick={() => setIsCartOpen(true)} className="relative hover:opacity-70 transition-opacity">
                        <ShoppingCart className="h-5 w-5 stroke-1" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                        {cartItemCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-black text-[9px] text-white">
                                {cartItemCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            <Navigation
                onCategoryClick={setSelectedCategory}
                onContactClick={scrollToContact}
                isMenuOpen={isMenuOpen}
                setIsMenuOpen={setIsMenuOpen}
                storeName={settings?.store_name}
            />

            {/* Hero Section (Only shows when no category is selected, no search, and NOT in catalog mode) */}
            {!selectedCategory && !searchQuery && view !== 'catalog' && (
                <section className="mb-12 px-4 md:px-6">
                    <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-gray-100">
                        {mainBanner ? (
                            <img src={mainBanner.image} alt={mainBanner.title || "Banner"} className="w-full h-full object-contain lg:object-cover" style={{ objectPosition: mainBanner.position || 'center center' }} />
                        ) : settings?.banner_url ? (
                            <img src={settings.banner_url} alt="Hero" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                <span className="text-3xl md:text-6xl font-serif italic opacity-20 px-4 text-center">Nueva Colección</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                            <div className="text-center text-white px-4">
                                <h2 className="text-4xl md:text-6xl font-serif mb-4 drop-shadow-md" style={styleFor('title')}>{props.welcomeTitle || settings?.welcome_title || 'Esenciales de Temporada'}</h2>
                                <p className="text-lg font-light tracking-wide mb-8 drop-shadow-md" style={styleFor('message')}>{props.welcomeMessage || settings?.welcome_message || 'Descubre la nueva colección minimalista.'}</p>
                                {(els?.cta1?.enabled !== false) && (
                                    <Button
                                        className="bg-white text-black hover:bg-white/90 rounded-none px-8 py-6 text-xs uppercase tracking-[0.2em]"
                                        style={styleFor('cta1')}
                                        onClick={heroCtaClick}
                                    >
                                        {props.cta1Label || 'Ver colección'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Categories Bar (Moved here) */}
            <div className="container mx-auto px-4 md:px-6 mb-12 overflow-x-auto">
                <ul className="flex flex-nowrap md:flex-wrap items-center justify-start md:justify-center gap-8 text-sm uppercase tracking-widest text-gray-500 font-medium min-w-max md:min-w-0 pb-4 md:pb-0">
                    <li>
                        <button onClick={() => setSelectedCategory(null)} className={`hover:text-black transition-colors ${selectedCategory === null ? 'text-black border-b border-black' : ''}`}>
                            Todo
                        </button>
                    </li>
                    {categories?.filter((cat: any) => !cat.parent_id && cat.show_on_home !== false).map((cat: any) => (
                        <li key={cat.id}>
                            <button onClick={() => setSelectedCategory(cat.id)} className={`hover:text-black transition-colors ${selectedCategory === cat.id ? 'text-black border-b border-black' : ''}`}>
                                {cat.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Main Content */}
            <main id="products" className="px-4 md:px-6 pb-20 min-h-[60vh]" style={{ backgroundColor: props.sectionBg?.section1 || undefined }}>
              <div className="container mx-auto">
                {selectedCategory && (
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-serif mb-2">
                            {categories?.find((c: any) => c.id === selectedCategory)?.name}
                        </h2>
                        <div className="w-12 h-0.5 bg-black mx-auto"></div>
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-8 md:gap-y-16">
                    {filteredProducts?.map((product: any) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            addToCart={addToCart}
                            toggleFavorite={toggleFavorite}
                            isFavorite={favorites?.includes(product.id)}
                            onOpenDetail={props.onProductClick}
                        />
                    ))}
                </div>

                {filteredProducts?.length === 0 && (
                    <div className="text-center py-20 text-gray-400 font-light">
                        No se encontraron productos.
                    </div>
                )}
              </div>
            </main>

            {/* Editorial banner (banners[1]) — after the catalog, home only */}
            {!selectedCategory && !searchQuery && view !== 'catalog' && (banners?.[1]?.image || banners?.[1]?.imageUrl) && (
                <section className="mb-20 px-4 md:px-6">
                    <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-gray-100">
                        <img
                            src={banners[1].imageUrl || banners[1].image}
                            alt="Banner editorial"
                            className="w-full h-full object-contain lg:object-cover"
                            style={{ objectPosition: banners[1].position || 'center center' }}
                        />
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                            <h2 className="text-3xl md:text-5xl font-serif text-white drop-shadow-md text-center px-4" style={styleFor('midBannerTitle')}>
                                {els?.midBannerTitle?.text || 'Hecho para durar'}
                            </h2>
                        </div>
                    </div>
                </section>
            )}

            {/* Destacados — hand-picked featured products, home only */}
            {!selectedCategory && !searchQuery && view !== 'catalog' && (() => {
                const featuredIds = props.featuredProducts;
                const destacados = (featuredIds && featuredIds.length > 0)
                    ? featuredIds.map((id: string) => formattedProducts.find((p: any) => p.id === id)).filter(Boolean)
                    : formattedProducts.slice(0, 4);
                if (destacados.length === 0) return null;
                return (
                    <section className="px-4 md:px-6 pb-20" style={{ backgroundColor: props.sectionBg?.section2 || undefined }}>
                        <div className="container mx-auto">
                            <div className="text-center mb-12 pt-4">
                                <h2 className="text-3xl font-serif mb-2" style={styleFor('sectionTitle2')}>
                                    {els?.sectionTitle2?.text || 'Destacados'}
                                </h2>
                                <div className="w-12 h-0.5 bg-black mx-auto"></div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-8">
                                {destacados.map((product: any) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        addToCart={addToCart}
                                        toggleFavorite={toggleFavorite}
                                        isFavorite={favorites?.includes(product.id)}
                                        onOpenDetail={props.onProductClick}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                );
            })()}

            {/* Footer */}
            <footer className="border-t border-gray-100 py-20 px-6" style={{ backgroundColor: props.sectionBg?.footer || footerBgColor }}>
                <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
                    <div>
                        <h3 className="uppercase text-xs tracking-widest font-bold mb-6" style={styleFor('footerHeading1')}>{els?.footerHeading1?.text || 'Nosotros'}</h3>
                        <p className="text-sm text-gray-500 font-light leading-relaxed max-w-xs mx-auto md:mx-0" style={styleFor('footerAbout')}>
                            {els?.footerAbout?.text || settings?.description || 'Una selección curada de esenciales minimalistas para el estilo de vida moderno.'}
                        </p>
                    </div>
                    <div>
                        <h3 className="uppercase text-xs tracking-widest font-bold mb-6" style={styleFor('footerHeading2')}>{els?.footerHeading2?.text || 'Contacto'}</h3>
                        {(contactData?.email || settings?.contact?.email) && (
                            <p className="text-sm text-gray-500 font-light mb-2">{contactData?.email || settings?.contact?.email}</p>
                        )}
                        {(contactData?.phone || contactData?.whatsapp || settings?.contact?.phone) && (
                            <p className="text-sm text-gray-500 font-light">{contactData?.phone || contactData?.whatsapp || settings?.contact?.phone}</p>
                        )}
                        {!contactData?.email && !settings?.contact?.email && !contactData?.phone && !contactData?.whatsapp && !settings?.contact?.phone && (
                            <p className="text-sm text-gray-400 font-light italic">Agrega tus datos de contacto</p>
                        )}
                    </div>
                    <div>
                        <h3 className="uppercase text-xs tracking-widest font-bold mb-6" style={styleFor('footerHeading3')}>{els?.footerHeading3?.text || 'Síguenos'}</h3>
                        <div className="flex justify-center md:justify-start gap-4">
                            {(contactData?.instagram || settings?.social_links?.instagram) && (
                                <a href={contactData?.instagram || settings?.social_links?.instagram} className="hover:text-black transition-colors" style={{ color: footerIconColor }}><Instagram className="h-5 w-5" style={{ width: `${20 * footerIconScale}px`, height: `${20 * footerIconScale}px` }} /></a>
                            )}
                            {(contactData?.facebook || settings?.social_links?.facebook) && (
                                <a href={contactData?.facebook || settings?.social_links?.facebook} className="hover:text-black transition-colors" style={{ color: footerIconColor }}><Facebook className="h-5 w-5" style={{ width: `${20 * footerIconScale}px`, height: `${20 * footerIconScale}px` }} /></a>
                            )}
                            {!contactData?.instagram && !settings?.social_links?.instagram && !contactData?.facebook && !settings?.social_links?.facebook && (
                                <span className="text-sm text-gray-400 font-light italic">Agrega tus redes sociales</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-20 text-center text-xs text-gray-300">
                    &copy; {new Date().getFullYear()} {storeDisplayName(settings)}. Todos los derechos reservados. Powered by TOOGO.
                </div>
            </footer>

            {/* Cart Drawer - Custom Minimalist Implementation */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl z-50 transform ${isCartOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out`}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-xl font-serif">Tu Bolsa ({cartItemCount})</h2>
                        <button onClick={() => setIsCartOpen(false)}><X className="h-5 w-5 text-gray-400 hover:text-black" /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                                <ShoppingCart className="h-12 w-12 opacity-20" />
                                <p className="font-light">Tu bolsa está vacía.</p>
                                <Button variant="outline" onClick={() => setIsCartOpen(false)}>Seguir comprando</Button>
                            </div>
                        ) : (
                            <ul className="space-y-6">
                                {items.map((item: any) => (
                                    <li key={item.id} className="flex gap-4">
                                        <div className="h-20 w-16 bg-gray-50 flex-shrink-0 overflow-hidden">
                                            <img
                                                src={item.images?.[0] || item.images || item.image || '/placeholder.svg'}
                                                alt={item.title || item.name}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-sm font-medium line-clamp-2">{item.title || item.name}</h3>
                                                <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 ml-2"><X className="h-4 w-4" /></button>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <div className="flex border border-gray-200">
                                                    <button className="px-2 py-0.5 hover:bg-gray-50" onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}>-</button>
                                                    <span className="px-2 py-0.5 min-w-[1.5rem] text-center">{item.quantity}</span>
                                                    <button className="px-2 py-0.5 hover:bg-gray-50" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                                </div>
                                                <span className="font-light">${((item.price_mxn || item.price || 0) * item.quantity).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {items.length > 0 && (
                        <div className="p-6 border-t border-gray-100 bg-gray-50">
                            <div className="flex justify-between items-center mb-4 text-sm">
                                <span className="text-gray-500">Subtotal</span>
                                <span className="font-medium text-lg">${(total || 0).toFixed(2)}</span>
                            </div>
                            <Button onClick={() => { setIsCartOpen(false); setShowCheckout(true); }} className="w-full bg-black text-white hover:bg-gray-800 rounded-none py-6 uppercase tracking-widest text-xs">
                                Finalizar Compra
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            {/* Overlay for Cart */}
            {isCartOpen && <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setIsCartOpen(false)} />}
            <CheckoutModal open={showCheckout} onOpenChange={setShowCheckout} />
        </div>
    );
};
