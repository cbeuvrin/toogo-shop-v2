import { useEffect } from 'react';

interface StoreMetaProps {
  tenant?: {
    name: string;
    primary_host: string;
  } | null;
  settings?: {
    share_title?: string | null;
    share_description?: string | null;
    share_image_url?: string | null;
    logo_url?: string | null;
  } | null;
}

export const useStoreMeta = ({ tenant, settings }: StoreMetaProps) => {
  useEffect(() => {
    // No ejecutar en rutas de blog - dejar que Helmet controle los meta tags
    if (window.location.pathname.startsWith('/blog/')) {
      return;
    }
    
    if (!tenant) return;

    // Construct meta tag values with fallbacks
    const title = settings?.share_title || tenant.name || 'Tienda Online';
    const description = settings?.share_description || `${tenant.name} - Tienda online`;
    const imageUrl = settings?.share_image_url || settings?.logo_url || '/assets/toogo-og-image.jpg';
    const currentUrl = window.location.href;

    // Helper function to update or create meta tags
    const updateMetaTag = (property: string, content: string, isName = false) => {
      const selector = isName ? `meta[name="${property}"]` : `meta[property="${property}"]`;
      let element = document.querySelector(selector) as HTMLMetaElement;
      
      if (!element) {
        element = document.createElement('meta');
        if (isName) {
          element.setAttribute('name', property);
        } else {
          element.setAttribute('property', property);
        }
        document.head.appendChild(element);
      }
      
      element.content = content;
    };

    // Update document title
    document.title = title;

    // Update Open Graph tags (Facebook, WhatsApp)
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:image', imageUrl);
    updateMetaTag('og:url', currentUrl);
    updateMetaTag('og:type', 'website');
    updateMetaTag('og:site_name', tenant.name);

    // Update Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image', true);
    updateMetaTag('twitter:title', title, true);
    updateMetaTag('twitter:description', description, true);
    updateMetaTag('twitter:image', imageUrl, true);

    // Update standard meta description
    updateMetaTag('description', description, true);

  }, [tenant, settings]);
};
