// @ts-nocheck
import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    ShoppingCart, Heart, Search, Menu, X, User
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { LogoDisplay } from "@/components/ui/LogoDisplay";

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

    const { items: cartItems, removeItem, updateQuantity, totalPrice: cartTotal } = useCart();
    const cartCount = cartItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
    const [isCartOpen, setIsCartOpen] = useState(false);

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
    const topCategories = categories?.filter((c: any) => !c.parent_id) || [];

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

    // Product card
    const ProductCard = ({ product }: { product: any }) => (
        <div
            className="group cursor-pointer"
            onClick={() => handleNavigate(`/product/${product.slug || product.id}`)}
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
                <span className="text-gray-500 font-light">${product.sale_price_mxn || product.price_mxn || product.price}</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen font-sans bg-white text-black" style={{ backgroundColor: settings?.store_background_color || '#ffffff' }}>

            {/* ─── HEADER ─── */}
            <header className="px-6 py-4 flex flex-col gap-4 border-b border-gray-200 sticky top-0 z-50 bg-white" style={{ backgroundColor: settings?.navbar_bg_color || '#ffffff' }}>
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
                            <span className="ml-4 text-[10px] text-black">{announcement.text}</span>
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
                            className="text-3xl font-black uppercase tracking-tighter"
                        />
                    </div>

                    {/* Right: Icons */}
                    <div className="flex items-center gap-4 md:gap-6">
                        <User className="h-5 w-5 stroke-1 hidden md:block cursor-pointer hover:scale-110 transition-transform" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                        <Search className="h-5 w-5 stroke-1 cursor-pointer hover:scale-110 transition-transform" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                        <Heart className="h-5 w-5 stroke-1 hidden md:block cursor-pointer hover:scale-110 transition-transform" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                        <div className="relative cursor-pointer hover:scale-110 transition-transform" onClick={() => setIsCartOpen(true)}>
                            <ShoppingCart className="h-5 w-5 stroke-1" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] w-3 h-3 flex items-center justify-center rounded-full">{cartCount}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Nav */}
                <nav className="hidden md:flex justify-center gap-8 text-xs font-bold uppercase tracking-widest text-black">
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
                            <button onClick={() => { handleNavigate('/catalogo'); setIsMenuOpen(false); }} className="block w-full text-left font-medium uppercase tracking-widest text-sm hover:text-gray-500">
                                Todos
                            </button>
                        </nav>
                    </div>
                </div>
            )}

            {/* ─── HERO SECTION ─── */}
            {!isCatalog && (
                <div className="flex flex-col lg:flex-row w-full bg-white relative">
                    {/* Main hero image */}
                    <div className="w-full lg:w-1/2 aspect-[4/5] lg:aspect-auto lg:h-[80vh] bg-gray-100">
                        {mainHeroImg ? (
                            <img src={mainHeroImg} className="w-full h-full object-cover" alt="Hero Principal" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                <span className="text-gray-400 font-serif italic text-2xl">Agrega tu foto hero</span>
                            </div>
                        )}
                    </div>

                    {/* Right text + small images */}
                    <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center px-8 lg:px-20 py-16 relative">
                        {secondHeroImg && (
                            <div className="hidden lg:block absolute top-12 right-20 w-32 h-32 bg-gray-100 z-10">
                                <img src={secondHeroImg} className="w-full h-full object-cover" alt="Hero secundario" />
                            </div>
                        )}

                        <div className="max-w-xl relative z-20">
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-6 whitespace-pre-wrap">
                                {welcomeTitle || "Nueva Colección\nde Verano"}
                            </h1>
                            <p className="text-gray-500 text-sm mb-10 max-w-md font-medium leading-relaxed">
                                {welcomeMessage || "Descubre la nueva colección de moda con colores vibrantes, estampados únicos y piezas cómodas perfectas para cualquier ocasión."}
                            </p>

                            <div className="flex gap-4">
                                <Button
                                    className="bg-black text-white hover:bg-black/90 rounded-none px-8 py-6 text-xs font-bold uppercase tracking-widest"
                                    onClick={() => handleNavigate('/catalogo', { category: 'mujer' })}
                                >
                                    Para Mujeres
                                </Button>
                                <Button
                                    variant="outline"
                                    className="border-black text-black hover:bg-gray-50 rounded-none px-8 py-6 text-xs font-bold uppercase tracking-widest"
                                    onClick={() => handleNavigate('/catalogo', { category: 'hombre' })}
                                >
                                    Para Hombres
                                </Button>
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
                <div className="border-y-2 border-black bg-white py-4 overflow-hidden">
                    <div className="flex justify-center flex-nowrap whitespace-nowrap gap-8 text-lg lg:text-3xl font-black uppercase tracking-tighter">
                        {Array(4).fill(ticker?.text || "SOPORTE 24/7 • CALIDAD PREMIUM • ENVÍO GRATIS • GARANTÍA TOTAL").map((text, i) => (
                            <span key={i}>{text}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── CATALOG VIEW ─── */}
            {isCatalog && (
                <div className="container mx-auto px-6 py-8">
                    {/* Category filter */}
                    <div className="flex flex-wrap justify-center gap-4 mb-8">
                        {topCategories.map((cat: any) => {
                            const isActive = activeCategory === cat.name.toLowerCase();
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
            )}

            {/* ─── HOME PRODUCTS SECTION ─── */}
            {!isCatalog && (
                <section className="py-20 bg-white">
                    <div className="container mx-auto px-4 text-center mb-12">
                        <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter mb-8">
                            RECIÉN LLEGADOS
                        </h2>

                        <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-sm font-bold uppercase tracking-widest text-gray-400">
                            {topCategories.slice(0, 4).map((cat: any, idx: number) => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleNavigate('/catalogo', { category: cat.name.toLowerCase() })}
                                    className={`cursor-pointer ${idx === 0 ? 'text-black border-b-2 border-black pb-1' : 'hover:text-black'}`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                            {topCategories.length === 0 && (
                                <>
                                    <span className="text-black border-b-2 border-black pb-1 cursor-pointer">Mujeres</span>
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
                                onClick={() => handleNavigate(`/product/${product.slug || product.id}`)}
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
                                    <div className="flex gap-1.5 mb-2 mt-1">
                                        <span className="w-3 h-3 rounded-full bg-black" />
                                        <span className="w-3 h-3 rounded-full bg-blue-800" />
                                        <span className="w-3 h-3 rounded-full bg-orange-700" />
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{settings?.store_name || "Marca"}</p>
                                    <h3 className="text-sm font-medium text-black mb-3 line-clamp-2 md:line-clamp-1">{product.title || product.name}</h3>
                                    <div className="flex gap-3 items-center">
                                        <span className="text-sm font-bold text-gray-600">${product.sale_price_mxn || product.price_mxn || product.price}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ─── FOOTER ─── */}
            <footer className="border-t-2 border-gray-100 py-16 px-6 flex flex-col md:flex-row justify-between items-center text-xs font-bold uppercase tracking-widest gap-8 text-gray-400" style={{ backgroundColor: footerBgColor }}>
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
                    <button onClick={() => { }} className="hover:text-black transition-colors">Política de Privacidad</button>
                    <button onClick={() => { }} className="hover:text-black transition-colors">Términos y Condiciones</button>
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
                            <Button className="w-full bg-black text-white hover:bg-gray-800 font-bold uppercase py-6 text-sm tracking-widest shadow-lg hover:shadow-xl transition-all rounded-none">
                                Finalizar Compra
                            </Button>
                            <p className="text-center text-xs text-gray-400 mt-3">Envío e impuestos calculados al finalizar.</p>
                        </div>
                    )}
                </div>
            </div>
            {isCartOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setIsCartOpen(false)} />}
        </div>
    );
};
