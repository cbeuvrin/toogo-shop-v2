import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const PoliticaPrivacidad = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/assets/toogo-logo.png" alt="Toogo Logo" className="h-8" />
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-center">Aviso de Privacidad Integral</h1>
        <p className="text-center text-muted-foreground mb-12">
          Keting Media, S.A. de C.V. (www.toogo.store)
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground leading-relaxed">
            Keting Media, S.A. de C.V. (en lo sucesivo, "EL RESPONSABLE"), con domicilio en Ave. Álvaro Obregón 179, Int. 10, Colonia Roma Norte, Alcaldía Cuauhtémoc, CDMX, C.P. 03700, es responsable del uso y protección de los Datos Personales que recaba a través del sitio web https://www.toogo.store/, en cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
          </p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1) Finalidades del tratamiento</h2>
            <p className="text-muted-foreground leading-relaxed">
              Los datos personales que recabamos se utilizarán para las siguientes finalidades:
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">Primarias:</h3>
            <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-2">
              <li>Crear y administrar cuentas de usuario y tiendas virtuales</li>
              <li>Procesar pagos, emitir facturas (si aplica) y gestionar cobros</li>
              <li>Brindar soporte técnico, atención y seguimiento a usuarios</li>
              <li>Cumplir obligaciones legales y contractuales derivadas del uso del sitio</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">Secundarias:</h3>
            <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-2">
              <li>Enviar promociones, boletines informativos o encuestas de satisfacción</li>
              <li>Comunicar actualizaciones de servicios o mejoras del sitio</li>
            </ul>

            <p className="text-muted-foreground leading-relaxed mt-4">
              El Titular podrá oponerse a las finalidades secundarias mediante solicitud escrita a los medios indicados en este Aviso.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2) Datos personales que se recaban</h2>
            <p className="text-muted-foreground leading-relaxed">
              Datos de identificación, contacto, domicilio, datos fiscales, información comercial, medios de pago y cualquier otro necesario para la operación y administración de las cuentas o tiendas virtuales.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3) Derechos ARCO</h2>
            <p className="text-muted-foreground leading-relaxed">
              El Titular podrá ejercer sus derechos de acceso, rectificación, cancelación y oposición (ARCO), así como revocar su consentimiento, mediante solicitud enviada a: <strong>e.arcaya@ketingmedia.com</strong>
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              La solicitud deberá incluir:
            </p>
            <ul className="list-disc list-inside text-muted-foreground ml-4 mt-2 space-y-2">
              <li>Nombre completo y documento de identidad</li>
              <li>Descripción precisa de los datos personales sobre los cuales se pretende ejercer un derecho</li>
              <li>Especificación del derecho que desea ejercer</li>
              <li>Medio de comunicación para notificaciones</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              El área responsable atenderá las solicitudes dentro de los plazos establecidos en la LFPDPPP (20 días para respuesta y 15 días adicionales para ejecución, prorrogables una sola vez).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4) Área responsable de datos personales</h2>
            <p className="text-muted-foreground leading-relaxed">
              El área responsable de atender solicitudes relacionadas con el tratamiento de datos personales es el "Área de Datos Personales" de Keting Media, S.A. de C.V., contacto: <strong>e.arcaya@ketingmedia.com</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5) Revocación del consentimiento</h2>
            <p className="text-muted-foreground leading-relaxed">
              El Titular podrá revocar su consentimiento para el uso de sus datos personales enviando solicitud al correo antes indicado, señalando nombre, documento de identidad, motivo de revocación y medio de respuesta.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6) Transferencias de datos personales</h2>
            <p className="text-muted-foreground leading-relaxed">
              No se realizarán transferencias de datos personales a terceros, salvo las legalmente exigidas por autoridades competentes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7) Uso de cookies y tecnologías similares</h2>
            <p className="text-muted-foreground leading-relaxed">
              El sitio puede utilizar cookies y tecnologías similares para mejorar la experiencia del usuario, medir estadísticas y optimizar el funcionamiento. El usuario puede desactivar las cookies desde la configuración de su navegador.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8) Modificaciones al Aviso de Privacidad</h2>
            <p className="text-muted-foreground leading-relaxed">
              Keting Media, S.A. de C.V. podrá modificar el presente Aviso de Privacidad conforme a cambios legales, internos o tecnológicos. Las versiones actualizadas estarán disponibles en https://www.toogo.store/
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9) Autoridad competente</h2>
            <p className="text-muted-foreground leading-relaxed">
              Si el Titular considera que su derecho a la protección de datos personales ha sido vulnerado, podrá acudir ante el Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI), en <a href="https://www.inai.org.mx" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.inai.org.mx</a>.
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-12 text-center">
            Última actualización: octubre de 2025
          </p>
        </div>

        <div className="mt-12 flex justify-center">
          <Button onClick={scrollToTop} variant="outline" className="gap-2">
            <ArrowUp className="h-4 w-4" />
            Volver al inicio
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Toogo. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default PoliticaPrivacidad;
