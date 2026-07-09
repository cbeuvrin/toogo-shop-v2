import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { OnboardingModal } from "@/components/OnboardingModal";
import { ChatBotContainer } from "@/components/ChatBotContainer";
import { SEOHead } from "@/components/SEOHead";
import { Helmet } from "react-helmet-async";
import { usePlatformFacebookPixel } from "@/hooks/usePlatformFacebookPixel";
import "./LandingNueva.css";

const A = "/assets/l2";      // assets propios de esta landing
const T = "/assets/templates";      // svg de plantillas (compartidos)
const TPL = "/assets/l2/tpl";        // plantillas png → webp optimizado

const TEMPLATES = [
  { img: `${TPL}/atlantico.webp`, name: "Atlántico", tags: ["Versátil", "Clásico"] },
  { img: `${TPL}/pacifico.webp`, name: "Pacífico", tags: ["Deporte", "Dinámico", "Moderno"] },
  { img: `${TPL}/mediterraneo.webp`, name: "Mediterráneo", tags: ["Lujo", "Moda"] },
  { img: `${TPL}/adriatico.webp`, name: "Adriático", tags: ["Moda", "Editorial", "Moderno"] },
  { img: `${TPL}/indico.webp`, name: "Índico", tags: ["Moda", "Hero Foto", "Split Layout"] },
  { img: `${TPL}/caribe.webp`, name: "Caribe", tags: ["Moda", "Elegante", "Premium"] },
  { img: `${TPL}/nature.webp`, name: "Nature & Earth", tags: ["Ecológico", "Outdoor", "Limpio"] },
  { img: `${T}/premium_brand.svg`, name: "Premium Brand", tags: ["Premium", "Café", "Oscuro"] },
  { img: `${T}/bauhaus.svg`, name: "Bauhaus", tags: ["Editorial", "Arte", "Geométrico"] },
  { img: `${T}/cyber.svg`, name: "Cyber", tags: ["Tech", "Dark", "Neón"] },
];

const INTEGRATIONS = ["whatsapp", "mercadopago", "paypal", "instagram", "facebook", "meta", "googleanalytics", "googlegemini", "anthropic"];
const INT_NAMES: Record<string, string> = {
  whatsapp: "WhatsApp", mercadopago: "Mercado Pago", paypal: "PayPal", instagram: "Instagram",
  facebook: "Facebook", meta: "Meta", googleanalytics: "Google Analytics", googlegemini: "Gemini", anthropic: "Claude",
};

const FAQS = [
  ["¿Necesito saber de diseño o programación?", "No. Tu tienda ya viene lista y configurada. No instalas nada ni aprendes herramientas complicadas: entras y empiezas a vender."],
  ["¿Puedo usar mi propio dominio?", "Sí. Empiezas gratis con un subdominio (mitienda.toogo.store) y cuando quieras conectas tu dominio o compras uno nuevo directo en TOOGO."],
  ["¿Qué incluye mi tienda al registrarme?", "Carrito de compras, catálogo, pasarela de pago conectable desde el primer día y un panel sencillo para pedidos y clientes."],
  ["¿Tengo que pagar algo para probar?", "No. Comienzas gratis y sin tarjeta. Cuando quieras tu propio dominio o funciones avanzadas, eliges un plan de pago."],
  ["¿Cómo funciona el soporte?", "Chat y correo, más guías paso a paso para resolver todo sin depender de terceros."],
];

