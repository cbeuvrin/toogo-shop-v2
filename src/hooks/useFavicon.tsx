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

    // Find or create favicon link element
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    // Store original favicon to restore on cleanup
    const originalHref = link.href;

    // Set tenant logo as favicon
    link.href = logoUrl;

    // Cleanup: restore original favicon when component unmounts or dependencies change
    return () => {
      if (link && originalHref) {
        link.href = originalHref;
      }
    };
  }, [logoUrl, plan]);
};
