// Relación de aspecto de la CARD de producto (grid principal del home) por plantilla.
// Se usa para recortar la foto de producto al subirla, según la plantilla activa,
// para que la imagen se vea sin recortes raros en la tienda.
//
// Mapa (verificado contra el código de cada plantilla, jul 2026):
//   Vertical 3:4 → Pacífico, Mediterráneo, Adriático, Índico, Caribe, Nature
//   Cuadrado 1:1 → Atlántico, Premium Brand, Bauhaus, Cyber

const PORTRAIT_KEYS = ["simple_live", "minimal", "fashion", "trendy", "nature"];

/** Devuelve el aspect ratio numérico (ancho/alto) de la card de producto de la plantilla. */
export function getProductAspectRatio(templateId?: string | null): number {
  const t = (templateId || "default").toLowerCase();
  // "fashion" cubre fashion, fashion_hero; "trendy" cubre trendy_fashion
  if (PORTRAIT_KEYS.some((k) => t.includes(k))) return 3 / 4; // 0.75 vertical
  return 1; // cuadrado: default, premium_brand, bauhaus, cyber
}

/** Etiqueta legible del formato, para mostrar al usuario en el cropper. */
export function getProductAspectLabel(templateId?: string | null): string {
  return getProductAspectRatio(templateId) === 1 ? "Cuadrada (1:1)" : "Vertical (3:4)";
}
