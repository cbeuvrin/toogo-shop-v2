import { useEffect } from 'react';

interface UseFaviconProps {
  logoUrl?: string;
  plan?: string;
}

/**
 * Hook to dynamically set favicon based on tenant logo
 * Only applies for Basic and Premium plans
 */
export const useFavicon = ({ logoUrl, plan }: UseFaviconProps) => {
  useEffect(() => {
    // Only apply custom favicon for paid plans
    if (!logoUrl || !plan || plan === 'free') {
      return;
    }

    // Actualiza (o crea) un <link> de icono con el logo del tenant.
    const setIcon = (rel: string) => {
      let link = document.querySelector(`link[rel='${rel}']`) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = logoUrl;
    };

    // Favicon de pestaña + icono de "agregar a inicio" en iOS.
    setIcon('icon');
    setIcon('apple-touch-icon');

    // Sin cleanup que reponga el favicon por defecto: al navegar entre
    // home ↔ catálogo ↔ producto el favicon del tenant se mantiene estable
    // (evita el parpadeo al favicon TOOGO durante la carga de la nueva ruta).
  }, [logoUrl, plan]);
};
