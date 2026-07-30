import './LandingV5.css';
import React, { useRef, useState, useEffect } from 'react';
import { OnboardingModal } from '@/components/OnboardingModal';

const A = 'https://cdn.toogo.store/assets';
const TPL = 'https://cdn.toogo.store/templates';

const INTEGRATIONS = ['mercadopago', 'stripe', 'whatsapp', 'instagram', 'telegram'];
const INT_NAMES: Record<string, string> = { mercadopago: 'Mercado Pago', stripe: 'Stripe', whatsapp: 'WhatsApp', instagram: 'Instagram', telegram: 'Telegram' };

export default function LandingV5() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [floatingCTA, setFloatingCTA] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => setFloatingCTA(!entry.isIntersecting), { threshold: 0 });
    if (heroRef.current) io.observe(heroRef.current);
    return () => io.disconnect();
  }, []);

  const openOnboarding = () => setShowOnboarding(true);

  return (
    <div className="l2root landing-v5">
      {floatingCTA && (
        <div className="floating-cta">
          <button className="btn btn-primary btn-sm" onClick={openOnboarding}>Crear tienda gratis →</button>
        </div>
      )}

      <main>
        {/* HERO: PROBLEMA */}
        <section className="hero v5-problem" ref={heroRef}>
          <div className="container">
            <div className="hero-inner">
              <div className="hero-text">
                <p className="hero-eyebrow">¿Te suena familiar?</p>
                <h1 className="hero-title">
                  Tienes algo que vender<br />
                  pero tu tienda online<br />
                  <span className="highlight">no existe, cuesta mucho, o es un lío</span>
                </h1>
                <p className="hero-desc">
                  Shopify es caro. Tiendanube no la usas. Un desarrollador cuesta una fortuna.
                  <br />Y mientras, dejas dinero sobre la mesa.
                </p>
              </div>
              <div className="hero-visual v5-problem-visual">
                <img src={`${A}/mascota.webp`} alt="Toogi" className="mascot worried" />
              </div>
            </div>
          </div>
        </section>

        {/* SOLUCIÓN CLARA */}
        <section className="solution v5-section">
          <div className="container">
            <div className="solution-header">
              <h2>La solución: tienda gratis, donde ya estás</h2>
              <p className="solution-sub">TOOGO es una tienda online que no vive en un panel complicado.<br />Vive en WhatsApp, donde YA pasas horas.</p>
            </div>

            <div className="solution-grid">
              <div className="solution-card">
                <div className="card-number">1</div>
                <h3>Creas la tienda en 2 minutos</h3>
                <p>Nombre, descripción, fotos. Listo. Sin formularios interminables. Sin decisiones abrumadoras.</p>
              </div>

              <div className="solution-card">
                <div className="card-number">2</div>
                <h3>La administras por WhatsApp</h3>
                <p>Subes productos, cambias precios, ves órdenes. Con un mensaje. Sin abrir panel. Sin clickear 10 veces.</p>
              </div>

              <div className="solution-card">
                <div className="card-number">3</div>
                <h3>Tus clientes ven una tienda hermosa</h3>
                <p>Elige un diseño (o déjalos todos). Ellos compran online, pagan ya. Tú ves la orden en WhatsApp.</p>
              </div>
            </div>

            <div className="solution-visual">
              <img src={`${A}/iphone-toogi.webp`} alt="WhatsApp + tienda" className="phone-demo" />
            </div>
          </div>
        </section>

        {/* POR QUÉ FUNCIONA */}
        <section className="why-works v5-section">
          <div className="container">
            <h2>Por qué esto funciona (y otras plataformas no)</h2>
            <div className="comparison-table">
              <div className="comp-row header">
                <div>Toogo</div>
                <div>Shopify</div>
                <div>Tu tienda propia</div>
              </div>
              <div className="comp-row">
                <div><strong>Costo</strong></div>
                <div>Gratis</div>
                <div>$29-299/mes</div>
                <div>Gratuita → $5-50k</div>
              </div>
              <div className="comp-row">
                <div><strong>Tiempo de setup</strong></div>
                <div>2 minutos</div>
                <div>Horas</div>
                <div>Semanas/meses</div>
              </div>
              <div className="comp-row">
                <div><strong>Administración</strong></div>
                <div>WhatsApp (lo usas ya)</div>
                <div>Panel web</div>
                <div>Panel web complicado</div>
              </div>
              <div className="comp-row">
                <div><strong>Pagos</strong></div>
                <div>Ya integrado</div>
                <div>Configurar plugins</div>
                <div>Integración manual</div>
              </div>
            </div>
          </div>
        </section>

        {/* LO QUE OBTIENES */}
        <section className="features v5-section">
          <div className="container">
            <h2>Tu tienda incluye todo esto</h2>
            <div className="features-grid">
              {[
                { icon: '🛍️', title: 'Catálogo ilimitado', desc: 'Sube los productos que quieras. Sin límite de items.' },
                { icon: '💳', title: 'Pagos integrados', desc: 'Mercado Pago, Stripe, Clip. Recibe el dinero ya.' },
                { icon: '📱', title: 'Móvil-first', desc: 'Tu tienda se ve perfecta en cualquier teléfono.' },
                { icon: '🎨', title: '6 diseños', desc: 'Elige el que va con tu marca. Cámbialo cuando quieras.' },
                { icon: '🤖', title: 'Asistente de IA', desc: 'Genera descripciones y banners. Sin saber escribir.' },
                { icon: '🔐', title: 'Seguro y rápido', desc: 'Tus datos protegidos. Tu tienda carga en 1 segundo.' },
              ].map((f, i) => (
                <div className="feature-item" key={i}>
                  <div className="feature-icon">{f.icon}</div>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DEMO EN VIVO */}
        <section className="demo v5-section">
          <div className="container">
            <div className="demo-card">
              <div className="demo-text">
                <h2>¿No me crees? Mira una tienda de verdad</h2>
                <p>Esta es una tienda REAL hecha con TOOGO en 5 minutos. Ves el menú, clickeas, compras.</p>
                <a href="https://volta.toogo.store" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
                  Visitar tienda de ejemplo →
                </a>
              </div>
              <div className="demo-visual">
                <img src={`${A}/mascota.webp`} alt="Toogi feliz" className="mascot happy" />
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL CLARA */}
        <section className="final-push v5-section">
          <div className="container">
            <div className="push-card">
              <h2>¿Listo para vender online sin complicaciones?</h2>
              <div className="push-details">
                <p>✓ Gratis para siempre</p>
                <p>✓ Sin tarjeta de crédito</p>
                <p>✓ Tienda lista en 2 minutos</p>
                <p>✓ Cancela cuando quieras (pero no querrás)</p>
              </div>
              <button className="btn btn-primary btn-lg btn-huge" onClick={openOnboarding}>
                Crea tu tienda ahora →
              </button>
              <p className="push-sub">Primeras 100 tiendas: plan PREMIUM gratis 1 año</p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="v5-footer">
          <div className="container">
            <p>© 2026 TOOGO. Hecho para vendedores reales. <a href="/terminos-condiciones">Términos</a> · <a href="/politica-privacidad">Privacidad</a></p>
          </div>
        </footer>
      </main>

      <OnboardingModal open={showOnboarding} onOpenChange={setShowOnboarding} />
    </div>
  );
}
