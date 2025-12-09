import { SEOHead } from "@/components/SEOHead";
import { ContactSupportForm } from "@/components/ContactSupportForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MessageCircle, BookOpen, Clock, MapPin } from "lucide-react";

const Soporte = () => {
  return (
    <>
      <SEOHead
        title="Soporte y Ayuda - TOOGO"
        description="¿Necesitas ayuda? Contacta con nuestro equipo de soporte. Estamos aquí para ayudarte con tu tienda online."
        keywords="soporte, ayuda, contacto, asistencia, toogo, soporte tecnico"
      />

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                ¿Cómo podemos ayudarte?
              </h1>
              <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
                Nuestro equipo de soporte está listo para resolver tus dudas y ayudarte a sacar el máximo provecho de tu tienda online.
              </p>
            </div>
          </div>
        </div>

        <div className="container max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Form - Takes 2 columns */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Envíanos un mensaje</CardTitle>
                  <CardDescription>
                    Completa el formulario y nos pondremos en contacto contigo lo antes posible
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ContactSupportForm />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Takes 1 column */}
            <div className="space-y-6">
              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Información de contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Email</p>
                      <a 
                        href="mailto:soporte@toogo.store" 
                        className="text-sm text-primary hover:underline"
                      >
                        soporte@toogo.store
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Horario</p>
                      <p className="text-sm text-muted-foreground">
                        Lun - Vie: 9:00 - 18:00
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Respuesta en 24h hábiles
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Ubicación</p>
                      <p className="text-sm text-muted-foreground">
                        México
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Help Resources */}
              <Card>
                <CardHeader>
                  <CardTitle>Recursos de ayuda</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <a
                    href="/blog"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Blog</p>
                      <p className="text-xs text-muted-foreground">
                        Guías y tutoriales
                      </p>
                    </div>
                  </a>

                  <a
                    href="https://wa.me/5215566778899"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">WhatsApp</p>
                      <p className="text-xs text-muted-foreground">
                        Chat directo
                      </p>
                    </div>
                  </a>
                </CardContent>
              </Card>

              {/* FAQ Preview */}
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">¿Pregunta frecuente?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Muchas dudas se resuelven rápidamente en nuestra sección de ayuda y blog.
                  </p>
                  <a
                    href="/blog"
                    className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Ver artículos de ayuda
                    <span>→</span>
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Soporte;
