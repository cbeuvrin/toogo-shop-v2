// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingCart, Heart, Search, Menu, X, User } from 'lucide-react';
import { useCart } from "@/contexts/CartContext";
import { LogoDisplay } from "@/components/ui/LogoDisplay";

export const PremiumBrandTemplate = (props: any) => {
    const {
        storeData,
        products,
        categories,
        favorites,
        toggleFavorite,
        effectiveSettings,
        banners,
        contactData,
        announcement,
        ticker,
        testimonials,
        view = 'home',
        products: catalogProducts
    } = props;

    const settings = effectiveSettings || storeData?.settings || {};
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const { items: cartItems, removeItem, updateQuantity, totalPrice: cartTotal } = useCart();
    const cartCount = cartItems.reduce((acc: number, item: any) => acc + item.quantity, 0);

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

    // Styling configuration
    const bg = settings?.store_background_color || '#023f66';
    const navbarBgColor = settings?.navbar_bg_color || '#f6f5f0';
    const footColor = settings?.footer_bg_color || '#023f66';
    const headerIconColor = settings?.header_icon_color || '#023f66';
    const headerIconScale = settings?.header_icon_scale || 1.0;
    const prodBgColor = settings?.product_card_bg_color || '#f0f0f0';

    const heroTitle = props.welcomeTitle || settings?.welcome_title || "Calidad excepcional en cada detalle.\nDescubre nuestra nueva colección.";
    const heroMessage = props.welcomeMessage || settings?.welcome_message || "Conoce más";

    const topCategories = categories?.filter((c: any) => !c.parent_id).slice(0, 4) || [];

    const currentTestimonials = testimonials || {
        enabled: true,
        position: 'beneath_hero',
        title: "Recomendaciones de Personas",
        list: [
            {
                id: '1',
                text: "¡Este producto es increíble! Muy recomendado.",
                author: "Cliente Feliz",
                role: "Usuario",
                company: "",
                logo: "/placeholder.svg"
            }
        ]
    };

    const testimonialsPos = currentTestimonials.position || 'beneath_hero';

    const renderTestimonials = () => {
        if (!currentTestimonials.enabled) return null;
        return (
            <div className="relative py-24 md:py-32 bg-[#023f66] text-white overflow-hidden">
                {/* Olas Arriba (Wave Top) */}
                <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-0">
                    <svg className="relative block w-full h-[40px] md:h-[60px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="#ffffff" />
                    </svg>
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <h2 className="text-center text-2xl md:text-3xl lg:text-4xl font-bold mb-16 max-w-4xl mx-auto leading-relaxed">
                        {currentTestimonials.title || "Recomendaciones de Personas"}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                        {(currentTestimonials.list || []).map((t: any) => (
                            <div key={t.id} className="bg-white text-gray-900 rounded-2xl p-8 pt-12 relative flex flex-col items-center text-center shadow-xl">
                                <div className="absolute -top-10 w-20 h-20 rounded-full bg-white border-2 border-gray-100 shadow-md flex items-center justify-center overflow-hidden">
                                    <img src={t.logo || '/placeholder.svg'} alt={t.company} className="max-w-[70%] max-h-[70%] object-contain" />
                                </div>
                                <p className="text-gray-600 text-sm md:text-base leading-relaxed mb-8 italic">"{t.text}"</p>
                                <div className="mt-auto">
                                    {t.author && <p className="text-sm font-semibold text-[#023f66]">- {t.author}</p>}
                                    {t.role && <p className="text-xs font-bold uppercase tracking-wider text-[#023f66] mt-3">{t.role}</p>}
                                    {t.company && <p className="text-xs font-bold uppercase tracking-wider text-[#023f66]">{t.company}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Olas Abajo (Wave Bottom) */}
                <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none rotate-180 z-0">
                    <svg className="relative block w-full h-[40px] md:h-[60px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="#ffffff" />
                    </svg>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen font-sans text-gray-900 selection:bg-[#023f66] selection:text-white pb-20 md:pb-0" style={{ backgroundColor: bg }}>
            {testimonialsPos === 'top' && !isCatalog && renderTestimonials()}

            {/* Announcement Bar */}
            {announcement?.enabled !== false && announcement?.text && (
                <div className="bg-[#023f66] text-white text-center py-2.5 text-xs font-medium tracking-wide">
                    {announcement.text}
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-50 shadow-sm transition-all duration-300" style={{ backgroundColor: navbarBgColor }}>
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="cursor-pointer" onClick={() => handleNavigate('/tienda')}>
                            <LogoDisplay
                                logoUrl={settings?.logo_url}
                                fallbackText={settings?.store_name || 'LOGO'}
                                disableFetch={true}
                                className="text-2xl font-bold tracking-tight text-gray-900"
                            />
                        </div>
                        <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-gray-600">
                            {topCategories.map((cat: any) => (
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
                                    <button onClick={() => handleNavigate('/catalogo')} className="hover:text-gray-900 transition-colors">Productos</button>
                                    <button onClick={() => handleNavigate('/catalogo')} className="hover:text-gray-900 transition-colors">Colección</button>
                                </>
                            )}
                        </nav>
                    </div>

                    <div className="flex items-center gap-5">
                        <button className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-600 hover:text-gray-900">
                            <User style={{ color: headerIconColor, width: `${18 * headerIconScale}px`, height: `${18 * headerIconScale}px` }} />
                            Iniciar Sesión
                        </button>
                        <Search className="hidden md:block cursor-pointer hover:scale-110 transition-transform" style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                        <div className="relative cursor-pointer hover:scale-110 transition-transform" onClick={() => setIsCartOpen(true)}>
                            <ShoppingCart style={{ color: headerIconColor, width: `${20 * headerIconScale}px`, height: `${20 * headerIconScale}px` }} />
                            {cartCount > 0 && <span className="absolute -bottom-1.5 -right-1.5 bg-[#e98063] text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full">{cartCount}</span>}
                        </div>
                        <button className="md:hidden" onClick={() => setIsMenuOpen(true)}>
                            <Menu style={{ color: headerIconColor, width: `${24 * headerIconScale}px`, height: `${24 * headerIconScale}px` }} />
                        </button>
                        <button onClick={() => handleNavigate('/catalogo')} className="hidden lg:block border-2 border-[#023f66] text-[#023f66] text-xs font-bold uppercase px-5 py-2 rounded-full hover:bg-[#023f66] hover:text-white transition-colors">
                            VER TODO
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            {!isCatalog && (
                <section className="relative w-full min-h-[500px] lg:h-[70vh] flex items-center">
                    {banners?.[0] ? (
                        <img src={banners[0].imageUrl || banners[0].image} alt="Hero" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: banners[0].position || 'center' }} />
                    ) : (
                        <div className="absolute inset-0 w-full h-full bg-gray-200"></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"></div>
                    <div className="container mx-auto px-6 relative z-10 text-white">
                        <div className="max-w-xl">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 whitespace-pre-line leading-tight">
                                {heroTitle}
                            </h1>
                            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-sm">
                                {heroMessage}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button onClick={() => handleNavigate('/catalogo')} className="bg-[#e98063] text-white px-8 py-3.5 rounded-full font-bold shadow-lg hover:bg-[#d46a4f] transition-colors text-center">
                                    Comprar Ahora
                                </button>
                                <button onClick={() => handleNavigate('/catalogo')} className="bg-transparent border-2 border-white text-white px-8 py-3.5 rounded-full font-bold hover:bg-white hover:text-gray-900 transition-colors text-center">
                                    Cómo Funciona
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {testimonialsPos === 'beneath_hero' && !isCatalog && renderTestimonials()}

            {/* Categories Section */}
            {!isCatalog && topCategories.length > 0 && (
                <section className="py-20 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-[#023f66] mb-12">¿Qué estás buscando?</h2>
                    <div className="container mx-auto px-6 flex flex-wrap justify-center gap-8">
                        {topCategories.map((c: any) => (
                            <div key={c.id} className="group cursor-pointer flex flex-col items-center" onClick={() => handleNavigate('/catalogo', { category: c.name.toLowerCase() })}>
                                <div className="w-56 h-40 rounded-3xl overflow-hidden mb-6 bg-gray-100 shadow-md group-hover:shadow-xl transition-all duration-300">
                                    <img src="/placeholder.svg" alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                </div>
                                <h3 className="text-[#023f66] font-bold text-xl">{c.name}</h3>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Best Sellers Section */}
            {!isCatalog && (
                <section className="py-20 bg-gray-50 border-y border-gray-200">
                    <div className="container mx-auto px-6">
                        <h2 className="text-3xl md:text-4xl font-bold text-[#023f66] text-center mb-16">Productos más vendidos</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            {(props.featuredProducts && props.featuredProducts.length > 0) ? (
                                props.featuredProducts.map((productId: string) => {
                                    const product = products?.find((p: any) => p.id === productId);
                                    if (!product) return null;
                                    const image = (product.images?.[0] && typeof product.images[0] === 'object') ? product.images[0].url : (product.images?.[0] || product.image || '/placeholder.svg');
                                    return (
                                        <div key={product.id} className="group cursor-pointer bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300" onClick={() => (props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`))}>
                                            <div className="relative aspect-square bg-[#f8f8f8] p-6 flex items-center justify-center">
                                                <img src={image} alt={product.title || product.name} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                                                <button
                                                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-50"
                                                    onClick={(e) => { e.stopPropagation(); toggleFavorite?.(product.id); }}
                                                >
                                                    <Heart className={`w-5 h-5 ${favorites?.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                                                </button>
                                            </div>
                                            <div className="p-6 text-center">
                                                <h3 className="font-bold text-[#023f66] text-lg mb-2 line-clamp-2">{product.title || product.name}</h3>
                                                <span className="font-bold text-[#e98063] text-xl">${product.sale_price_mxn || product.price_mxn || product.price}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                displayProducts.slice(0, 4).map((product: any) => (
                                    <div key={product.id} className="group cursor-pointer bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300" onClick={() => (props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`))}>
                                        <div className="relative aspect-square bg-[#f8f8f8] p-6 flex items-center justify-center">
                                            <img src={(product.images?.[0] && typeof product.images[0] === 'object') ? product.images[0].url : (product.images?.[0] || product.image || '/placeholder.svg')} alt={product.title || product.name} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                                            <button
                                                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-50"
                                                onClick={(e) => { e.stopPropagation(); toggleFavorite?.(product.id); }}
                                            >
                                                <Heart className={`w-5 h-5 ${favorites?.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                                            </button>
                                        </div>
                                        <div className="p-6 text-center">
                                            <h3 className="font-bold text-[#023f66] text-lg mb-2 line-clamp-2">{product.title || product.name}</h3>
                                            <span className="font-bold text-[#e98063] text-xl">${product.sale_price_mxn || product.price_mxn || product.price}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>
            )}

            {isCatalog && (
                <div className="container mx-auto px-6 py-12">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#023f66] mb-6 sm:mb-8">Catálogo</h1>
                </div>
            )}

            {/* Products Grid */}
            <section className="container mx-auto px-6 py-16">
                {!isCatalog && <h2 className="text-3xl font-bold text-[#023f66] mb-10 border-b border-gray-200 pb-4">Productos</h2>}
                {displayProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {(isCatalog ? displayProducts : displayProducts.slice(0, 8)).map((product: any) => (
                            <div key={product.id} className="group cursor-pointer bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300" onClick={() => (props.onProductClick ? props.onProductClick(product) : handleNavigate(`/product/${product.slug || product.id}`))}>
                                <div className="relative aspect-square bg-[#f8f8f8] p-6 flex items-center justify-center">
                                    <img src={(product.images?.[0] && typeof product.images[0] === 'object') ? product.images[0].url : (product.images?.[0] || product.image || '/placeholder.svg')} alt={product.title || product.name} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                                    <button
                                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-50"
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite?.(product.id); }}
                                    >
                                        <Heart className={`w-5 h-5 ${favorites?.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                                    </button>
                                </div>
                                <div className="p-6 text-center">
                                    <h3 className="font-bold text-[#023f66] text-lg mb-2 line-clamp-2">{product.title || product.name}</h3>
                                    <p className="text-[#023f66] opacity-60 text-sm mb-4 line-clamp-2">{product.description || "La mejor experiencia de calidad."}</p>
                                    <span className="font-bold text-[#e98063] text-xl">${product.sale_price_mxn || product.price_mxn || product.price}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 py-10">No se encontraron productos.</p>
                )}
            </section>

            {testimonialsPos === 'above_footer' && !isCatalog && renderTestimonials()}

            {/* Footer */}
            <footer className="relative pt-24 pb-10 overflow-hidden" style={{ backgroundColor: footColor, color: '#fff' }}>
                {/* Olas Arriba de Footer (Wave Top) */}
                <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-0">
                    <svg className="relative block w-full h-[40px] md:h-[60px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="#ffffff" />
                    </svg>
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="md:col-span-1">
                            <LogoDisplay logoUrl={settings?.logo_url} fallbackText={settings?.store_name || 'LOGO'} className="text-3xl font-bold tracking-tight text-white mb-6" />
                            <p className="text-sm text-white/70 max-w-xs leading-relaxed">{contactData?.address || "Transforma tu rutina diaria con nuestra colección premium."}</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-sm mb-6 uppercase tracking-widest text-[#e98063]">Tienda</h4>
                            <ul className="space-y-4 text-sm text-white/80">
                                {topCategories.map((c: any) => (
                                    <li key={c.id}><button onClick={() => handleNavigate('/catalogo', { category: c.name.toLowerCase() })} className="hover:text-white transition-colors">{c.name}</button></li>
                                ))}
                                <li><button onClick={() => handleNavigate('/catalogo')} className="hover:text-white transition-colors">Todos los Productos</button></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-sm mb-6 uppercase tracking-widest text-[#e98063]">Soporte</h4>
                            <ul className="space-y-4 text-sm text-white/80">
                                {contactData?.whatsapp && <li><a href={`https://wa.me/${contactData.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp: {contactData.whatsapp}</a></li>}
                                {contactData?.email && <li><a href={`mailto:${contactData.email}`} className="hover:text-white transition-colors">Email: {contactData.email}</a></li>}
                                <li>Preguntas Frecuentes</li>
                                <li>Envíos y Devoluciones</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-sm mb-6 uppercase tracking-widest text-[#e98063]">Síguenos</h4>
                            <div className="flex gap-4">
                                {contactData?.instagram && <a href={contactData.instagram} className="hover:text-white transition-colors opacity-80 hover:opacity-100">Instagram</a>}
                                {contactData?.facebook && <a href={contactData.facebook} className="hover:text-white transition-colors opacity-80 hover:opacity-100">Facebook</a>}
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-white/50 text-xs uppercase tracking-widest">
                        <p>© {new Date().getFullYear()} {settings?.store_name || 'Tu Tienda'}. Todos los derechos reservados.</p>
                        <p>Powered by Toogo</p>
                    </div>
                </div>
            </footer>

            {testimonialsPos === 'bottom' && !isCatalog && renderTestimonials()}

            {/* Mobile Menu & Cart overlays omitted for brevity but would follow same structure as TrendyFashion */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[60] bg-[#023f66] text-white p-6 overflow-y-auto">
                    <div className="flex justify-between items-center mb-10">
                        <LogoDisplay logoUrl={settings?.logo_url} fallbackText={settings?.store_name || 'LOGO'} className="text-2xl font-bold" />
                        <button onClick={() => setIsMenuOpen(false)}><X className="w-8 h-8" /></button>
                    </div>
                    <div className="space-y-6 text-2xl font-bold">
                        {topCategories.map((c: any) => (
                            <button key={c.id} onClick={() => { handleNavigate('/catalogo', { category: c.name.toLowerCase() }); setIsMenuOpen(false); }} className="block w-full text-left">{c.name}</button>
                        ))}
                        <button onClick={() => { handleNavigate('/catalogo'); setIsMenuOpen(false); }} className="block w-full text-left text-[#e98063]">Ver Todo</button>
                    </div>
                </div>
            )}

            {/* Cart Drawer */}
            {isCartOpen && (
                <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col">
                    <div className="p-6 border-b flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-[#023f66]">Tu Carrito <span className="text-gray-400 font-normal text-lg ml-1">({cartCount})</span></h2>
                        <button onClick={() => setIsCartOpen(false)}><X className="w-6 h-6 hover:rotate-90 transition-transform" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {cartItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                <ShoppingCart className="w-16 h-16 text-gray-200" />
                                <p className="font-bold text-gray-400 text-xl">Tu carrito está vacío</p>
                                <button onClick={() => { setIsCartOpen(false); handleNavigate('/catalogo'); }} className="mt-4 bg-[#e98063] text-white px-8 py-3 rounded-full font-bold">Empezar a Comprar</button>
                            </div>
                        ) : (
                            <ul className="space-y-6">
                                {cartItems.map((item: any) => (
                                    <li key={item.id} className="flex gap-4">
                                        <div className="w-24 aspect-square bg-[#f8f8f8] rounded-xl flex-shrink-0 flex items-center justify-center p-2 border border-gray-100">
                                            <img src={item.image || item.images?.[0] || '/placeholder.svg'} alt={item.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                                        </div>
                                        <div className="flex-1 flex flex-col">
                                            <div className="flex justify-between gap-2 mb-2">
                                                <h3 className="font-bold text-[#023f66] leading-snug">{item.name}</h3>
                                                <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                                            </div>
                                            <span className="font-bold text-[#e98063] mb-auto">${Number(item.price_mxn || item.price || 0).toFixed(2)}</span>
                                            <div className="flex items-center gap-3 border border-gray-200 w-fit rounded-full px-1 py-1 mt-4">
                                                <button className="text-gray-500 w-8 flex justify-center" onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}>-</button>
                                                <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                                                <button className="text-gray-500 w-8 flex justify-center" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {cartItems.length > 0 && (
                        <div className="p-6 border-t bg-gray-50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-10">
                            <div className="flex justify-between mb-6">
                                <span className="text-[#023f66] font-bold text-lg">Subtotal</span>
                                <span className="font-bold text-2xl text-[#023f66]">${(cartTotal || 0).toFixed(2)}</span>
                            </div>
                            <button className="w-full bg-[#023f66] text-white py-4 rounded-full font-bold uppercase tracking-widest hover:bg-[#114b70] transition-colors shadow-xl">Pago Seguro</button>
                        </div>
                    )}
                </div>
            )}
            {isCartOpen && <div className="fixed inset-0 bg-[#023f66]/50 backdrop-blur-sm z-[65]" onClick={() => setIsCartOpen(false)} />}
        </div>
    );
};
