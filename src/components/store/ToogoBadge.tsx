/**
 * Sello "Hecho con TOOGO" al pie de las tiendas del PLAN GRATIS.
 *
 * Dos razones:
 * 1. Enlaces externos reales hacia toogo.store desde los dominios propios de
 *    los comerciantes. Es la única fuente de backlinks que crece sola con cada
 *    tienda nueva (la jugada con la que crecieron Shopify y Wix).
 * 2. Quitarlo es un motivo concreto para pasar a un plan de pago.
 *
 * El texto del enlace es solo la marca ("TOOGO"), nunca palabras clave: los
 * enlaces masivos de pie con anclas optimizadas se leen como artificiales.
 *
 * Ojo: el HTML que ve Google en las tiendas NO lo genera React, lo genera
 * supabase/functions/store-seo-handler. El sello está en los dos sitios y debe
 * seguir estándolo; si solo estuviera en uno, sería contenido divergente.
 */
export const ToogoBadge = () => (
  <div className="w-full border-t border-black/10 bg-white py-3 text-center">
    <p className="text-[13px] text-gray-500">
      Hecho con{' '}
      <a
        href="https://www.toogo.store"
        target="_blank"
        rel="noopener"
        className="font-semibold text-gray-700 underline-offset-2 hover:underline"
      >
        TOOGO
      </a>
    </p>
  </div>
);
