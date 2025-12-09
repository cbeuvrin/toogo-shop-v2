import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  structuredData?: object;
}

export const SEOHead = ({
  title = "Crea tu Tienda Online Gratis en 5 Minutos | TOOGO México - E-commerce Sin Programación",
  description = "⚡ Crea tu tienda online profesional GRATIS en menos de 5 minutos con TOOGO. Sin programación ni conocimientos técnicos. Vende por WhatsApp, gestiona productos y acepta pagos desde un solo lugar. ¡Comienza hoy mismo! 🛍️",
  keywords = "crear tienda online gratis, ecommerce mexico, tienda virtual gratis, vender por whatsapp, negocio online, tienda sin programacion, ecommerce facil, tienda online, e-commerce, crear tienda virtual, vender online, negocio digital, comercio electrónico",
  ogImage = "https://toogo.store/assets/toogo-og-image.jpg",
  ogType = "website",
  structuredData
}: SEOHeadProps) => {
  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "TOOGO",
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "MXN"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "250"
    },
    "operatingSystem": "Web",
    "description": description
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="fb:app_id" content="1595938024873627" />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content="https://toogo.store/" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1080" />
      <meta property="og:image:height" content="1080" />
      <meta property="og:image:alt" content="TOOGO - Tu tienda online en minutos" />
      <meta property="og:site_name" content="TOOGO" />
      <meta property="og:locale" content="es_MX" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content="https://toogo.store/" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content="TOOGO - Tu tienda online en minutos" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData || defaultStructuredData)}
      </script>
    </Helmet>
  );
};
