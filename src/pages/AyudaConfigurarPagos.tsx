import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ExternalLink, CheckCircle2, Lock, HelpCircle, Key } from 'lucide-react';
import toogoLogo from '@/assets/toogo-logo-help.png';
import toogoMascot from '@/assets/toogo-mascot-help.png';

const AyudaConfigurarPagos = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('mercadopago');

  useEffect(() => {
    const provider = searchParams.get('provider');
    if (provider && ['mercadopago', 'paypal', 'stripe'].includes(provider)) {
      setActiveTab(provider);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E0E0E0' }}>
      {/* Header */}
      <nav className="w-full max-w-[95%] lg:max-w-[80%] mx-auto px-4 lg:px-6 py-4 lg:py-6">
        <div className="flex items-center justify-between bg-white rounded-full px-4 lg:px-8 py-3 lg:py-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <img src={toogoLogo} alt="Toogo" className="h-8 lg:h-10 w-auto" />
            <h1 className="text-lg lg:text-xl font-semibold">Centro de Ayuda</h1>
          </div>
          <Button variant="outline" asChild className="rounded-full">
            <Link to="/dashboard">
              <ChevronLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Volver</span>
            </Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-[95%] lg:max-w-[80%] mx-auto px-4 lg:px-6 py-8 lg:py-16">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 bg-white rounded-2xl lg:rounded-3xl p-8 lg:p-12 shadow-lg mb-8">
          <div className="flex-shrink-0">
            <img
              src={toogoMascot}
              alt="Mascota de Toogo"
              className="w-48 lg:w-64 h-auto animate-bounce-slow"
            />
          </div>
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              ¡Hola! Te ayudo a configurar tus métodos de pago
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Aquí encontrarás guías paso a paso actualizadas (2025) para obtener tus credenciales.
              Es muy fácil, solo sigue las instrucciones visuales.
            </p>
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
              <Badge variant="outline" className="text-sm">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Guías Actualizadas
              </Badge>
              <Badge variant="outline" className="text-sm">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Paso a paso visual
              </Badge>
              <Badge variant="outline" className="text-sm">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Hazlo tú mismo (DIY)
              </Badge>
            </div>
          </div>
        </div>

        {/* Botones de Proveedor */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
          <Button
            onClick={() => setActiveTab('mercadopago')}
            variant={activeTab === 'mercadopago' ? 'default' : 'outline'}
            className={`rounded-[30px] min-w-[180px] ${activeTab === 'mercadopago'
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : ''
              }`}
          >
            💳 MercadoPago
          </Button>
          <Button
            onClick={() => setActiveTab('paypal')}
            variant={activeTab === 'paypal' ? 'default' : 'outline'}
            className={`rounded-[30px] min-w-[180px] ${activeTab === 'paypal'
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : ''
              }`}
          >
            🌐 PayPal
          </Button>
          <Button
            onClick={() => setActiveTab('stripe')}
            variant={activeTab === 'stripe' ? 'default' : 'outline'}
            className={`rounded-[30px] min-w-[180px] ${activeTab === 'stripe'
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : ''
              }`}
          >
            ⚡ Stripe
          </Button>
        </div>

        {/* MercadoPago Content */}
        {activeTab === 'mercadopago' && (
          <Card className="rounded-2xl lg:rounded-3xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">💳</span>
                Configurar MercadoPago
              </CardTitle>
              <CardDescription>
                Sigue esta guía detallada para aceptar pagos con tarjetas y efectivo (Oxxo).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Paso 1: Crear Cuenta */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Crear tu cuenta de Negocio</h3>
                  <p className="text-muted-foreground mb-3">
                    Si ya tienes cuenta personal, te recomendamos crear una nueva exclusiva para tu negocio o convertir la actual a <strong>Cuenta de Vendedor</strong>.
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mb-3 space-y-1">
                    <li>Entra a MercadoPago registro.</li>
                    <li>Selecciona <strong>"Crear cuenta de empresa"</strong> o "Vendedor".</li>
                    <li>Completa tus datos fiscales (RFC si estás en México es importante para reducir retenciones).</li>
                  </ul>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://www.mercadopago.com.mx/hub/registration/landing" target="_blank" rel="noopener noreferrer">
                      Registrarse en MercadoPago
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Paso 2: Developers */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Ir al Panel de Desarrolladores</h3>
                  <p className="text-muted-foreground mb-3">
                    Una vez con tu sesión iniciada, necesitas ir al sitio especial para desarrolladores.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://www.mercadopago.com.mx/developers/panel" target="_blank" rel="noopener noreferrer">
                      Abrir MercadoPago Developers
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Paso 3: Crear App */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Crear una Aplicación</h3>
                  <p className="text-muted-foreground mb-2">
                    En el panel, busca el botón <strong>"Crear aplicación"</strong>.
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Nombre: Pon el nombre de tu tienda (ej: "Mi Tienda Toogo").</li>
                    <li>Tipo de integración: Selecciona <strong>"Pagos Online"</strong> o "Checkout Pro".</li>
                    <li>¿Estás usando una plataforma de e-commerce?: Selecciona <strong>"No"</strong> (ya que estás integrando vía API directa con Toogo).</li>
                  </ul>
                </div>
              </div>

              {/* Paso 4: Activar Credenciales */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    4
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Activar Credenciales de Producción</h3>
                  <p className="text-muted-foreground mb-2">
                    Por defecto estarás en modo "Prueba" (Sandbox). Para cobrar de verdad:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-3">
                    <li>En el menú lateral de tu app, ve a <strong>"Credenciales de producción"</strong>.</li>
                    <li>Te pedirá llenar un formulario: giro del negocio, sitio web (pon tu link de Toogo), etc.</li>
                    <li>Al finalizar, se activarán las credenciales.</li>
                  </ul>
                </div>
              </div>

              {/* Paso 5: Copiar Keys */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    5
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Copiar y Pegar en Toogo</h3>
                  <p className="text-muted-foreground mb-3">
                    Copia las claves de la sección <strong>Producción</strong> (¡No las de prueba!):
                  </p>
                  <div className="bg-muted/50 border rounded-lg p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Public Key</p>
                        <p className="text-xs text-muted-foreground mb-1">Empieza con APP_USR-...</p>
                        <p className="text-sm">👉 Pégalo en el campo "Public Key"</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Lock className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Access Token</p>
                        <p className="text-xs text-muted-foreground mb-1">Empieza con APP_USR-...</p>
                        <p className="text-sm">👉 Pégalo en el campo <strong>"Access Token (Secreto)"</strong></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PayPal Content */}
        {activeTab === 'paypal' && (
          <Card className="rounded-2xl lg:rounded-3xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                Configurar PayPal
              </CardTitle>
              <CardDescription>
                Guía completa para recibir pagos internacionales y con tarjeta vía PayPal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Paso 1: Cuenta Business */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Crear Cuenta "Business"</h3>
                  <p className="text-muted-foreground mb-3">
                    <strong>IMPORTANTE:</strong> Las cuentas personales NO funcionan para vender en web. Debes registrarte como Negocio (Business).
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://www.paypal.com/mx/business" target="_blank" rel="noopener noreferrer">
                      Crear Cuenta Business en PayPal
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Paso 2: Developer Dashboard */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Ir a PayPal Developers</h3>
                  <p className="text-muted-foreground mb-3">
                    Inicia sesión con tu cuenta Business en el portal de desarrolladores.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://developer.paypal.com/dashboard/applications/live" target="_blank" rel="noopener noreferrer">
                      Ir al Dashboard de PayPal
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Paso 3: Crear App Live */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Crear App en modo "Live"</h3>
                  <p className="text-muted-foreground mb-2">
                    En la pestaña <strong>"Apps & Credentials"</strong>, verás un switch que dice "Sandbox" y "Live".
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-3">
                    <li>Cambia el switch a <strong>"Live"</strong> (esto es vital para cobros reales).</li>
                    <li>Haz clic en <strong>"Create App"</strong>.</li>
                    <li>Ponle el nombre de tu tienda y confirma.</li>
                  </ul>
                </div>
              </div>

              {/* Paso 4: Credenciales */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    4
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Copiar Credenciales</h3>
                  <p className="text-muted-foreground mb-3">
                    Dentro de la App que acabas de crear verás tus claves.
                  </p>
                  <div className="bg-muted/50 border rounded-lg p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Client ID</p>
                        <p className="text-sm">👉 Pégalo en el campo "Client ID" de Toogo</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Lock className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Client Secret</p>
                        <p className="text-xs text-muted-foreground mb-1">Puede estar oculto, haz clic en "Show".</p>
                        <p className="text-sm">👉 Pégalo en el campo <strong>"Client Secret (Secreto)"</strong></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stripe Content */}
        {activeTab === 'stripe' && (
          <Card className="rounded-2xl lg:rounded-3xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                Configurar Stripe
              </CardTitle>
              <CardDescription>
                La plataforma de pagos más robusta. Requiere validar tu identidad y negocio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Paso 1: Registro */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Crear y Activar Cuenta</h3>
                  <p className="text-muted-foreground mb-2">
                    Si no tienes cuenta, regístrate. Al entrar, lo primero es <strong>Activar la cuenta</strong>.
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-3">
                    <li>Stripe te pedirá datos muy específicos de tu negocio y cuenta bancaria para depositarte.</li>
                    <li>Debes verificar tu email y completar todo el formulario de activación.</li>
                  </ul>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer">
                      Registrarse en Stripe
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Paso 2: Developers */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Ir a API Keys</h3>
                  <p className="text-muted-foreground mb-3">
                    En el Dashboard, busca en la esquina superior derecha o en el menú: <strong>Developers (Desarrolladores) &gt; API Keys</strong>.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
                      Ir directo a API Keys
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Paso 3: Claves Standard */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Copiar Claves Standard</h3>
                  <p className="text-muted-foreground mb-3">
                    Asegúrate de desactivar el switch de <strong>"Test Mode"</strong> para ver las claves reales.
                  </p>
                  <div className="bg-muted/50 border rounded-lg p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Publishable Key</p>
                        <p className="text-xs text-muted-foreground mb-1">Empieza con pk_live_...</p>
                        <p className="text-sm">👉 Pégalo en el campo "Publishable Key" de Toogo</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Lock className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Secret Key</p>
                        <p className="text-xs text-muted-foreground mb-1">Empieza con sk_live_...</p>
                        <p className="text-sm">👉 Haz clic en "Reveal live key" y pega el código en <strong>"Secret Key (Secreto)"</strong></p>
                        <Badge variant="outline" className="mt-1 bg-purple-50 text-purple-700 border-purple-200">
                          ¡Ojo! Stripe solo te lo muestra una vez.
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Help Section */}
        <Card className="mt-12">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <img
                src={toogoMascot}
                alt="Mascota de Toogo"
                className="w-32 h-32"
              />
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-2">¿Necesitas más ayuda?</h3>
                <p className="text-muted-foreground mb-4">
                  Si tienes problemas encontrando tus claves, el equipo de soporte de Toogo está para ayudarte.
                </p>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <Button variant="default" asChild>
                    <a href="mailto:soporte@toogo.mx">
                      Contactar Soporte
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/dashboard">
                      Volver al Dashboard
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default AyudaConfigurarPagos;