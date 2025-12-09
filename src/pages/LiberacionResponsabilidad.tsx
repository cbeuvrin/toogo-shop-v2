import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const LiberacionResponsabilidad = () => {
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
        <h1 className="text-4xl font-bold mb-8 text-center">Liberación de Responsabilidad</h1>
        <p className="text-center text-muted-foreground mb-12">
          Keting Media, S.A. de C.V. (www.toogo.store)<br />
          Documento complementario a los Términos y Condiciones de Uso del sitio www.toogo.store
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground leading-relaxed">
            Keting Media, S.A. de C.V. (en lo sucesivo, la "Plataforma") actúa exclusivamente como un intermediario tecnológico que permite a terceros (los "Vendedores") ofrecer y comercializar productos o servicios a través de su sitio web.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            En consecuencia, la Plataforma <strong>no es propietaria, fabricante, distribuidora, revendedora, ni garante</strong> de los productos o servicios publicados por los Vendedores, ni asume responsabilidad alguna respecto de su calidad, veracidad, licitud, características, condiciones de entrega, precios o disponibilidad.
          </p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Responsabilidad de los Vendedores</h2>
            <p className="text-muted-foreground leading-relaxed">
              Los Vendedores son los únicos responsables del contenido, información, imágenes, descripciones, precios y cualquier otro dato o material que publiquen en la Plataforma, así como de cumplir con todas las disposiciones legales aplicables, incluyendo las relativas a:
            </p>
            <ul className="list-disc list-inside text-muted-foreground ml-4 mt-2 space-y-2">
              <li>Propiedad intelectual</li>
              <li>Protección al consumidor</li>
              <li>Competencia económica</li>
              <li>Publicidad</li>
              <li>Protección de datos personales</li>
              <li>Sanidad</li>
              <li>Seguridad de los productos</li>
              <li>Comercio electrónico</li>
              <li>Demás normatividad vigente</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Facultades de la Plataforma</h2>
            <p className="text-muted-foreground leading-relaxed">
              En caso de que cualquier producto, servicio o contenido publicado por un Vendedor infrinja derechos de terceros o contravenga la legislación aplicable, la Plataforma podrá, a su entera discreción y sin necesidad de previo aviso, suspender, eliminar o restringir el acceso del Vendedor, la publicación correspondiente o su cuenta, sin que ello genere derecho alguno de indemnización, reembolso o reclamación a favor del Vendedor.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Obligación de Indemnización</h2>
            <p className="text-muted-foreground leading-relaxed">
              Los Vendedores se obligan expresamente a mantener en paz y a salvo a Keting Media, S.A. de C.V., sus accionistas, directivos, empleados y afiliadas, de cualquier demanda, queja, acción, sanción o reclamación derivada directa o indirectamente del uso de la Plataforma o de la venta de sus productos o servicios, incluyendo los honorarios legales y gastos que se deriven de la defensa correspondiente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Limitación de Responsabilidad</h2>
            <p className="text-muted-foreground leading-relaxed">
              La Plataforma no asume responsabilidad alguna por daños directos, indirectos o perjuicios que pudieran derivarse del uso del sitio, del contenido publicado por los Vendedores o de la relación entre éstos y los compradores.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Vigencia y modificaciones</h2>
            <p className="text-muted-foreground leading-relaxed">
              La presente Liberación podrá ser modificada por Keting Media, S.A. de C.V. en cualquier momento, publicándose la versión vigente en el sitio web. Toda modificación entrará en vigor desde su publicación.
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

export default LiberacionResponsabilidad;
