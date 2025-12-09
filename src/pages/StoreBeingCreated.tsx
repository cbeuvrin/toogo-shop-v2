import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Mail, ExternalLink } from 'lucide-react';
export default function StoreBeingCreated() {
  const [searchParams] = useSearchParams();
  const domain = searchParams.get('domain') || '';
  const email = searchParams.get('email') || '';
  const orderId = searchParams.get('order_id') || '';
  const [timeElapsed, setTimeElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header con Logo */}
        <div className="text-center space-y-4">
          <img src="/assets/toogo-logo.png" alt="Toogo Logo" className="h-16 mx-auto" />
          <h1 className="text-4xl md:text-5xl font-bold text-primary animate-fade-in">¡Tu tienda se está creando! 🚀</h1>
          <p className="text-lg text-muted-foreground">
            Estamos configurando todo para que puedas empezar a vender
          </p>
        </div>

        {/* Muñeco Animado */}
        <div className="flex justify-center animate-scale-in">
          <video autoPlay loop muted playsInline className="h-48 md:h-64" style={{
          objectFit: 'contain',
          border: 'none',
          outline: 'none'
        }}>
            <source src="/assets/toogo-building-animation.mp4" type="video/mp4" />
            Tu navegador no soporta videos HTML5.
          </video>
        </div>

        {/* Timeline de Estados */}
        <Card className="border-2 rounded-3xl">
          <CardContent className="p-6 space-y-6 rounded-3xl">
            {/* Dominio Comprado */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">Dominio adquirido</h3>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Completado
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  Tu dominio <span className="font-mono font-semibold text-primary">{domain}</span> ha sido registrado exitosamente
                </p>
              </div>
            </div>

            {/* Pago Confirmado */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">Pago confirmado</h3>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Completado
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  Tu pago ha sido procesado exitosamente por MercadoPago
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ID de orden: <span className="font-mono">{orderId}</span>
                </p>
              </div>
            </div>

            {/* Tienda Creada */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">Tienda creada</h3>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Completado
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  Tu cuenta y configuración inicial están listas
                </p>
              </div>
            </div>

            {/* DNS en Configuración */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                  <Clock className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">DNS en propagación</h3>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    En proceso
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  Estamos propagando tu dominio por Internet. Este proceso puede tardar entre <strong>24-48 horas</strong>
                </p>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    💡 <strong>¿Por qué tarda?</strong> Los servidores DNS de todo el mundo necesitan actualizar sus registros para que tu dominio funcione correctamente.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notificación por Email y Próximos Pasos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Notificación por Email */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl">
            <CardContent className="p-6 rounded-3xl">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <Mail className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-xl mb-2">Te avisaremos cuando esté lista</h3>
                  <p className="text-muted-foreground mb-3">
                    Enviaremos un email a <span className="font-semibold text-foreground">{email}</span> con:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      🔐 Tus credenciales de acceso
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      🚀 Link directo a tu Dashboard
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      📋 Tutorial de primeros pasos
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      📚 Documentación completa
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      🎥 Video de bienvenida
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Próximos Pasos Preview */}
          <Card className="rounded-3xl">
            <CardContent className="p-6 rounded-3xl">
              <h3 className="font-semibold text-lg mb-4">Mientras tanto, prepárate para:</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Agrega tus productos</h4>
                    <p className="text-sm text-muted-foreground">Sube fotos, precios y descripciones</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Personaliza tu logo</h4>
                    <p className="text-sm text-muted-foreground">Dale identidad a tu marca</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Configura tus pagos</h4>
                    <p className="text-sm text-muted-foreground">MercadoPago o WhatsApp</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">4</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Comparte tu tienda</h4>
                    <p className="text-sm text-muted-foreground">Empieza a vender</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer con Soporte */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              Tiempo transcurrido: {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
            </span>
          </div>
          
          <Button variant="outline" asChild>
            <a href="mailto:soporte@toogo.store" className="inline-flex items-center gap-2">
              <Mail className="w-4 h-4" />
              ¿Necesitas ayuda? Contáctanos
            </a>
          </Button>

          <p className="text-xs text-muted-foreground">
            Si no recibes el email en 48 horas, por favor contacta a nuestro soporte
          </p>
        </div>
      </div>
    </div>;
}