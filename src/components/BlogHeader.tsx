import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// Barra superior del blog: vuelta al inicio + CTA. El "?crear=1" lo lee
// LandingNueva y abre el onboarding directo.
export const BlogHeader = () => (
  <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
    <div className="container mx-auto flex h-14 items-center justify-between px-4">
      <Link to="/" className="flex items-center gap-1">
        <img src="/assets/l2/mascota.webp" alt="" className="h-6 w-auto" />
        <img src="/assets/l2/toogo-wordmark.webp" alt="TOOGO" className="h-6 w-auto" />
      </Link>
      <div className="flex items-center gap-3">
        <Link to="/" className="hidden text-sm font-medium text-gray-600 hover:text-gray-900 sm:block">
          Inicio
        </Link>
        <Button asChild size="sm">
          <Link to="/?crear=1">Crear tu tienda gratis</Link>
        </Button>
      </div>
    </div>
  </header>
);
