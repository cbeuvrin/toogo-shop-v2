import React from 'react';
import { Button } from '@/components/ui/button';
interface SubdomainAvailablePageProps {
  subdomain: string;
}
const SubdomainAvailablePage = ({
  subdomain
}: SubdomainAvailablePageProps) => {
  const handleGetStarted = () => {
    window.location.href = 'https://toogo.store';
  };
  return <div className="min-h-screen bg-[#E0E0E0]">
      {/* Header */}
      <header className="w-full py-4 px-6 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/assets/toogo-logo.png" alt="TOOGO" className="h-8 w-auto" />
          </div>
          <Button onClick={handleGetStarted} className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-2xl">
            Crear mi tienda
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12 items-center mb-16">
            {/* Content - Left Side */}
            <div className="text-center lg:text-left">
              {/* Headline */}
              <div className="mb-6">
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
                  ¡<span className="text-primary">{subdomain}</span>.toogo.store
                </h1>
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                  podría ser tuyo!
                </h2>
              </div>

              {/* Description */}
              <div className="mb-8">
                <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                  Este subdominio está disponible. Crea tu tienda online profesional 
                  con TOOGO y comienza a vender en minutos.
                </p>
              </div>

              {/* Call to Action */}
              <div className="space-y-4">
                <Button onClick={handleGetStarted} size="lg" className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
                  Crear mi tienda ahora
                </Button>
                <p className="text-sm text-gray-600">Versión gratis o Pro, tú decides</p>
              </div>
            </div>

            {/* Mascot - Right Side */}
            <div className="flex justify-center lg:justify-end">
              <img src="/assets/toogo-mascot-blue.png" alt="Mascota TOOGO" className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 object-contain animate-bounce-gentle" />
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 shadow-sm rounded-3xl text-center">
              <div className="text-2xl mb-2">🚀</div>
              <h3 className="font-semibold text-gray-900 mb-1">Rápido</h3>
              <p className="text-sm text-gray-600">Tu tienda lista en minutos</p>
            </div>
            <div className="bg-white p-6 shadow-sm rounded-3xl text-center">
              <div className="text-2xl mb-2">💎</div>
              <h3 className="font-semibold text-gray-900 mb-1">Profesional</h3>
              <p className="text-sm text-gray-600">Diseños modernos y elegantes</p>
            </div>
            <div className="bg-white p-6 shadow-sm rounded-3xl text-center">
              <div className="text-2xl mb-2">📱</div>
              <h3 className="font-semibold text-gray-900 mb-1">Responsive</h3>
              <p className="text-sm text-gray-600">Perfecto en todos los dispositivos</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-6 px-4 border-t border-gray-200">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-600 text-sm">
            © 2024 TOOGO. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>;
};
export default SubdomainAvailablePage;