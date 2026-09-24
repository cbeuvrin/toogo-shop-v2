import { useEffect } from "react";
import LandingNueva from "./LandingNueva";

/**
 * /precios para personas.
 *
 * Esta ruta no existía: el menú del HTML que reciben los buscadores y el
 * offers.url del schema ya apuntaban a /precios, pero para los bots devolvía
 * 404 + noindex y para las personas caía en la página de "no encontrado".
 *
 * Reutilizamos la landing y bajamos a la sección de precios, que es donde vive
 * el contenido real. Así la URL existe de verdad y se ve igual que siempre.
 * El HTML que reciben los buscadores es otro (MKT_PAGES['/precios'] en
 * store-seo-handler), con la tabla de planes y su propio canonical.
 */
const Precios = () => {
  useEffect(() => {
    const ir = () => {
      const seccion = document.getElementById("precios");
      if (!seccion) return false;
      // 'auto' y no 'smooth': la persona pidió /precios, no queremos que vea
      // pasar toda la landing antes de llegar.
      seccion.scrollIntoView({ behavior: "auto", block: "start" });
      return true;
    };
    if (ir()) return;
    // La landing monta por partes; reintentamos un momento y desistimos.
    let intentos = 0;
    const t = setInterval(() => {
      if (ir() || ++intentos > 20) clearInterval(t);
    }, 100);
    return () => clearInterval(t);
  }, []);

  return <LandingNueva />;
};

export default Precios;
