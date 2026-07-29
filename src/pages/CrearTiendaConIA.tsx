import { useState } from "react";
import { Link } from "react-router-dom";
import { OnboardingModal } from "@/components/OnboardingModal";
import { ChatBotContainer } from "@/components/ChatBotContainer";
import { SEOHead } from "@/components/SEOHead";
import { usePlatformFacebookPixel } from "@/hooks/usePlatformFacebookPixel";

const PURPLE = "#8346C1";

const steps = [
  {
    n: "1",
    t: "Manda una foto por WhatsApp",
    d: "Le envías a la IA una foto de tu producto y su precio. Nada de formularios ni panel complicado.",
  },
  {
    n: "2",
    t: "La IA arma tu tienda",
    d: "La inteligencia artificial publica el producto, le escribe una descripción y lo acomoda en tu catálogo por ti.",
  },
  {
    n: "3",
    t: "Vende y administra por chat",
    d: "Recibes pedidos, revisas tus ventas del día y cambias el diseño de tu tienda — todo conversando por WhatsApp.",
  },
];

const features = [
  { t: "Gratis y sin programar", d: "Crea tu tienda en línea gratis en minutos. Sin código, sin mensualidad para empezar." },
  { t: "Catálogo hecho por IA", d: "La IA describe tus productos y organiza tu catálogo a partir de una simple foto." },
  { t: "La manejas por WhatsApp", d: "Administra toda tu tienda desde el chat que ya usas todos los días, sin abrir la computadora." },
  { t: "Cobros y dominio propio", d: "Acepta Mercado Pago, PayPal, OXXO y SPEI, y conecta tu propio dominio. Hecho para México." },
];

const CrearTiendaConIA = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingFlowType, setOnboardingFlowType] = useState<"subdomain" | "domain" | undefined>(undefined);
  const { trackLead } = usePlatformFacebookPixel();

  const openOnboarding = (source: string) => {
    trackLead("onboarding_started", { source });
    setOnboardingFlowType("subdomain");
    setShowOnboarding(true);
  };

  return (
    <>
      <SEOHead
        title="Crear tu tienda online con inteligencia artificial gratis | TOOGO"
        description="Crea tu tienda en línea gratis con ayuda de inteligencia artificial y adminístrala desde WhatsApp: mandas una foto y la IA arma tu catálogo. Hecho para México."
      />

      <div className="min-h-screen bg-white text-[#1a1030]">
        {/* Nav */}
        <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <Link to="/" className="flex items-center gap-2 font-black text-xl" style={{ color: PURPLE }}>
            <img src="/assets/mascot-toogo.png" alt="TOOGO" className="h-8 w-8 object-contain" />
            TOOGO
          </Link>
          <button
            onClick={() => openOnboarding("nav")}
            className="rounded-full px-5 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: PURPLE }}
          >
            Crear mi tienda
          </button>
        </header>

        {/* Hero */}
        <section className="px-6 pt-10 pb-16 max-w-3xl mx-auto text-center">
          <span
            className="inline-block rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider mb-6"
            style={{ backgroundColor: "#F3EDFB", color: PURPLE }}
          >
            Tienda en línea con IA
          </span>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
            Crea tu tienda online con <span style={{ color: PURPLE }}>inteligencia artificial</span>. Gratis.
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Con TOOGO le mandas una foto de tu producto a la IA por WhatsApp y ella arma tu tienda por ti.
            Sin programar, sin mensualidad para empezar. Hecho para México.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => openOnboarding("hero")}
              className="rounded-full px-8 py-4 text-base font-bold text-white shadow-lg"
              style={{ backgroundColor: PURPLE }}
            >
              Crear mi tienda gratis →
            </button>
            <Link
              to="/"
              className="rounded-full px-8 py-4 text-base font-bold border-2"
              style={{ borderColor: PURPLE, color: PURPLE }}
            >
              Ver cómo funciona
            </Link>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="px-6 py-16" style={{ backgroundColor: "#FAF7FE" }}>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-center mb-12">Tu tienda, en 3 pasos por WhatsApp</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((s) => (
                <div key={s.n} className="text-center">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white mx-auto mb-5"
                    style={{ backgroundColor: PURPLE }}
                  >
                    {s.n}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{s.t}</h3>
                  <p className="text-gray-600">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-16 max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12">Por qué crear tu tienda con IA en TOOGO</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((f) => (
              <div key={f.t} className="rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-2" style={{ color: PURPLE }}>{f.t}</h3>
                <p className="text-gray-600">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="px-6 py-20 text-center text-white" style={{ backgroundColor: PURPLE }}>
          <div className="max-w-2xl mx-auto">
            <img src="/assets/mascot-toogo.png" alt="TOOGO" className="h-20 w-20 object-contain mx-auto mb-6" />
            <h2 className="text-3xl md:text-5xl font-black mb-4">Empieza gratis hoy</h2>
            <p className="text-lg mb-8 text-white/90">
              Deja que la inteligencia artificial arme tu tienda mientras tú te dedicas a vender.
            </p>
            <button
              onClick={() => openOnboarding("final_cta")}
              className="rounded-full px-10 py-4 text-lg font-bold bg-white"
              style={{ color: PURPLE }}
            >
              Crear mi tienda gratis →
            </button>
          </div>
        </section>

        <footer className="px-6 py-10 text-center text-sm text-gray-500">
          <p>TOOGO — Crea tu tienda en línea gratis y manéjala desde WhatsApp. Hecho para México.</p>
          <div className="mt-3 flex gap-4 justify-center">
            <Link to="/" className="hover:underline">Inicio</Link>
            <Link to="/blog" className="hover:underline">Blog</Link>
          </div>
        </footer>
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

export default CrearTiendaConIA;