const LandingNueva = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingFlowType, setOnboardingFlowType] = useState<"subdomain" | "domain" | undefined>(undefined);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { trackPageView, trackLead } = usePlatformFacebookPixel();

  useEffect(() => { trackPageView('/', 'TOOGO - Landing'); }, []);

  const openOnboarding = (source: string, flow: "subdomain" | "domain" = "subdomain") => {
    trackLead('onboarding_started', { source });
    setOnboardingFlowType(flow);
    setShowOnboarding(true);
    setMobileOpen(false);
  };

  // Reveal + stagger al hacer scroll
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          if (e.target.classList.contains('stagger')) {
            setTimeout(() => e.target.classList.add('ready'), 1400);
          }
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    root.querySelectorAll('.reveal, .stagger').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Cerrar modal de video con Escape + reproducir
  useEffect(() => {
    if (videoOpen) {
      videoRef.current?.play().catch(() => {});
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setVideoOpen(false); };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    } else {
      videoRef.current?.pause();
    }
  }, [videoOpen]);

  const scrollCarousel = (dir: number) => carouselRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQS.map(([q, a]) => ({
      "@type": "Question",
      "name": q,
      "acceptedAnswer": { "@type": "Answer", "text": a },
    })),
  };

  return (
    <>
      <SEOHead />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <div className="l2root" ref={rootRef}>
        {/* HEADER */}
        <header className="site-header">
          <nav className="navbar">
            <a href="#" className="logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <img src={`${A}/mascot-chat.webp`} alt="" className="logo-toogi" />
              <img src={`${A}/toogo-wordmark.webp`} alt="Toogo" className="logo-img" />
            </a>
            <ul className="nav-links">
              <li><a href="#disenos">Diseños</a></li>
              <li><a href="#whatsapp">WhatsApp</a></li>
              <li><a href="#precios">Precios</a></li>
              <li><a href="#faq">Preguntas</a></li>
            </ul>
            <div className="nav-auth">
              <Link to="/auth" className="btn btn-ghost">Iniciar sesión</Link>
              <button className="btn btn-primary" onClick={() => openOnboarding('nav_button')}>Crear mi tienda</button>
            </div>
            <button className="nav-burger" aria-label="Abrir menú" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>
              <span></span><span></span><span></span>
            </button>
          </nav>
          {mobileOpen && (
            <div className="mobile-menu">
              <a href="#disenos" onClick={() => setMobileOpen(false)}>Diseños</a>
              <a href="#whatsapp" onClick={() => setMobileOpen(false)}>WhatsApp</a>
              <a href="#precios" onClick={() => setMobileOpen(false)}>Precios</a>
              <a href="#faq" onClick={() => setMobileOpen(false)}>Preguntas</a>
              <Link to="/auth" className="mobile-login">Iniciar sesión</Link>
            </div>
          )}
        </header>

        <main>
          {/* HERO */}
          <section className="hero">
            <div className="hero-content">
              <div className="hero-copy">
                <p className="hero-badge reveal hero-r1">0% de comisión de por vida — solo para las primeras tiendas</p>
                <h1 className="hero-title reveal hero-r1">Tu tienda en línea,<br />manejada desde <span className="text-wa">WhatsApp.</span></h1>
                <p className="hero-sub reveal hero-r2">Crea tu tienda gratis y contrólala con un mensaje de WhatsApp.</p>
                <div className="hero-ctas reveal hero-r3">
                  <button className="btn btn-primary btn-lg" onClick={() => openOnboarding('hero_button')}>Crear tienda gratis</button>
                  <button type="button" className="btn btn-outline btn-lg btn-video" onClick={() => setVideoOpen(true)}>
                    <span className="play-ico"></span> Ver video
                  </button>
                </div>
                <p className="hero-trust reveal hero-r3">Tu tienda queda lista en menos de 5 minutos · Sin tarjeta de crédito</p>
              </div>
              <div className="hero-visual reveal hero-rv" aria-hidden="true">
                <div className="hero-collage">
                  <div className="collage-col col-a">
                    {[`${TPL}/mediterraneo.webp`, `${TPL}/caribe.webp`, `${TPL}/nature.webp`].concat([`${TPL}/mediterraneo.webp`, `${TPL}/caribe.webp`, `${TPL}/nature.webp`]).map((s, i) => <img key={i} src={s} alt="" />)}
                  </div>
                  <div className="collage-col col-b">
                    {[`${TPL}/pacifico.webp`, `${TPL}/indico.webp`, `${TPL}/atlantico.webp`].concat([`${TPL}/pacifico.webp`, `${TPL}/indico.webp`, `${TPL}/atlantico.webp`]).map((s, i) => <img key={i} src={s} alt="" />)}
                  </div>
                  <div className="collage-col col-c">
                    {[`${TPL}/adriatico.webp`, `${TPL}/mediterraneo.webp`, `${TPL}/pacifico.webp`].concat([`${TPL}/adriatico.webp`, `${TPL}/mediterraneo.webp`, `${TPL}/pacifico.webp`]).map((s, i) => <img key={i} src={s} alt="" />)}
                  </div>
                </div>
                <div className="hero-phone-wrap">
                  <img src={`${A}/iphone-toogi.webp`} alt="Conversación de WhatsApp con el asistente Toogi" className="phone-img" />
                </div>
              </div>
            </div>
          </section>

          {/* INTEGRACIONES */}
          <section className="int-section">
            <div className="container">
              <p className="int-eyebrow reveal">SE CONECTA CON LAS HERRAMIENTAS QUE YA USAS</p>
              <div className="int-row stagger">
                {INTEGRATIONS.map((slug) => (
                  <div className="int-tile" key={slug}>
                    <img src={`https://cdn.simpleicons.org/${slug}/3f3f46`} alt={INT_NAMES[slug]} title={INT_NAMES[slug]} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* HERRAMIENTAS (3 cuadros) */}
          <section className="feat-section">
            <div className="container">
              <h2 className="section-title feat-heading reveal">Herramientas potentes,<br />desde el primer día.</h2>
              <div className="feat-grid">
                <article className="feat-card reveal">
                  <div className="feat-text">
                    <h3>Diseños que enamoran</h3>
                    <p>Elige el estilo que va con tu marca y cámbialo cuando quieras, con un solo click.</p>
                  </div>
                  <div className="feat-visual feat-templates">
                    <img src={`${TPL}/indico.webp`} alt="" className="ft-back" />
                    <img src={`${TPL}/mediterraneo.webp`} alt="" className="ft-front" />
                  </div>
                </article>
                <article className="feat-card reveal">
                  <div className="feat-text">
                    <h3>Fácil de verdad</h3>
                    <p>Sin complicaciones, sin sorpresas. Solo entra y empieza a vender.</p>
                  </div>
                  <div className="feat-visual feat-perks">
                    {["Tu tienda y tus pagos, protegidos", "Lista en menos de 5 minutos", "Sin saber programar", "Sin costos de mantenimiento", "Soporte cuando lo necesites"].map((t) => (
                      <div className="perk" key={t}><span className="perk-check"></span> {t}</div>
                    ))}
                  </div>
                </article>
                <article className="feat-card reveal">
                  <div className="feat-text">
                    <h3>Manéjala por WhatsApp</h3>
                    <p>Cambia precios, sube productos y consulta ventas con un mensaje. Sin abrir el panel.</p>
                  </div>
                  <div className="feat-visual feat-steps">
                    {["Registra tu número en tu perfil", "Confirma el código que te llega", "Escríbele a tu tienda y listo", "Tus mensajes van solo a tu tienda y viajan cifrados"].map((t, i) => (
                      <div className="step" key={i}><span className="step-num">{i + 1}</span> {t}</div>
                    ))}
                  </div>
                </article>
              </div>
            </div>
          </section>

          {/* DEMO Toogi brincando */}
          <section className="demo-section">
            <div className="container demo-inner">
              <div className="demo-card reveal">
                <img src={`${A}/toogi-brinca.webp`} alt="Mascota Toogi" className="demo-mascot" />
                <a href="https://volta.toogo.store" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">Mira tu próxima tienda</a>
              </div>
            </div>
          </section>

          {/* DISEÑOS / CARRUSEL */}
          <section className="templates-section" id="disenos">
            <div className="tpl-container">
              <div className="tpl-header reveal">
                <div className="tpl-header-left">
                  <h2 className="tpl-title">Cambia el diseño de tu tienda con un click</h2>
                  <p className="tpl-sub">Un estilo para cada marca, y seguimos sumando nuevos estilos.</p>
                </div>
                <div className="tpl-header-right">
                  <button className="btn btn-primary btn-lg" onClick={() => openOnboarding('templates_carousel')}>Crea tu tienda y pruébalos</button>
                </div>
              </div>
              <div className="carousel-wrap">
                <button className="carousel-arrow left" aria-label="Anterior" onClick={() => scrollCarousel(-1)}>←</button>
                <button className="carousel-arrow right" aria-label="Siguiente" onClick={() => scrollCarousel(1)}>→</button>
                <div className="carousel" tabIndex={0} ref={carouselRef}>
                  {TEMPLATES.map((t) => (
                    <div className="tpl-card" key={t.name}>
                      <div className="tpl-thumb"><img src={t.img} alt={`Plantilla ${t.name}`} loading="lazy" /></div>
                      <div className="tpl-body">
                        <h3>{t.name}</h3>
                        <div className="tpl-tags">{t.tags.map((tag) => <span className="tpl-tag" key={tag}>{tag}</span>)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* TOOGI STATEMENT */}
          <section className="toogi-section">
            <div className="container toogi-inner">
              <div className="toogi-chip reveal">
                <span className="toogi-avatar"><img src={`${A}/mascot-chat.webp`} alt="Toogi" /></span>
                <span>Hola, soy tu asistente Toogi</span>
              </div>
              <p className="toogi-statement reveal">Pídeme cambiar precios, subir productos o crear tu banner y lo hago al instante. Olvídate de contratar programadores o pagar mantenimiento: tú vendes y yo me encargo del resto de tu tienda.</p>
            </div>
          </section>

          {/* WHATSAPP */}
          <section className="wa-section" id="whatsapp">
            <div className="container wa-grid">
              <div className="wa-chat reveal" aria-hidden="true">
                <div className="wa-bubble wa-out">Cambia el precio de las velas de soya a $150</div>
                <div className="wa-bubble wa-in">Listo. Velas de soya ahora cuesta $150 en tu tienda.</div>
                <div className="wa-bubble wa-out">Genera un banner para la promo de diciembre</div>
                <div className="wa-bubble wa-in wa-img">
                  <img src={`${A}/ia-banner.webp`} alt="" />
                  <span>Aquí lo tienes. ¿Lo subo a la tienda?</span>
                </div>
              </div>
              <div className="wa-copy reveal">
                <h2 className="section-title reveal">Maneja tu tienda<br /><span className="text-wa">por WhatsApp</span></h2>
                <ul className="wa-list">
                  <li>Cambia precios y stock con un mensaje</li>
                  <li>Sube productos enviando una foto</li>
                  <li>Genera imágenes y banners con IA</li>
                  <li>Pregunta cuánto vendiste hoy</li>
                </ul>
                <button className="btn btn-wa btn-lg" onClick={() => openOnboarding('whatsapp_section')}>Crear mi tienda</button>
              </div>
            </div>
          </section>

          {/* PRECIOS */}
          <section className="pricing-section" id="precios">
            <div className="container">
              <div className="section-head reveal">
                <h2 className="section-title reveal">Empieza gratis. En serio.</h2>
                <p className="section-sub reveal">Menos que una comida a la semana. Sin programadores, sin comisiones y 0% por venta en todos los planes.</p>
              </div>
              <div className="pricing-grid">
                <article className="price-card reveal">
                  <h3>Gratis</h3>
                  <p className="price"><span>$0</span> MXN · para siempre</p>
                  <p className="plan-tag">Perfecto para empezar a vender hoy</p>
                  <ul>
                    <li>Tienda con subdominio .toogo.store</li>
                    <li>Hasta 20 productos</li>
                    <li>Todos los diseños premium</li>
                    <li>Carrito y checkout listos</li>
                    <li>Bot de WhatsApp para editar tu tienda</li>
                    <li>Conecta Mercado Pago o PayPal</li>
                    <li>Toogi, tu asistente con IA para tu tienda</li>
                    <li>Panel de pedidos y clientes</li>
                    <li>0% de comisión por venta</li>
                  </ul>
                  <button className="btn btn-outline" onClick={() => openOnboarding('pricing_free', 'subdomain')}>Empezar gratis</button>
                </article>
                <article className="price-card price-featured reveal">
                  <p className="badge">Más popular</p>
                  <h3>Basic</h3>
                  <p className="price"><span>$299</span> MXN · al mes</p>
                  <p className="plan-tag">Todo lo de Gratis, y además:</p>
                  <ul>
                    <li>Dominio propio (conéctalo o cómpralo aquí)</li>
                    <li>Productos ilimitados</li>
                    <li>Tu marca sin sello TOOGO</li>
                    <li>Tu logo como ícono de la tienda</li>
                    <li>Estadísticas y analytics avanzados</li>
                    <li>Google Analytics y Meta Pixel</li>
                    <li>Soporte prioritario</li>
                  </ul>
                  <button className="btn btn-primary" onClick={() => openOnboarding('pricing_basic', 'domain')}>Empezar con Basic</button>
                </article>
              </div>
              <p className="pricing-foot reveal">¿Dudas? Empieza gratis y cambia de plan cuando quieras. Sin permanencia.</p>
            </div>
          </section>

          {/* TESTIMONIOS */}
          <section className="quotes-section">
            <div className="container quotes-grid">
              <blockquote className="reveal"><p>"En 2 días ya tenía mi tienda funcionando y vendiendo."</p><footer>María González <span>Boutique Luna</span></footer></blockquote>
              <blockquote className="reveal"><p>"La integración con WhatsApp es perfecta. Mis clientes compran sin complicaciones."</p><footer>Carlos Ruiz <span>TechStore MX</span></footer></blockquote>
              <blockquote className="reveal"><p>"En una tarde mi negocio estaba online. Así de fácil."</p><footer>Ana Pérez <span>Delicias Caseras</span></footer></blockquote>
            </div>
          </section>

          {/* FAQ */}
          <section className="faq-section" id="faq">
            <div className="container faq-grid">
              <div className="faq-head reveal">
                <h2 className="section-title reveal">Preguntas frecuentes</h2>
                <img src={`${A}/mascota.webp`} alt="Mascota de TOOGO" className="faq-mascot" />
              </div>
              <div className="faq-list reveal">
                {FAQS.map(([q, a]) => (
                  <details key={q}><summary>{q}</summary><p>{a}</p></details>
                ))}
              </div>
            </div>
          </section>

          {/* CTA FINAL */}
          <section className="final-cta">
            <div className="cta-marquee" aria-hidden="true"><img src={`${A}/toogo-wordmark.webp`} alt="" className="cta-logo" /></div>
            <div className="cta-content reveal">
              <button className="btn btn-primary btn-lg" onClick={() => openOnboarding('final_cta')}>Crear tienda gratis →</button>
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="site-footer">
          <div className="container footer-grid">
            <div className="footer-brand">
              <img src={`${A}/toogo-wordmark.webp`} alt="Toogo" className="footer-logo" />
              <p>La plataforma más fácil para crear tu tienda online.</p>
            </div>
            <nav className="footer-col">
              <h4>Soporte</h4>
              <Link to="/blog">Blog</Link>
              <Link to="/soporte">Centro de ayuda</Link>
              <a href="mailto:soporte@toogo.store">soporte@toogo.store</a>
            </nav>
            <nav className="footer-col">
              <h4>Legal</h4>
              <Link to="/terminos-condiciones">Términos y condiciones</Link>
              <Link to="/politica-privacidad">Política de privacidad</Link>
            </nav>
          </div>
          <p className="footer-copy">© 2026 Toogo. Todos los derechos reservados.</p>
        </footer>

        {/* MODAL DE VIDEO */}
        {videoOpen && (
          <div className="video-modal">
            <div className="video-modal-backdrop" onClick={() => setVideoOpen(false)}></div>
            <div className="video-modal-box">
              <button className="video-modal-close" aria-label="Cerrar" onClick={() => setVideoOpen(false)}>&times;</button>
              <video ref={videoRef} controls playsInline>
                <source src="/VIDEOS/landing-video.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        )}
      </div>

      <ChatBotContainer />
      <OnboardingModal
        open={showOnboarding}
        onOpenChange={(open) => { setShowOnboarding(open); if (!open) setOnboardingFlowType(undefined); }}
        initialFlowType={onboardingFlowType}
      />
    </>
  );
};

export default LandingNueva;
