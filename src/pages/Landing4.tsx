import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Store, Zap, Shield, ChevronUp, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { OnboardingModal } from "@/components/OnboardingModal";
import { ChatBotContainer } from "@/components/ChatBotContainer";
import { SEOHead } from "@/components/SEOHead";
import { ContactSupportForm } from "@/components/ContactSupportForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePlatformFacebookPixel } from "@/hooks/usePlatformFacebookPixel";
import { TEMPLATES } from "@/lib/templatesCatalog";
const Landing4 = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingFlowType, setOnboardingFlowType] = useState<"subdomain" | "domain" | undefined>(undefined);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isVibrating, setIsVibrating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const templatesCarouselRef = useRef<HTMLDivElement>(null);
  const scrollTemplates = (dir: number) => {
    templatesCarouselRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  // Initialize platform Facebook Pixel
  const { trackPageView, trackLead } = usePlatformFacebookPixel();

  useEffect(() => {
    trackPageView('/', 'TOOGO - Landing Page');
  }, []);
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  useEffect(() => {
    const handleScroll = () => {
      // Show button when user scrolls past the hero section (approximately 100vh)
      const heroHeight = window.innerHeight;
      const scrollPosition = window.scrollY;
      setShowScrollButton(scrollPosition > heroHeight);
    };
    window.addEventListener('scroll', handleScroll);

    // Check initial scroll position
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') === '1') {
      console.log('[Onboarding] onboarding=1 detected in URL, opening modal');
      setShowOnboarding(true);
      params.delete('onboarding');
      const newQuery = params.toString();
      const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVibrating(true);
      setTimeout(() => setIsVibrating(false), 500); // Reset after 0.5s (animation duration)
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return <div className="min-h-screen" style={{
    backgroundColor: '#E0E0E0'
  }}>
    <SEOHead />
    {/* Navigation */}
    <nav className="w-full max-w-[95%] lg:max-w-[80%] mx-auto px-4 lg:px-6 py-4 lg:py-6">
      <div className="flex items-center justify-between bg-white rounded-full px-4 lg:px-8 py-3 lg:py-4 shadow-sm border border-gray-100">
        <img src="/lovable-uploads/7a48d2dc-1797-4805-afe6-3c6f336c128d.png" alt="toogo logo" className="h-8 lg:h-10 w-auto" />

        {/* Desktop menu */}
        <div className="hidden md:flex items-center space-x-4 lg:space-x-8">
          <a href="#precios" className="text-gray-600 hover:text-gray-900 transition-colors text-sm lg:text-base">
            Precios
          </a>
          <a href="#testimonios" className="text-gray-600 hover:text-gray-900 transition-colors text-sm lg:text-base">
            Testimonios
          </a>
          <Link to="/blog" className="text-gray-600 hover:text-gray-900 transition-colors text-sm lg:text-base">
            Blog
          </Link>
          <Link to="/auth" className="text-gray-600 hover:text-gray-900 transition-colors text-sm lg:text-base">
            Iniciar sesión
          </Link>
          <Button onClick={() => {
            trackLead('onboarding_started', { source: 'nav_button' });
            setOnboardingFlowType('subdomain');
            setShowOnboarding(true);
          }} className="bg-primary hover:bg-primary/90 text-white rounded-full px-4 lg:px-6 py-2 text-sm lg:text-base">
            Comenzar gratis
          </Button>
        </div>

        {/* Mobile menu: CTA siempre visible + hamburguesa */}
        <div className="md:hidden flex items-center space-x-2">
          <Button onClick={() => {
            trackLead('onboarding_started', { source: 'mobile_nav_button' });
            setOnboardingFlowType('subdomain');
            setShowOnboarding(true);
          }} className="bg-primary hover:bg-primary/90 text-white rounded-full px-4 py-2 text-sm">
            Comenzar
          </Button>
          <button
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-700"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 bg-white rounded-3xl shadow-lg border border-gray-100 px-6 py-4">
          <div className="flex flex-col divide-y divide-gray-100">
            <a href="#precios" onClick={() => setMobileMenuOpen(false)} className="py-3 text-gray-700 hover:text-gray-900">
              Precios
            </a>
            <a href="#testimonios" onClick={() => setMobileMenuOpen(false)} className="py-3 text-gray-700 hover:text-gray-900">
              Testimonios
            </a>
            <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="py-3 text-gray-700 hover:text-gray-900">
              Blog
            </Link>
            <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="py-3 text-gray-700 hover:text-gray-900">
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </nav>

    {/* Hero Section */}
    <section className="px-4 lg:px-6 py-8 lg:py-16">
      <div className="max-w-[95%] lg:max-w-[80%] mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left side - Text content */}
          <div className="space-y-6 lg:space-y-8 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-[900] text-gray-900 leading-tight">
              Tu tienda en línea,{" "}
              <span className="block leading-none">lista para vender.</span>
            </h1>
            <div className="space-y-1 leading-tight">
              <p className="text-lg text-gray-600 leading-tight px-0 py-[9px] my-0 mx-0 lg:text-2xl">Cambia el diseño de tu tienda con un click. </p>
              <p className="text-lg text-gray-600 font-semibold leading-tight lg:text-2xl">Solo entra y empieza.</p>
            </div>
            <div className="flex flex-col items-center lg:items-start gap-2">
              <Button onClick={() => {
                trackLead('onboarding_started', { source: 'hero_button' });
                setOnboardingFlowType('subdomain');
                setShowOnboarding(true);
              }} className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 lg:px-8 py-3 lg:py-4 text-base lg:text-lg">
                Comenzar gratis
              </Button>
              <p className="text-sm text-gray-500">Sin tarjeta de crédito · Gratis para siempre</p>
              <button onClick={() => {
                trackLead('onboarding_started', { source: 'hero_button_own_domain' });
                setOnboardingFlowType('domain');
                setShowOnboarding(true);
              }} className="text-sm text-gray-600 hover:text-primary underline underline-offset-4 mt-1 transition-colors">
                Ya tengo mi propio dominio →
              </button>
            </div>
          </div>

          {/* Right side - Collage animado de tiendas (estilo landing 3) */}
          <div className="order-last hidden sm:block">
            <style>{`
              @media (prefers-reduced-motion: no-preference) {
                .l4-col-a { animation: l4drift 42s linear infinite; }
                .l4-col-b { animation: l4drift 56s linear infinite reverse; }
                .l4-col-c { animation: l4drift 48s linear infinite; }
                @keyframes l4drift {
                  from { transform: translateY(0); }
                  to   { transform: translateY(-50%); }
                }
              }
            `}</style>
            <div
              className="grid grid-cols-3 gap-4 overflow-hidden h-[420px] lg:h-[560px]"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)'
              }}
              aria-hidden="true"
            >
              {[
                { cls: 'l4-col-a', imgs: ['/assets/templates/mediterraneo.png', '/assets/templates/caribe.png', '/assets/templates/nature.png'] },
                { cls: 'l4-col-b', imgs: ['/assets/templates/pacifico.png', '/assets/templates/indico.png', '/assets/templates/atlantico.png'] },
                { cls: 'l4-col-c', imgs: ['/assets/templates/adriatico.png', '/assets/templates/mediterraneo.png', '/assets/templates/pacifico.png'] },
              ].map(col => (
                <div key={col.cls} className={`flex flex-col gap-4 ${col.cls}`}>
                  {[...col.imgs, ...col.imgs].map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      loading="lazy"
                      className="rounded-2xl border border-gray-100 shadow-md aspect-[4/5] object-cover object-top"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Value Proposition Cards */}
    <section className="py-8 lg:py-16 px-4 lg:px-6">
      <div className="max-w-[95%] lg:max-w-[80%] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Sin plantilla - Purple card */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white">
            <h3 className="text-xl lg:text-2xl font-bold mb-3 lg:mb-4">Diseños que enamoran</h3>
            <p className="text-purple-100 text-base lg:text-lg leading-relaxed">
              Elige el estilo que va con tu marca y cámbialo cuando quieras.
            </p>
          </div>

          {/* Sin programadores - Dark blue card */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white">
            <h3 className="text-xl lg:text-2xl font-bold mb-3 lg:mb-4">Sin programadores</h3>
            <p className="text-slate-200 text-base lg:text-lg leading-relaxed">No necesitas saber nada de programación, ni de nada. </p>
          </div>

          {/* Tu tienda en minutos - Light card */}
          <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-lg border border-gray-100 md:col-span-2 lg:col-span-1">
            <h3 className="text-xl lg:text-2xl font-bold mb-3 lg:mb-4 text-gray-900 leading-tight">Tu tienda en minutos, sin pagar mantenimiento</h3>
            <p className="text-gray-600 text-base lg:text-lg leading-relaxed">
              Tu tienda se crea al instante y el asistente con IA te ayuda a dejarla lista: logo, banner, colores y productos de ejemplo. Tú la manejas y TOOGO se encarga del resto.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* Templates Carousel Section */}
    <section className="py-8 lg:py-16 px-4 lg:px-6">
      <div className="max-w-[95%] lg:max-w-[80%] mx-auto">
        <div className="text-center mb-8 lg:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 lg:mb-4">Un estilo para cada marca</h2>
          <p className="text-lg lg:text-xl text-gray-600">Cambia el diseño de tu tienda con un click — y seguimos sumando nuevos estilos</p>
        </div>
        <div className="relative">
          <button
            aria-label="Anterior"
            onClick={() => scrollTemplates(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 bg-white shadow-lg border border-gray-200 rounded-full p-2 lg:p-3 text-gray-700 hover:bg-gray-50 hover:scale-110 transition-all"
          >
            <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
          <button
            aria-label="Siguiente"
            onClick={() => scrollTemplates(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 bg-white shadow-lg border border-gray-200 rounded-full p-2 lg:p-3 text-gray-700 hover:bg-gray-50 hover:scale-110 transition-all"
          >
            <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
          <div ref={templatesCarouselRef} className="flex gap-4 lg:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory [-webkit-overflow-scrolling:touch] scroll-smooth">
          {TEMPLATES.map((t) => (
            <div key={t.id} className="snap-start flex-shrink-0 w-60 sm:w-64 lg:w-72 bg-white rounded-2xl lg:rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="aspect-square bg-gray-50 overflow-hidden">
                <img src={t.thumbnail} alt={`Plantilla ${t.name}`} loading="lazy" className="w-full h-full object-cover object-top" />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-2">{t.name}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {t.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
        <div className="text-center mt-6 lg:mt-8">
          <Button onClick={() => {
            trackLead('onboarding_started', { source: 'templates_carousel' });
            setOnboardingFlowType('subdomain');
            setShowOnboarding(true);
          }} className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6 lg:px-8 py-3 text-base lg:text-lg font-semibold">
            Crea tu tienda y pruébalos
          </Button>
        </div>
      </div>
    </section>

    {/* WhatsApp Bot Section */}
    <section className="py-8 md:py-12 lg:py-16 px-4 lg:px-6">
      <div className="max-w-[95%] lg:max-w-[80%] mx-auto">
        <div className="bg-white rounded-[20px] md:rounded-[30px] p-6 md:p-10 lg:p-16 shadow-lg border border-gray-100">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center">
            {/* Left Column - Chat Interface */}
            <div className={`order-2 lg:order-1 flex justify-center transition-transform ${isVibrating ? 'animate-shake' : ''}`}>
              <div className="w-full max-w-[300px] sm:max-w-[350px] bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border-[6px] sm:border-8 border-gray-900 overflow-hidden relative">
                {/* Phone Notch */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 sm:w-40 h-5 sm:h-6 bg-gray-900 rounded-b-3xl"></div>

                {/* Chat Header */}
                <div className="bg-[#075E54] p-4 pt-10 flex items-center gap-3 text-white">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Mi Tienda Toogo</h3>
                    <p className="text-xs text-green-100">En línea</p>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="bg-[#E5DDD5] p-4 h-[400px] flex flex-col gap-4 overflow-y-auto bg-opacity-50" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain' }}>

                  {/* User Message */}
                  <div className="self-end bg-[#DCF8C6] p-3 rounded-lg rounded-tr-none shadow-sm max-w-[85%]">
                    <p className="text-sm text-gray-800">Quiero subir el precio de los Sneakers a $1,200</p>
                    <span className="text-[10px] text-gray-500 block text-right mt-1">10:42 AM <span className="text-blue-500">✓✓</span></span>
                  </div>

                  {/* Bot Reply */}
                  <div className="self-start bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[85%] flex gap-2">
                    <div>
                      <p className="text-sm text-gray-800 font-semibold mb-1">¡Entendido! 👟</p>
                      <p className="text-sm text-gray-800">He actualizado el precio de <strong>Sneakers Urban</strong> a <strong>$1,200</strong>.</p>
                      <div className="mt-2 bg-gray-100 p-2 rounded text-xs text-gray-600 border-l-4 border-green-500">
                        Precio anterior: $950
                      </div>
                    </div>
                  </div>

                  {/* User Message 2 */}
                  <div className="self-end bg-[#DCF8C6] p-3 rounded-lg rounded-tr-none shadow-sm max-w-[85%] mt-2">
                    <p className="text-sm text-gray-800">¿Cuánto he vendido hoy?</p>
                    <span className="text-[10px] text-gray-500 block text-right mt-1">10:45 AM <span className="text-blue-500">✓✓</span></span>
                  </div>

                  {/* Bot Reply 2 */}
                  <div className="self-start bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[85%]">
                    <p className="text-sm text-gray-800">📅 <strong>Reporte de Hoy:</strong></p>
                    <p className="text-sm text-gray-800 mt-1">Ventas totales: <strong>$8,450.00</strong></p>
                    <p className="text-sm text-gray-800">Pedidos: <strong>12</strong></p>
                    <p className="text-xs text-gray-500 mt-2 italic">Sigue así 🚀</p>
                    <span className="text-[10px] text-gray-400 block text-right mt-1">10:45 AM</span>
                  </div>

                </div>

                {/* Input Area (Mock) */}
                <div className="bg-white p-3 flex items-center gap-2 border-t">
                  <div className="w-6 h-6 rounded-full bg-gray-200"></div>
                  <div className="flex-1 h-8 bg-gray-100 rounded-full px-3 text-xs flex items-center text-gray-400">Escribe un mensaje...</div>
                  <div className="w-8 h-8 rounded-full bg-[#075E54] flex items-center justify-center">
                    <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-1"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Text Content */}
            <div className="order-1 lg:order-2 space-y-6 text-center lg:text-left">
              <div className="inline-block bg-green-100 text-green-700 font-semibold px-4 py-1 rounded-full text-xs sm:text-sm mb-2">
                NUEVO ✨
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                Habla con tu tienda<br />
                <span className="text-[#25D366]">por WhatsApp</span>
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 leading-relaxed">
                Olvídate de paneles complicados. Con Toogo, gestionar tu negocio es tan fácil como chatear con un amigo.
              </p>

              <ul className="space-y-4 text-left mx-auto lg:mx-0 max-w-md">
                <li className="flex items-start">
                  <div className="bg-green-100 p-2 rounded-full mr-4 mt-1">
                    <Zap className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Cambia precios al instante</h4>
                    <p className="text-gray-600 text-sm">Solo escribe "Cambiar precio" y listo.</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-purple-100 p-2 rounded-full mr-4 mt-1">
                    <Store className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Sube productos con una foto</h4>
                    <p className="text-gray-600 text-sm">Envía la foto, precio y nombre. Nosotros la creamos.</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-blue-100 p-2 rounded-full mr-4 mt-1">
                    <Shield className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Consulta tus ventas</h4>
                    <p className="text-gray-600 text-sm">Pregunta "¿cuánto vendí hoy?" y recibe un reporte.</p>
                  </div>
                </li>
              </ul>

              <div className="pt-4">
                <Button onClick={() => {
                  trackLead('onboarding_started', { source: 'whatsapp_section' });
                  setOnboardingFlowType('subdomain');
                  setShowOnboarding(true);
                }} className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all">
                  Probar ahora
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Video Section */}
    < section className="py-8 lg:py-16 px-4 lg:px-6" >
      <div className="max-w-[95%] lg:max-w-[80%] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Text Content - Left Column */}
          <div className="order-1 md:order-1">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 lg:mb-6">
              Una mirada al futuro de tu tienda
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 mb-6 leading-relaxed">
              Descubre lo sencillo que es crear tu tienda online con TOOGO. En este video te mostramos los pasos simples para tener tu negocio funcionando en minutos.
            </p>
            <div className="space-y-3">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Configuración en menos de 5 minutos</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Sin conocimientos técnicos necesarios</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">Tu tienda lista para vender al instante</span>
              </div>
            </div>
          </div>

          {/* Video - Right Column */}
          <div className="order-2 md:order-2 flex justify-center">
            <div className="group">
              <video src="/assets/toogo-vertical-demo.mp4" className="w-80 h-[480px] sm:w-64 sm:h-96 md:w-72 md:h-[432px] lg:w-80 lg:h-[480px] object-cover rounded-2xl shadow-2xl transition-all duration-500 ease-out group-hover:scale-110 group-hover:shadow-3xl border-[10px] border-white" controls poster="/assets/toogo.png" preload="metadata">
                Tu navegador no soporta la reproducción de video.
              </video>
            </div>
          </div>
        </div>
      </div>
    </section >

    {/* Demo Section */}
    < section className="py-8 lg:py-12 px-4 lg:px-6" >
      <div className="max-w-[95%] lg:max-w-[80%] mx-auto">
        <div className="bg-gray-50 rounded-2xl lg:rounded-3xl p-8 lg:p-16 text-center">
          <div className="flex justify-center mb-6 lg:mb-8">
            <img src="/lovable-uploads/16ca1c29-687c-4e73-ac12-9edcff496a4c.png" alt="toogo mascot" className="w-32 h-32 lg:w-48 lg:h-48 object-contain animate-bounce" />
          </div>
          <a href="https://volta.toogo.store" target="_blank" rel="noopener noreferrer">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8 lg:px-12 py-3 lg:py-4 text-base lg:text-lg font-semibold">Mira tu próxima tienda</Button>
          </a>
        </div>
      </div>
    </section >

    {/* Testimonials Section */}
    < section id="testimonios" className="py-8 lg:py-16 px-4 lg:px-6" >
      <div className="max-w-[95%] lg:max-w-[80%] mx-auto">
        <div className="text-center mb-8 lg:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 lg:mb-4">Lo que dicen nuestros clientes</h2>
          <p className="text-lg lg:text-xl text-gray-600">Miles de emprendedores ya están vendiendo con Toogo</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Testimonio 1 - María González */}
          <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-lg">
            <div className="flex mb-3 lg:mb-4">
              {[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-lg lg:text-xl">★</span>)}
            </div>
            <blockquote className="text-gray-700 text-base lg:text-lg mb-4 lg:mb-6 leading-relaxed">
              "En 2 días ya tenía mi tienda funcionando. Las ventas aumentaron un 300%."
            </blockquote>
            <div>
              <p className="font-semibold text-gray-900 text-sm lg:text-base">María González</p>
              <p className="text-gray-600 text-sm lg:text-base">Boutique Luna</p>
            </div>
          </div>

          {/* Testimonio 2 - Carlos Ruiz */}
          <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-lg">
            <div className="flex mb-3 lg:mb-4">
              {[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-lg lg:text-xl">★</span>)}
            </div>
            <blockquote className="text-gray-700 text-base lg:text-lg mb-4 lg:mb-6 leading-relaxed">
              "La integración con WhatsApp es perfecta. Mis clientes compran sin complicaciones."
            </blockquote>
            <div>
              <p className="font-semibold text-gray-900 text-sm lg:text-base">Carlos Ruiz</p>
              <p className="text-gray-600 text-sm lg:text-base">TechStore MX</p>
            </div>
          </div>

          {/* Testimonio 3 - Ana Pérez */}
          <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-lg">
            <div className="flex mb-3 lg:mb-4">
              {[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-lg lg:text-xl">★</span>)}
            </div>
            <blockquote className="text-gray-700 text-base lg:text-lg mb-4 lg:mb-6 leading-relaxed">
              "Increíble lo fácil que es. En una tarde mi negocio estaba online."
            </blockquote>
            <div>
              <p className="font-semibold text-gray-900 text-sm lg:text-base">Ana Pérez</p>
              <p className="text-gray-600 text-sm lg:text-base">Delicias Caseras</p>
            </div>
          </div>
        </div>
      </div>
    </section >

    {/* Pricing Section */}
    < section id="precios" className="py-8 lg:py-16 px-4 lg:px-6" >
      <div className="max-w-[95%] lg:max-w-[80%] mx-auto">
        <div className="text-center mb-8 lg:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 lg:mb-4">Precios simples y transparentes</h2>
          <p className="text-lg lg:text-xl text-gray-600">Comienza gratis, escala cuando lo necesites</p>
          <p className="text-base lg:text-lg font-semibold text-green-600 mt-2">0% de comisión por venta en todos los planes</p>
          <p className="text-base lg:text-lg text-gray-500 mt-2">Precios en pesos mexicanos (MXN)</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {/* Plan Gratuito */}
          <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-lg">
            <div className="text-center mb-6 lg:mb-8">
              <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3 lg:mb-4">Plan Gratuito</h3>
              <div className="mb-2">
                <span className="text-4xl lg:text-5xl font-bold text-gray-900">$0</span>
              </div>
              <p className="text-gray-600 text-sm lg:text-base">por siempre</p>
            </div>

            <ul className="space-y-3 lg:space-y-4 mb-6 lg:mb-8">
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-500 mr-2 lg:mr-3 flex-shrink-0" />
                <span className="text-gray-700 text-sm lg:text-base">Subdominio .toogo.store</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-500 mr-2 lg:mr-3 flex-shrink-0" />
                <span className="text-gray-700 text-sm lg:text-base">Hasta 20 productos</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-500 mr-2 lg:mr-3 flex-shrink-0" />
                <span className="text-gray-700 text-sm lg:text-base">Ventas por WhatsApp</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-500 mr-2 lg:mr-3 flex-shrink-0" />
                <span className="text-gray-700 text-sm lg:text-base">Conecta tu pasarela de pago</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-500 mr-2 lg:mr-3 flex-shrink-0" />
                <span className="text-gray-700 text-sm lg:text-base">Soporte básico</span>
              </li>
            </ul>

            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-full py-3 text-base lg:text-lg font-semibold" onClick={() => {
              trackLead('onboarding_started', { source: 'pricing_free_plan' });
              setOnboardingFlowType("subdomain");
              setShowOnboarding(true);
            }}>
              Empezar gratis
            </Button>
          </div>

          {/* Plan Basic */}
          <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-lg border-2 border-purple-500 relative">
            <div className="absolute -top-3 lg:-top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-purple-600 text-white px-3 lg:px-4 py-1 rounded-full text-xs lg:text-sm">
                Más popular
              </Badge>
            </div>

            <div className="text-center mb-6 lg:mb-8">
              <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3 lg:mb-4">Plan Basic</h3>
              <div className="mb-2">
                <span className="text-4xl lg:text-5xl font-bold text-gray-900">$299</span>
                <span className="text-xl text-gray-500 ml-1">MXN</span>
              </div>
              <p className="text-gray-600 text-sm lg:text-base">por mes</p>
            </div>

            <ul className="space-y-3 lg:space-y-4 mb-6 lg:mb-8">
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-500 mr-2 lg:mr-3 flex-shrink-0" />
                <span className="text-gray-700 text-sm lg:text-base">Dominio personalizado</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-500 mr-2 lg:mr-3 flex-shrink-0" />
                <span className="text-gray-700 text-sm lg:text-base">Productos ilimitados</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-500 mr-2 lg:mr-3 flex-shrink-0" />
                <span className="text-gray-700 text-sm lg:text-base">Tu logo como favicon (branding propio)</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-500 mr-2 lg:mr-3 flex-shrink-0" />
                <span className="text-gray-700 text-sm lg:text-base">Analytics avanzados</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-500 mr-2 lg:mr-3 flex-shrink-0" />
                <span className="text-gray-700 text-sm lg:text-base">Soporte prioritario</span>
              </li>
            </ul>

            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-full py-3 text-base lg:text-lg font-semibold" onClick={() => {
              setOnboardingFlowType("domain");
              setShowOnboarding(true);
            }}>Empezar plan basic</Button>
          </div>
        </div>
      </div>
    </section >

    {/* Call to Action Section */}
    < section className="py-8 lg:py-16 px-4 lg:px-6" >
      <div className="max-w-[95%] lg:max-w-4xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left side - Image */}
          <div className="flex justify-center lg:justify-start order-last lg:order-first">
            <div className="bg-white p-3 lg:p-4 rounded-2xl lg:rounded-3xl shadow-lg w-full sm:w-4/5 md:w-3/5 lg:w-4/5">
              <div className="rounded-xl lg:rounded-2xl overflow-hidden">
                <img src="/lovable-uploads/2bc4a296-1a6d-442f-aa8b-1603ef872999.png" alt="Mujeres trabajando en una tienda" className="w-full h-auto object-cover" />
              </div>
            </div>
          </div>

          {/* Right side - Text content */}
          <div className="space-y-6 lg:space-y-8 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 leading-tight">
              Olvídate del estrés de crear una tienda
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 leading-relaxed">
              Con Toogo, ya todo hecho. Sólo sube tus productos y empieza a vender
            </p>
            <Button onClick={() => {
              setOnboardingFlowType('subdomain');
              setShowOnboarding(true);
            }} className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6 lg:px-8 py-3 lg:py-4 text-base lg:text-lg font-semibold">
              Comenzar gratis
            </Button>
          </div>
        </div>
      </div>
    </section >

    {/* Swinging Image Section */}
    < section className="py-8 lg:py-16 px-4 lg:px-6" >
      <div className="max-w-[95%] lg:max-w-4xl mx-auto text-center">
        <div className="flex justify-center">
          <div className="animate-swing origin-top" style={{
            transformOrigin: 'top center'
          }}>
            <img src="/lovable-uploads/929755de-4946-479f-82ed-a328afea0a1c.png" alt="It's too easy - shopping bag character" className="w-64 sm:w-80 lg:w-[26rem] h-auto" />
          </div>
        </div>
      </div>
    </section >

    {/* FAQ Section */}
    < section className="py-8 lg:py-16 px-4 lg:px-6" >
      <div className="max-w-[95%] lg:max-w-[80%] mx-auto">
        <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-12 shadow-lg">
          <div className="text-center mb-8 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Preguntas Frecuentes</h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <Accordion type="multiple" className="space-y-3 lg:space-y-8">
              <AccordionItem value="item-1" className="border-none">
                <AccordionTrigger className="bg-purple-600 text-white rounded-full px-6 lg:px-8 py-4 lg:py-5 font-semibold lg:font-bold text-left hover:no-underline hover:bg-purple-700 transition-colors [&>svg]:text-white text-xs lg:text-base">
                  ¿Necesito saber de diseño o programación para usar Toogo?
                </AccordionTrigger>
                <AccordionContent className="bg-white text-gray-900 rounded-2xl lg:rounded-3xl p-4 lg:p-6 mt-3 shadow-sm border border-gray-100 text-xs lg:text-base">
                  No. Con Toogo tu tienda ya viene lista y configurada. No tienes que instalar nada, ni aprender herramientas complicadas. Solo entras y empiezas a vender.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-none">
                <AccordionTrigger className="bg-purple-600 text-white rounded-full px-6 lg:px-8 py-4 lg:py-5 font-semibold lg:font-bold text-left hover:no-underline hover:bg-purple-700 transition-colors [&>svg]:text-white text-xs lg:text-base">
                  ¿Puedo usar mi propio dominio?
                </AccordionTrigger>
                <AccordionContent className="bg-white text-gray-900 rounded-2xl lg:rounded-3xl p-4 lg:p-6 mt-3 shadow-sm border border-gray-100 text-xs lg:text-base">
                  Sí. Puedes empezar gratis con un subdominio de Toogo (ejemplo: mitienda.toogo.store) y, si lo deseas, conectar tu propio dominio personalizado en cualquier momento.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border-none">
                <AccordionTrigger className="bg-purple-600 text-white rounded-full px-6 lg:px-8 py-4 lg:py-5 font-semibold lg:font-bold text-left hover:no-underline hover:bg-purple-700 transition-colors [&>svg]:text-white text-xs lg:text-base">
                  ¿Qué incluye mi tienda al registrarme?
                </AccordionTrigger>
                <AccordionContent className="bg-white text-gray-900 rounded-2xl lg:rounded-3xl p-4 lg:p-6 mt-3 shadow-sm border border-gray-100 text-xs lg:text-base">
                  Tu tienda ya trae carrito de compras, catálogo de productos, pasarelas de pago integradas y un panel sencillo para gestionar pedidos y clientes. Todo listo desde el primer día.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border-none">
                <AccordionTrigger className="bg-purple-600 text-white rounded-full px-6 lg:px-8 py-4 lg:py-5 font-semibold lg:font-bold text-left hover:no-underline hover:bg-purple-700 transition-colors [&>svg]:text-white text-xs lg:text-base">
                  ¿Tengo que pagar algo para probar Toogo?
                </AccordionTrigger>
                <AccordionContent className="bg-white text-gray-900 rounded-2xl lg:rounded-3xl p-4 lg:p-6 mt-3 shadow-sm border border-gray-100 text-xs lg:text-base">
                  No. Puedes comenzar gratis y probar tu tienda sin costo. Cuando quieras agregar tu propio dominio o desbloquear funciones avanzadas, puedes elegir un plan de pago.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border-none">
                <AccordionTrigger className="bg-purple-600 text-white rounded-full px-6 lg:px-8 py-4 lg:py-5 font-semibold lg:font-bold text-left hover:no-underline hover:bg-purple-700 transition-colors [&>svg]:text-white text-xs lg:text-base">
                  ¿Cómo funciona el soporte si tengo dudas?
                </AccordionTrigger>
                <AccordionContent className="bg-white text-gray-900 rounded-2xl lg:rounded-3xl p-4 lg:p-6 mt-3 shadow-sm border border-gray-100 text-xs lg:text-base">
                  Contamos con soporte por chat y correo. Además, tendrás guías prácticas paso a paso para que puedas resolver todo fácilmente sin depender de terceros.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </section >

    {/* Footer */}
    < footer className="py-6 lg:py-16 px-4 lg:px-6" >
      <div className="max-w-[95%] lg:max-w-[80%] mx-auto">
        <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-12 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 lg:gap-8 mb-4 lg:mb-8">
            {/* Logo and description */}
            <div className="md:col-span-2 text-center md:text-left">
              <img src="/lovable-uploads/7a48d2dc-1797-4805-afe6-3c6f336c128d.png" alt="toogo logo" className="h-10 lg:h-12 w-auto mb-2 lg:mb-4 mx-auto md:mx-0" />
              <p className="text-gray-600 text-sm lg:text-base leading-tight px-[44px] py-[18px]">
                La plataforma más fácil<br className="hidden md:block" /> para crear tu tienda online
              </p>
            </div>

            {/* Soporte */}
            <div className="text-center md:text-left">
              <h3 className="font-semibold text-gray-900 mb-2 lg:mb-4 text-sm lg:text-base">Soporte</h3>
              <ul className="space-y-1 lg:space-y-3">
                <li>
                  <button
                    onClick={() => setIsContactModalOpen(true)}
                    className="text-gray-600 hover:text-gray-900 text-xs lg:text-sm cursor-pointer"
                  >
                    Contacto
                  </button>
                </li>
                <li><Link to="/blog" className="text-gray-600 hover:text-gray-900 text-xs lg:text-sm">Blog</Link></li>
                <li><Link to="/soporte" className="text-gray-600 hover:text-gray-900 text-xs lg:text-sm">Centro de ayuda</Link></li>
                <li><a href="https://www.reddit.com/r/toogostore/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 text-xs lg:text-sm">Comunidad</a></li>
                <li><a href="mailto:soporte@toogo.store" className="text-gray-600 hover:text-gray-900 text-xs lg:text-sm">soporte@toogo.store</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="text-center md:text-left">
              <h3 className="font-semibold text-gray-900 mb-2 lg:mb-4 text-sm lg:text-base">Legal</h3>
              <ul className="space-y-1 lg:space-y-3">
                <li><Link to="/terminos-condiciones" className="text-gray-600 hover:text-gray-900 text-xs lg:text-sm">Términos y Condiciones</Link></li>
                <li><Link to="/politica-privacidad" className="text-gray-600 hover:text-gray-900 text-xs lg:text-sm">Política de Privacidad</Link></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t pt-4 lg:pt-8">
            <p className="text-center text-gray-600 text-sm">
              © 2026 Toogo. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer >

    {/* Floating scroll to top button */}
    <button onClick={scrollToTop} className={`fixed bottom-4 left-4 md:bottom-6 md:left-6 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-110 z-50 ${showScrollButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`} aria-label="Subir al inicio">
      <ChevronUp className="w-6 h-6" />
    </button>

    {/* ChatBot with Mascot */}
    < ChatBotContainer />

    <OnboardingModal open={showOnboarding} onOpenChange={open => {
      setShowOnboarding(open);
      if (!open) setOnboardingFlowType(undefined);
    }} initialFlowType={onboardingFlowType} />

    <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>¿Necesitas ayuda?</DialogTitle>
          <DialogDescription>
            Envíanos un mensaje y te responderemos pronto
          </DialogDescription>
        </DialogHeader>
        <ContactSupportForm onSuccess={() => setIsContactModalOpen(false)} />
      </DialogContent>
    </Dialog>
  </div >;
};
export default Landing4;