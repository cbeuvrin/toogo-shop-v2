import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const TerminosCondiciones = () => {
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
        <h1 className="text-4xl font-bold mb-2 text-center">TÉRMINOS Y CONDICIONES DE USO</h1>
        <h2 className="text-2xl font-semibold mb-1 text-center">Keting Media, S.A. de C.V.</h2>
        <p className="text-lg text-center mb-2">(www.toogo.store)</p>
        <p className="text-center text-muted-foreground mb-12">
          Para su plataforma digital https://www.toogo.store/
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1) Objeto y aceptación de los términos</h2>
            <p className="text-muted-foreground leading-relaxed">
              El presente documento establece los Términos y Condiciones de Uso (en adelante, los "Términos") que regulan el acceso y uso del sitio web y la plataforma digital, https://www.toogo.store/, operada por Keting Media, S.A. de C.V. (en adelante, la "Plataforma"), mediante la cual los usuarios pueden ofrecer, vender, adquirir o promocionar productos y servicios de terceros.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Al registrarse, navegar o utilizar la Plataforma, el usuario (el "Usuario") declara que ha leído, comprendido y aceptado en su totalidad estos Términos. La aceptación se realiza mediante el clic correspondiente ("He leído y acepto los Términos y Condiciones") y tiene la misma validez jurídica que una firma autógrafa conforme a los artículos 1803 y 1834 Bis del Código Civil Federal y los artículos 89 al 94 del Código de Comercio.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              El uso de la Plataforma implica la aceptación plena y sin reservas de los presentes Términos. Si el Usuario no está de acuerdo, deberá abstenerse de utilizar el sitio o crear una cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2) Registro y cuentas de usuario</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para acceder a determinadas funciones, el Usuario deberá crear una cuenta y proporcionar información veraz, completa y actualizada. El Usuario es responsable de mantener la confidencialidad de su contraseña y de todas las actividades que ocurran bajo su cuenta.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Solo podrán registrarse personas mayores de 18 años con capacidad jurídica para contratar conforme a las leyes mexicanas. La Plataforma podrá suspender o cancelar cuentas en caso de detectar información falsa, uso indebido o incumplimiento de los Términos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3) Funcionamiento de la Plataforma</h2>
            <p className="text-muted-foreground leading-relaxed">
              Keting Media, S.A. de C.V. actúa exclusivamente como un intermediario tecnológico que permite a los Usuarios interactuar, publicar y comercializar productos o servicios. Los Vendedores son los únicos responsables de los productos o servicios que ofrecen, de su contenido, precios, promociones, disponibilidad y cumplimiento legal.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Las transacciones pueden realizarse:
            </p>
            <ul className="list-disc list-inside text-muted-foreground ml-4 mt-2 space-y-2">
              <li>A través de pasarelas de pago integradas en la Plataforma, o</li>
              <li>De manera directa entre comprador y vendedor, por contacto externo.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              En ambos casos, Keting Media, S.A. de C.V. no es parte de la compraventa ni asume responsabilidad por el cumplimiento de las obligaciones de las partes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4) Responsabilidad del Vendedor</h2>
            <p className="text-muted-foreground leading-relaxed">
              Los Vendedores se obligan a cumplir con la legislación mexicana aplicable, incluyendo la Ley Federal de Protección al Consumidor, la Ley Federal del Derecho de Autor, la Ley de la Propiedad Industrial y toda la normativa legal aplicable vigente.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              El Vendedor mantendrá en paz y a salvo a Keting Media, S.A. de C.V., sus socios, empleados y afiliadas, frente a cualquier reclamación, multa o demanda derivada del contenido o productos publicados, así como de cualquier incumplimiento legal o contractual.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5) Responsabilidad de la Plataforma</h2>
            <p className="text-muted-foreground leading-relaxed">
              La Plataforma no garantiza la disponibilidad, calidad, licitud, veracidad ni entrega de los productos o servicios ofrecidos por los Vendedores.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Keting Media, S.A. de C.V. no será responsable por daños, perjuicios o pérdidas derivados del uso o imposibilidad de uso del sitio, actos u omisiones de los Vendedores o Compradores, o contenido publicado por terceros.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              La Plataforma podrá suspender, eliminar o restringir cualquier cuenta o contenido a su entera discreción, sin previo aviso y sin responsabilidad alguna, si considera que infringe estos Términos o la ley aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6) Pagos, comisiones y facturación</h2>
            <p className="text-muted-foreground leading-relaxed">
              En caso de que la Plataforma cobre comisiones o tarifas por el uso de sus servicios, dichos cargos serán informados al Usuario antes de efectuarse el pago.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Las operaciones realizadas a través de pasarelas de pago estarán sujetas a las políticas de dichas plataformas. Cuando la transacción se realice directamente entre comprador y vendedor, Keting Media, S.A. de C.V. no tendrá participación ni control sobre los pagos, entregas o reembolsos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7) Devoluciones, reembolsos y cancelaciones</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cada Vendedor es responsable de establecer y comunicar su propia política de devoluciones y reembolsos. Keting Media, S.A. de C.V. no interviene en disputas entre comprador y vendedor, aunque podrá ofrecer asistencia o mediar de buena fe, sin asumir obligación alguna.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8) Propiedad intelectual e industrial</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo el contenido propio de la Plataforma, incluyendo software, código, diseño, logotipos, textos, gráficos e interfaces, es propiedad exclusiva de Keting Media, S.A. de C.V. o de sus licenciantes, protegido por la Ley Federal del Derecho de Autor. El Usuario recibe una licencia limitada, no exclusiva y revocable para acceder y usar la Plataforma conforme a estos Términos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9) Datos personales y privacidad</h2>
            <p className="text-muted-foreground leading-relaxed">
              El tratamiento de los datos personales se realizará conforme al Aviso de Privacidad disponible en el sitio web. El Usuario autoriza el uso de sus datos para fines de identificación, funcionamiento, seguridad y cumplimiento legal, en términos de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10) Suspensión y terminación de cuentas</h2>
            <p className="text-muted-foreground leading-relaxed">
              La Plataforma podrá suspender temporal o definitivamente las cuentas de los Usuarios que infrinjan estos Términos, publiquen contenido ilícito o inadecuado, incurran en actividades fraudulentas o afecten la reputación o seguridad del sitio. Dicha suspensión podrá realizarse sin previo aviso y sin responsabilidad alguna para Keting Media, S.A. de C.V.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11) Exoneración y liberación de responsabilidad</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Los Usuarios aceptan que Keting Media, S.A. de C.V. actúa como intermediario tecnológico y no asume responsabilidad por el contenido o productos publicados por terceros. En cualquier caso, los Vendedores se obligan a indemnizar y sacar en paz y a salvo a Keting Media, S.A. de C.V., sus socios y empleados frente a cualquier reclamación, perjuicio o daño derivado de su actividad en la Plataforma.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              En consecuencia, la Plataforma no es propietaria, fabricante, distribuidora, revendedora, ni garante de los productos o servicios publicados por los Vendedores, ni asume responsabilidad alguna respecto de su calidad, veracidad, licitud, características, condiciones de entrega, precios o disponibilidad.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Los Vendedores son los únicos responsables del contenido, información, imágenes, descripciones, precios y cualquier otro dato o material que publiquen en la Plataforma, así como de cumplir con todas las disposiciones legales aplicables, incluyendo las relativas a propiedad intelectual, protección al consumidor, competencia económica, publicidad, protección de datos personales, sanidad, seguridad de los productos, comercio electrónico y demás normatividad vigente.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              En caso de que cualquier producto, servicio o contenido publicado por un Vendedor infrinja derechos de terceros o contravenga la legislación aplicable, la Plataforma podrá, a su entera discreción y sin necesidad de previo aviso, suspender, eliminar o restringir el acceso del Vendedor, la publicación correspondiente o su cuenta, sin que ello genere derecho alguno de indemnización, reembolso o reclamación a favor del Vendedor.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Asimismo, los Vendedores se obligan expresamente a mantener en paz y a salvo a Keting Media, S.A. de C.V., sus accionistas, directivos, empleados y afiliadas, de cualquier demanda, queja, acción, sanción o reclamación derivada directa o indirectamente del uso de la Plataforma o de la venta de sus productos o servicios, incluyendo los honorarios legales y gastos que se deriven de la defensa correspondiente.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              La Plataforma no asume responsabilidad alguna por daños directos, indirectos o perjuicios que pudieran derivarse del uso del sitio, del contenido publicado por los Vendedores o de la relación entre éstos y los compradores.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12) Modificaciones</h2>
            <p className="text-muted-foreground leading-relaxed">
              Keting Media, S.A. de C.V. podrá modificar en cualquier momento estos Términos, publicando la versión actualizada en el sitio web. Las modificaciones entrarán en vigor desde su publicación. El uso continuado de la Plataforma implica la aceptación de los cambios.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13) Contacto</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para cualquier duda o solicitud, el Usuario podrá comunicarse con el equipo de Keting Media, S.A. de C.V. a través del correo electrónico:{" "}
              <a href="mailto:e.arcaya@ketingmedia.com" className="text-primary hover:underline">
                e.arcaya@ketingmedia.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14) Jurisdicción y ley aplicable</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estos Términos se rigen por las leyes federales de los Estados Unidos Mexicanos, y para toda controversia derivada de su interpretación o cumplimiento, las partes se someten a la jurisdicción de los tribunales competentes de la Ciudad de México.
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-12 text-center font-semibold">
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

export default TerminosCondiciones;
