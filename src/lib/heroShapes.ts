/**
 * Hero image shapes shared by the shape editor modal, the editor preview and
 * the live templates (Caribe/trendy_fashion et al). Single source of truth —
 * adding a shape here makes it available everywhere.
 */

export const HERO_SHAPE_OPTIONS = [
  { value: "organic", label: "Orgánica 1 (Clásica)" },
  { value: "organic2", label: "Orgánica 2 (Diagonal)" },
  { value: "organic3", label: "Orgánica 3 (Nube)" },
  { value: "pebble", label: "Piedra" },
  { value: "splash", label: "Salpicadura" },
  { value: "arch", label: "Arco (Ventana)" },
  { value: "circle", label: "Círculo Perfecto" },
  { value: "rounded", label: "Bordes Redondeados" },
  { value: "square", label: "Cuadrada" },
] as const;

export const getHeroShapeRadius = (shape?: string): string => {
  switch (shape) {
    case "square":
      return "0";
    case "rounded":
      return "2rem";
    case "circle":
      return "50%";
    case "arch":
      // Cathedral-window arch: fully rounded top, near-straight bottom.
      return "50% 50% 12px 12px / 32% 32% 12px 12px";
    case "organic2":
      // Diagonal blob — heavy curves on opposite corners.
      return "30% 70% 70% 30% / 30% 30% 70% 70%";
    case "organic3":
      // Cloud-ish asymmetric blob.
      return "50% 50% 35% 65% / 60% 35% 65% 40%";
    case "pebble":
      // Soft river-stone, slightly squashed.
      return "63% 37% 54% 46% / 55% 48% 52% 45%";
    case "splash":
      // Wild splash — strongly uneven on every corner.
      return "40% 60% 30% 70% / 50% 30% 70% 50%";
    case "organic":
    default:
      return "60% 40% 40% 60% / 55% 55% 45% 45%";
  }
};
