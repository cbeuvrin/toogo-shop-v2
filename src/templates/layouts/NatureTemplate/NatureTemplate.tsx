// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingCart, Search, Menu, X, User, ArrowLeft, ArrowRight } from 'lucide-react';
import { useCart } from "@/contexts/CartContext";
import { LogoDisplay } from "@/components/ui/LogoDisplay";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";

export const NatureTemplate = (props: any) => {
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
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('WOMEN\'S');
    const hideNav = useHideOnScroll();

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

    // Design Tokens base on screenshot
    const brandDarkGreen = '#4f6354';
    const brandLightBg = '#f4f4f0';
    const brandTextDark = '#1a202c'; // almost black/dark blue
    const brandRedSale = '#9b3b3b';

    // Extract settings
    const headerIconColor = settings?.header_icon_color || brandTextDark;
    const headerIconScale = settings?.header_icon_scale || 1;
    const footerBgColor = settings?.footer_bg_color || brandLightBg;
    const footerIconColor = settings?.footer_icon_color || brandTextDark;
    const footerIconScale = settings?.footer_icon_scale || 1;
    const cardBgColor = settings?.product_card_bg_color || '#e2e2e2';

    const heroTitle = props.welcomeTitle || settings?.welcome_title || 'Nuevos Estilos\nHan Llegado';
    const heroMessage = props.welcomeMessage || settings?.welcome_message || 'Una nueva paleta de colores diseñada para el cambio de temporada—fácil de combinar ahora, perfecta para cualquier ocasión.';

    const heroBanner = banners?.[0];
    const topCategories = categories?.filter((c: any) => !c.parent_id && c.show_on_home !== false).slice(0, 6) || [];

    const tabs = topCategories.length > 0 ? topCategories.map(c => c.name.toUpperCase()) : ["MUJER", "HOMBRE", "ACCESORIOS"];

    // Product Card
    const ProductCard = ({ product }: { product: any }) => {
        const isService = product.product_type === 'service';
        const pricingMode = isService ? (product.pricing_mode || 'fixed') : 'fixed';
        const isQuoteOnly = isService && pricingMode === 'quote';
        const salePrice = product.sale_price_mxn || product.price_mxn || product.price;
        const regularPrice = product.originalPrice || product.price * 1.2; // Mocking regular price if sale
        const isOnSale = !isService && (product.sale_price_mxn || product.originalPrice);
        const servicePrice = product.price_mxn || product.price || 0;

        return (
            <div
                className="group cursor-pointer flex flex-col"
                onClick={() => (props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`))}
            >
                <div
                    className="relative aspect-[3/4] overflow-hidden mb-3"
                    style={{ backgroundColor: cardBgColor }}
                >
                    <img
                        src={(product.images?.[0] && typeof product.images[0] === 'object') ? product.images[0].url : (product.images?.[0] || product.image || '/placeholder.svg')}
                        alt={product.title || product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                </div>
                <div className="flex flex-col flex-grow">
                    {/* Mock Swatches */}
                    <div className="flex gap-1.5 mb-2">
                        {['#e5e0d8', '#3a4047', '#f4ecd8', '#87a2ba'].map((color, i) => (
                            <div key={i} className={`w-4 h-4 rounded-full border border-gray-300`} style={{ backgroundColor: color }}></div>
                        ))}
                    </div>
                    <h3 className="font-serif text-sm font-semibold text-gray-900 leading-snug mb-1">{product.title || product.name}</h3>
                    <div className="flex items-center gap-2 text-sm">
                        {isService ? (
                            isQuoteOnly ? (
                                <span className="text-gray-900 italic">A cotizar</span>
                            ) : pricingMode === 'starting_from' ? (
                                <span className="text-gray-900">Desde ${Number(servicePrice).toFixed(2)} MXN</span>
                            ) : (
                                <span className="text-gray-900">${Number(servicePrice).toFixed(2)} MXN</span>
                            )
                        ) : isOnSale ? (
                            <>
                                <span className="text-gray-500 line-through">${Number(regularPrice).toFixed(2)}</span>
                                <span className="text-[#9b3b3b]">
                                    ${Number(salePrice).toFixed(2)}
                                </span>
                            </>
                        ) : (
                            <span className="text-gray-900">${Number(salePrice).toFixed(2)}</span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen font-sans text-gray-900" style={{ backgroundColor: settings?.store_background_color || brandLightBg }}>

            {/* Top Bar */}
            {announcement?.enabled !== false && (
                <div className="text-white text-center py-2 text-[10px] md:text-xs font-medium tracking-widest uppercase flex justify-center items-center px-4 relative" style={{ backgroundColor: brandDarkGreen }}>
                    <span>{announcement?.text || "Envío gratis en compras mayores a $999"}</span>
                </div>
            )}

            {/* Header */}
            <header className={`sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-gray-200 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${hideNav ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`} style={{ backgroundColor: settings?.navbar_bg_color || brandLightBg }}>
                {/* Desktop Nav - Left */}
                <div className="flex items-center gap-8 md:flex-1">
                    <div className="cursor-pointer" onClick={() => handleNavigate('/tienda')}>
                        <LogoDisplay
                            logoUrl={settings?.logo_url}
                            fallbackText={settings?.store_name || 'LOGO'}
                            disableFetch={true}
                            className="text-2xl font-serif font-bold tracking-tight text-gray-900"
                        />
                    </div>
                    <nav className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-wider text-gray-700">
                        {topCategories.slice(0, 5).map((cat: any) => (
                            <button
                                key={cat.id}
                                onClick={() => handleNavigate('/catalogo', { category: cat.name.toLowerCase() })}
                                className="hover:text-black uppercase transition-colors"
                            >
                                {cat.name}
                            </button>
                        ))}
                        {topCategories.length === 0 && (
                            <>
                                <button className="hover:text-black transition-colors uppercase">Mujer</button>
                                <button className="hover:text-black transition-colors uppercase">Hombre</button>
                                <button className="hover:text-black transition-colors uppercase">Accesorios</button>
                                <button className="hover:text-black transition-colors uppercase">Destacados</button>
                                <button className="hover:text-black transition-colors uppercase">Impacto</button>
                            </>
                        )}
                    </nav>
                </div>

                {/* Right Icons */}
                <div className="flex items-center gap-4 justify-end md:flex-1">
                    <User className="hidden md:block cursor-pointer hover:scale-110 transition-transform" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                    <Search className="hidden md:block cursor-pointer hover:scale-110 transition-transform" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                    <div
                        className="relative cursor-pointer hover:scale-110 transition-transform"
                        onClick={() => setIsCartOpen(true)}
                    >
                        <ShoppingCart
                            style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }}
                        />
                        {cartCount > 0 && (
                            <span className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full">
                                {cartCount}
                            </span>
                        )}
                    </div>
                    <button className="md:hidden" onClick={() => setIsMenuOpen(true)}>
                        <Menu style={{ color: headerIconColor, width: `${22 * headerIconScale}px`, height: `${22 * headerIconScale}px` }} />
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            {!isCatalog && (
                <section className="relative w-full h-[60vh] md:h-[80vh] flex items-end md:items-center bg-gray-200">
                    {heroBanner ? (
                        <img
                            src={heroBanner.imageUrl || heroBanner.image}
                            alt="Hero"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 w-full h-full bg-[#8c9485]"></div>
                    )}
                    <div className="absolute inset-0 bg-black/10"></div> {/* Subtle overlay */}

                    <div className="relative z-10 w-full px-6 md:px-16 pb-12 md:pb-0 md:pt-0 max-w-xl text-left">
                        <h1 className="text-4xl md:text-6xl font-serif font-bold leading-[1.1] mb-4 text-white drop-shadow-md whitespace-pre-line">
                            {heroTitle}
                        </h1>
                        <p className="text-sm md:text-base text-white/90 mb-8 max-w-sm drop-shadow">
                            {heroMessage}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => handleNavigate('/catalogo')}
                                className="bg-[#f4f4f0] text-gray-900 px-8 py-3.5 text-xs font-bold tracking-widest uppercase hover:bg-white transition-colors"
                            >
                                VER MUJER
                            </button>
                            <button
                                onClick={() => handleNavigate('/catalogo')}
                                className="bg-[#f4f4f0] text-gray-900 px-8 py-3.5 text-xs font-bold tracking-widest uppercase hover:bg-white transition-colors"
                            >
                                VER HOMBRE
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* Products Section */}
            <section className="container mx-auto px-6 py-12 md:py-16">
                {!isCatalog && (
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-gray-300">
                        <div className="flex-1">
                            <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#142642] mb-6">Novedades</h2>
                            <div className="flex gap-6 overflow-x-auto hide-scrollbar">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`text-xs font-bold tracking-widest uppercase pb-1 border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-gray-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="hidden md:flex gap-2 mt-4 md:mt-0">
                            <button className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-300">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <button className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-300">
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {isCatalog && (
                    <h1 className="text-3xl md:text-4xl font-serif font-bold mb-8 text-[#142642]">Catálogo</h1>
                )}

                {displayProducts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-10">
                        {(isCatalog ? displayProducts : displayProducts.slice(0, 4)).map((product: any) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center text-gray-400">
                        <p className="text-lg">No hay productos disponibles.</p>
                    </div>
                )}
            </section>

            {/* Split Feature Section */}
            {!isCatalog && (props.textBanner?.isActive !== false) && (
                <section className="container mx-auto px-6 py-12">
                    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
                        <div className="lg:w-1/2 flex flex-col justify-center order-2 lg:order-1">
                            <h2 className="text-3xl md:text-5xl font-serif font-bold text-[#142642] leading-tight mb-4">
                                {settings?.feature_title || 'Nuestra Historia'}
                            </h2>
                            <h3 className="text-xl md:text-2xl text-gray-800 mb-6">
                                {settings?.feature_subtitle || 'Comprometidos con el planeta'}
                            </h3>
                            <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-lg mb-8">
                                {settings?.feature_description || 'Tenemos la misión de crear productos de calidad con responsabilidad ambiental. Cada compra contribuye a un mundo mejor para las generaciones futuras.'}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => handleNavigate('/catalogo')}
                                    className="bg-[#4f6354] text-white px-8 py-3.5 text-[11px] font-bold tracking-widest uppercase hover:bg-[#3d4d41] transition-colors w-full sm:w-auto text-center"
                                >
                                    VER CATÁLOGO
                                </button>
                                <button
                                    onClick={() => handleNavigate('/catalogo')}
                                    className="bg-[#4f6354] text-white px-8 py-3.5 text-[11px] font-bold tracking-widest uppercase hover:bg-[#3d4d41] transition-colors w-full sm:w-auto text-center"
                                >
                                    SOBRE NOSOTROS
                                </button>
                            </div>
                        </div>
                        <div className="lg:w-1/2 relative order-1 lg:order-2 h-[400px] md:h-[600px] w-full">
                            <div className="absolute top-0 right-10 w-[70%] h-[60%] z-10 shadow-lg" style={{ backgroundImage: `url('${banners?.[1]?.imageUrl || banners?.[1]?.image || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop'}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                            <div className="absolute bottom-10 right-0 w-[55%] h-[80%] z-20 shadow-lg" style={{ backgroundImage: `url('${banners?.[2]?.imageUrl || banners?.[2]?.image || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop'}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                            <div className="absolute bottom-0 left-10 w-[60%] h-[50%] z-30 shadow-lg" style={{ backgroundImage: `url('${banners?.[3]?.imageUrl || banners?.[3]?.image || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop'}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                        </div>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="pt-16 pb-8 border-t border-gray-200 mt-12" style={{ backgroundColor: footerBgColor }}>
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="md:col-span-1">
                            <LogoDisplay
                                logoUrl={settings?.logo_url}
                                fallbackText={settings?.store_name || 'LOGO'}
                            disableFetch={true}
                                className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold tracking-tight text-gray-900 mb-4"
                            />
                            <p className="text-sm text-gray-600 mb-6 max-w-xs leading-relaxed">
                                {contactData?.address || "Configura tu dirección en el editor visual para mostrarla aquí."}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold uppercase mb-6 text-xs tracking-widest text-[#142642]">Tienda</h4>
                            <ul className="space-y-4 text-sm font-medium text-gray-600">
                                <li><button onClick={() => handleNavigate('/catalogo', { category: 'mujer' })} className="hover:text-gray-900">Mujer</button></li>
                                <li><button onClick={() => handleNavigate('/catalogo', { category: 'hombre' })} className="hover:text-gray-900">Hombre</button></li>
                                <li><button onClick={() => handleNavigate('/catalogo', { category: 'accesorios' })} className="hover:text-gray-900">Accesorios</button></li>
                                <li><button onClick={() => handleNavigate('/catalogo')} className="hover:text-gray-900">Ver todo</button></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold uppercase mb-6 text-xs tracking-widest text-[#142642]">Acerca de</h4>
                            <ul className="space-y-4 text-sm font-medium text-gray-600">
                                <li><a href="#" className="hover:text-gray-900">Nuestra Historia</a></li>
                                <li><a href="#" className="hover:text-gray-900">Impacto</a></li>
                                <li><a href="#" className="hover:text-gray-900">Trabaja con Nosotros</a></li>
                                <li><a href="#" className="hover:text-gray-900">Blog</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold uppercase mb-6 text-xs tracking-widest text-[#142642]">Soporte</h4>
                            <ul className="space-y-4 text-sm font-medium text-gray-600">
                                {contactData?.whatsapp && (
                                    <li><a href={`https://wa.me/${contactData.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 flex items-center gap-2">WhatsApp: {contactData.whatsapp}</a></li>
                                )}
                                {contactData?.email && (
                                    <li><a href={`mailto:${contactData.email}`} className="hover:text-gray-900 flex items-center gap-2">Email: {contactData.email}</a></li>
                                )}
                                <li><a href="#" className="hover:text-gray-900">Preguntas Frecuentes</a></li>
                                <li><a href="#" className="hover:text-gray-900">Devoluciones</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-300 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-[10px] uppercase tracking-widest font-semibold">
                        <p>© {new Date().getFullYear()} {settings?.store_name || 'Tu Tienda'}. Todos los derechos reservados.</p>
                        <div className="flex gap-4">
                            <a href="#" className="hover:text-gray-900">Términos</a>
                            <a href="#" className="hover:text-gray-900">Privacidad</a>
                            <span>Powered by Toogo</span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsMenuOpen(false)}>
                    <div className="fixed right-0 top-0 h-full w-80 bg-[#f4f4f0] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <span className="font-serif font-bold text-xl uppercase tracking-widest">Menu</span>
                            <button onClick={() => setIsMenuOpen(false)}>
                                <X className="w-6 h-6 text-gray-900" />
                            </button>
                        </div>
                        <nav className="flex-1 overflow-y-auto p-6 space-y-6">
                            {(topCategories.length > 0 ? topCategories : [{ name: "Mujer" }, { name: "Hombre" }, { name: "Accesorios" }, { name: "Destacados" }]).map((cat: any, i) => (
                                <button key={i} onClick={() => { handleNavigate('/catalogo', { category: cat.name.toLowerCase() }); setIsMenuOpen(false); }} className="block w-full text-left text-lg font-serif font-semibold text-gray-900 hover:text-gray-600 transition-colors">{cat.name}</button>
                            ))}
                        </nav>
                        <div className="p-6 border-t border-gray-200 bg-white">
                            <button onClick={() => setIsMenuOpen(false)} className="w-full bg-[#4f6354] text-white py-4 text-xs font-bold tracking-widest uppercase hover:bg-[#3d4d41] transition-colors">
                                Iniciar Sesión / Registrarse
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Drawer - Using the exact same styling as other templates for functionality, customized colors */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[400px] bg-[#f4f4f0] z-50 transform ${isCartOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out shadow-2xl`}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white">
                        <h2 className="text-xl font-bold font-serif text-gray-900">Tu Carrito <span className="text-gray-500 font-normal text-base ml-1">({cartCount})</span></h2>
                        <button onClick={() => setIsCartOpen(false)} className="hover:rotate-90 transition-transform duration-300 text-gray-500"><X className="w-6 h-6" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {cartItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                <ShoppingCart className="w-12 h-12 text-gray-300" />
                                <p className="font-semibold text-gray-500 font-serif">Tu carrito está vacío</p>
                                <button onClick={() => { setIsCartOpen(false); handleNavigate('/catalogo'); }} className="bg-[#4f6354] text-white px-8 py-3.5 text-[11px] font-bold tracking-widest uppercase hover:bg-[#3d4d41] transition-colors">Ver Novedades</button>
                            </div>
                        ) : (
                            <ul className="space-y-6">
                                {cartItems.map((item: any) => (
                                    <li key={item.id} className="flex gap-4">
                                        <div className="w-20 aspect-[3/4] bg-gray-200 overflow-hidden rounded-sm flex-shrink-0">
                                            <img src={item.image || item.images?.[0] || '/placeholder.svg'} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between py-1">
                                            <div>
                                                <div className="flex justify-between gap-2 mb-1">
                                                    <h3 className="font-serif text-sm font-semibold text-gray-900 leading-snug">{item.name}</h3>
                                                </div>
                                                <span className="font-medium text-sm text-gray-600">${((item.price_mxn || item.price || 0)).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                                <div className="flex items-center gap-3 border border-gray-300 px-2 py-1 bg-white">
                                                    <button className="text-gray-500 hover:text-gray-900 font-bold w-4" onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}>-</button>
                                                    <span className="font-medium w-4 text-center text-sm">{item.quantity}</span>
                                                    <button className="text-gray-500 hover:text-gray-900 font-bold w-4" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                                </div>
                                                <button onClick={() => removeItem(item.id)} className="text-[10px] font-bold tracking-widest uppercase text-gray-500 hover:text-red-500 underline">Eliminar</button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {cartItems.length > 0 && (
                        <div className="p-6 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                            <div className="flex justify-between mb-4">
                                <span className="text-gray-600 font-medium text-sm uppercase tracking-wider">Subtotal</span>
                                <span className="font-serif font-bold text-xl">${(cartTotal || 0).toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-center text-gray-500 mb-4 tracking-wide">Envío e impuestos calculados al finalizar la compra</p>
                            <button className="w-full bg-[#4f6354] text-white py-4 font-bold text-xs tracking-widest uppercase hover:bg-[#3d4d41] transition-colors">Pagar Ahora</button>
                        </div>
                    )}
                </div>
            </div>
            {isCartOpen && <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />}
        </div>
    );
};
