import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ExternalLink, CheckCircle2, Lock, HelpCircle } from 'lucide-react';
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
              Aquí encontrarás guías paso a paso para obtener las credenciales de MercadoPago, PayPal y Stripe. 
              Es más fácil de lo que parece, ¡vamos juntos!
            </p>
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
              <Badge variant="outline" className="text-sm">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Sin conocimientos técnicos
              </Badge>
              <Badge variant="outline" className="text-sm">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Paso a paso visual
              </Badge>
              <Badge variant="outline" className="text-sm">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Totalmente gratis
              </Badge>
            </div>
          </div>
        </div>

        {/* Botones de Proveedor */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
          <Button
            onClick={() => setActiveTab('mercadopago')}
            variant={activeTab === 'mercadopago' ? 'default' : 'outline'}
            className={`rounded-[30px] min-w-[180px] ${
              activeTab === 'mercadopago' 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : ''
            }`}
          >
            💳 MercadoPago
          </Button>
          <Button
            onClick={() => setActiveTab('paypal')}
            variant={activeTab === 'paypal' ? 'default' : 'outline'}
            className={`rounded-[30px] min-w-[180px] ${
              activeTab === 'paypal' 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : ''
            }`}
          >
            🌐 PayPal
          </Button>
          <Button
            onClick={() => setActiveTab('stripe')}
            variant={activeTab === 'stripe' ? 'default' : 'outline'}
            className={`rounded-[30px] min-w-[180px] ${
              activeTab === 'stripe' 
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
                  Para recibir pagos con MercadoPago necesitas dos credenciales: una clave pública y un token de acceso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Paso 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      1
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Crear cuenta en MercadoPago</h3>
                    <p className="text-muted-foreground mb-3">
                      Si aún no tienes una cuenta, crea una de forma gratuita. Es rápido y sencillo.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://www.mercadopago.com.mx" target="_blank" rel="noopener noreferrer">
                        Ir a MercadoPago
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Paso 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      2
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Acceder al Panel de Desarrolladores</h3>
                    <p className="text-muted-foreground mb-3">
                      Una vez que tengas tu cuenta, ingresa al panel de desarrolladores de MercadoPago.
                    </p>
                    <Button variant="default" size="sm" asChild>
                      <a href="https://www.mercadopago.com.mx/developers/panel/app" target="_blank" rel="noopener noreferrer">
                        Ir al Panel de Desarrolladores
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Paso 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      3
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Crear o seleccionar una aplicación</h3>
                    <p className="text-muted-foreground">
                      En la sección "Tus aplicaciones", crea una nueva aplicación o selecciona una existente. 
                      Dale un nombre descriptivo como "Mi Tienda Toogo".
                    </p>
                  </div>
                </div>

                {/* Paso 4 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      4
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Obtener las credenciales</h3>
                    <p className="text-muted-foreground mb-3">
                      En la sección "Credenciales" de tu aplicación encontrarás dos claves importantes:
                    </p>
                    <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Public Key</p>
                          <p className="text-sm text-muted-foreground">
                            Comienza con <code className="bg-background px-1 rounded">APP_USR-...</code>
                          </p>
                          <Badge variant="outline" className="mt-1 bg-green-50 text-green-700 border-green-200">
                            Esta va en el Dashboard
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Lock className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Access Token</p>
                          <p className="text-sm text-muted-foreground">
                            También comienza con <code className="bg-background px-1 rounded">APP_USR-...</code>
                          </p>
                          <Badge variant="outline" className="mt-1 bg-red-50 text-red-700 border-red-200">
                            Debe guardarse de forma segura
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paso 5 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      5
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Copiar Public Key al Dashboard</h3>
                    <p className="text-muted-foreground mb-3">
                      Copia tu <strong>Public Key</strong> y pégala en el campo correspondiente en tu Dashboard de Toogo.
                    </p>
                    <Alert>
                      <HelpCircle className="h-4 w-4" />
                      <AlertDescription>
                        La Public Key es segura compartirla, por eso puedes pegarla directamente en el formulario.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                {/* Paso 6 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      6
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Configurar Access Token de forma segura</h3>
                    <p className="text-muted-foreground mb-3">
                      El <strong>Access Token</strong> es una clave secreta que NO debe compartirse. 
                      Contacta a nuestro equipo de soporte para configurarlo de forma segura.
                    </p>
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <Lock className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        Nunca compartas tu Access Token en correos, chats o capturas de pantalla. 
                        Nuestro equipo te guiará para almacenarlo de forma encriptada.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                {/* CTA Final */}
                <div className="pt-6 border-t">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button asChild className="flex-1">
                      <Link to="/dashboard">
                        Ir al Dashboard
                      </Link>
                    </Button>
                    <Button variant="outline" className="flex-1" asChild>
                      <a href="mailto:soporte@toogo.mx">
                        Contactar Soporte
                      </a>
                    </Button>
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
                  Para recibir pagos con PayPal necesitas una cuenta Business y dos credenciales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Paso 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      1
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Crear cuenta PayPal Business</h3>
                    <p className="text-muted-foreground mb-3">
                      Si no tienes una cuenta Business, crea una. Es diferente a una cuenta personal y te permite recibir pagos en tu tienda.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://www.paypal.com/mx/business" target="_blank" rel="noopener noreferrer">
                        Crear cuenta Business
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Paso 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      2
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Ir al Developer Dashboard</h3>
                    <p className="text-muted-foreground mb-3">
                      Accede al panel de desarrolladores de PayPal. Aquí es donde encontrarás tus credenciales.
                    </p>
                    <Button variant="default" size="sm" asChild>
                      <a href="https://developer.paypal.com/dashboard/applications/live" target="_blank" rel="noopener noreferrer">
                        Ir a PayPal Developer
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Paso 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      3
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Crear o seleccionar una App</h3>
                    <p className="text-muted-foreground">
                      En "My Apps & Credentials", crea una nueva aplicación o selecciona una existente. 
                      Asegúrate de estar en el modo "Live" (producción) y no en "Sandbox" (pruebas).
                    </p>
                  </div>
                </div>

                {/* Paso 4 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      4
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Obtener las credenciales</h3>
                    <p className="text-muted-foreground mb-3">
                      Dentro de tu aplicación verás dos credenciales importantes:
                    </p>
                    <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Client ID</p>
                          <p className="text-sm text-muted-foreground">
                            Una cadena larga de caracteres visible directamente
                          </p>
                          <Badge variant="outline" className="mt-1 bg-green-50 text-green-700 border-green-200">
                            Esta va en el Dashboard
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Lock className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Client Secret</p>
                          <p className="text-sm text-muted-foreground">
                            Está oculto por defecto, hay que hacer clic en "Show" para verlo
                          </p>
                          <Badge variant="outline" className="mt-1 bg-red-50 text-red-700 border-red-200">
                            Debe guardarse de forma segura
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paso 5 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      5
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Copiar Client ID al Dashboard</h3>
                    <p className="text-muted-foreground mb-3">
                      Copia tu <strong>Client ID</strong> y pégalo en el campo correspondiente en tu Dashboard de Toogo.
                    </p>
                    <Alert>
                      <HelpCircle className="h-4 w-4" />
                      <AlertDescription>
                        El Client ID es público, por eso puedes pegarlo directamente en el formulario.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                {/* Paso 6 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      6
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Configurar Client Secret de forma segura</h3>
                    <p className="text-muted-foreground mb-3">
                      El <strong>Client Secret</strong> es una clave privada que NO debe compartirse. 
                      Contacta a nuestro equipo de soporte para configurarlo de forma segura.
                    </p>
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <Lock className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        Nunca compartas tu Client Secret públicamente. 
                        Nuestro equipo te guiará para almacenarlo de forma encriptada.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                {/* CTA Final */}
                <div className="pt-6 border-t">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button asChild className="flex-1">
                      <Link to="/dashboard">
                        Ir al Dashboard
                      </Link>
                    </Button>
                    <Button variant="outline" className="flex-1" asChild>
                      <a href="mailto:soporte@toogo.mx">
                        Contactar Soporte
                      </a>
                    </Button>
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
                  <span className="text-2xl">💳</span>
                  Configurar Stripe
                </CardTitle>
                <CardDescription>
                  Stripe es una de las plataformas de pago más sencillas de configurar. Solo necesitas dos claves.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Paso 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      1
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Crear cuenta en Stripe</h3>
                    <p className="text-muted-foreground mb-3">
                      Si aún no tienes cuenta en Stripe, créala de forma gratuita. El proceso es muy rápido.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">
                        Ir a Stripe
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Paso 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      2
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Ir a la sección de API Keys</h3>
                    <p className="text-muted-foreground mb-3">
                      Dentro de tu dashboard de Stripe, navega a Developers → API keys.
                    </p>
                    <Button variant="default" size="sm" asChild>
                      <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
                        Ir a API Keys
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Paso 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      3
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Identificar las dos claves</h3>
                    <p className="text-muted-foreground mb-3">
                      En esta sección verás dos tipos de claves claramente diferenciadas:
                    </p>
                    <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Publishable Key</p>
                          <p className="text-sm text-muted-foreground">
                            Comienza con <code className="bg-background px-1 rounded">pk_live_...</code> o <code className="bg-background px-1 rounded">pk_test_...</code>
                          </p>
                          <Badge variant="outline" className="mt-1 bg-green-50 text-green-700 border-green-200">
                            Esta va en el Dashboard
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Lock className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Secret Key</p>
                          <p className="text-sm text-muted-foreground">
                            Comienza con <code className="bg-background px-1 rounded">sk_live_...</code> o <code className="bg-background px-1 rounded">sk_test_...</code>
                          </p>
                          <Badge variant="outline" className="mt-1 bg-red-50 text-red-700 border-red-200">
                            Debe guardarse de forma segura
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Alert className="mt-3">
                      <HelpCircle className="h-4 w-4" />
                      <AlertDescription>
                        Si estás empezando, puedes usar las claves de "test" (prueba). 
                        Cuando estés listo para producción, cambias a las claves "live".
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                {/* Paso 4 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      4
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Copiar Publishable Key al Dashboard</h3>
                    <p className="text-muted-foreground mb-3">
                      Copia tu <strong>Publishable Key</strong> y pégala en el campo correspondiente en tu Dashboard de Toogo.
                    </p>
                    <Alert>
                      <HelpCircle className="h-4 w-4" />
                      <AlertDescription>
                        La Publishable Key está diseñada para ser pública, por eso es seguro pegarla en el formulario.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                {/* Paso 5 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      5
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Configurar Secret Key de forma segura</h3>
                    <p className="text-muted-foreground mb-3">
                      La <strong>Secret Key</strong> es extremadamente sensible y NO debe compartirse nunca. 
                      Contacta a nuestro equipo de soporte para configurarla de forma segura.
                    </p>
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <Lock className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        La Secret Key da acceso total a tu cuenta de Stripe. 
                        Nuestro equipo la almacenará de forma encriptada en un servidor seguro.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                {/* CTA Final */}
                <div className="pt-6 border-t">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button asChild className="flex-1">
                      <Link to="/dashboard">
                        Ir al Dashboard
                      </Link>
                    </Button>
                    <Button variant="outline" className="flex-1" asChild>
                      <a href="mailto:soporte@toogo.mx">
                        Contactar Soporte
                      </a>
                    </Button>
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
                  Nuestro equipo está aquí para ayudarte. Si tienes dudas sobre cómo configurar tus credenciales 
                  de forma segura, o si encuentras algún problema, no dudes en contactarnos.
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