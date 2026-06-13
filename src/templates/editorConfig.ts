import type React from "react";

/**
 * Per-template visual-editor configuration ("Indico-level editing").
 *
 * Indico (fashion_hero) was the pilot: every text element is individually
 * editable (content/font/size/color, buttons also bg/visibility/action) and
 * every section background is click-editable. This registry is what lets the
 * SAME generic modals (TextStyleEditModal, SectionBgEditModal) adapt to each
 * template's own anatomy: which elements it has, how they're labeled, their
 * default copy, and the baseline typography the modal preview must mimic.
 *
 * Data flow (already generic, shared by all templates):
 *   editor → hero.styles[elementKey] / hero.sectionBg[sectionKey]
 *   store  → Tienda.tsx passes heroStyles/sectionBg to every template
 *
 * To bring a new template up to Indico level:
 *   1. Add its entry here (elements + sectionBgs).
 *   2. Apply the styles in the template file (styleFor pattern).
 *   3. Wrap the elements with EditableElement in its StorePreview layout.
 */

export interface EditorElementConfig {
  /** Modal title: "Editar {label}" */
  label: string;
  /** Placeholder/default copy shown when the user hasn't overridden the text. */
  defaultText: string;
  /**
   * Baseline typography the template applies via CSS classes (weight/transform/
   * tracking). Merged UNDER user overrides in the modal preview so it matches
   * the real render. Size is intentionally omitted (the slider controls it).
   */
  previewBaseStyle?: React.CSSProperties;
  /** Textarea instead of input (long copy). */
  multiline?: boolean;
  /** Render the button section (bg color, visibility, click action). */
  isButton?: boolean;
  /** Show only a show/hide switch (decorative text that can be hidden, no action). */
  canHide?: boolean;
  /** Hide the text input (content comes from elsewhere, e.g. nav categories). */
  hideText?: boolean;
  /** Hide the live preview block. */
  hidePreview?: boolean;
  /** Info note rendered after the controls. */
  infoText?: string;
}

export interface TemplateEditorConfig {
  /** Editable text elements, keyed by the id stored in hero.styles[key]. */
  elements: Record<string, EditorElementConfig>;
  /** Click-editable section backgrounds: key in hero.sectionBg → human label. */
  sectionBgs: Record<string, string>;
}

const NAV_MENU_INFO =
  "Las categorías vienen de la pestaña Productos → Categorías. Aquí solo puedes cambiar fuente, tamaño y color. Si son muchas, el menú se convierte automáticamente en hamburguesa.";

/** Indico (fashion_hero) — the pilot template, fully editable. */
const FASHION_HERO_CONFIG: TemplateEditorConfig = {
  elements: {
    eyebrow: {
      label: "eyebrow del Héroe",
      defaultText: "Nueva Colección",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.25em" },
    },
    title: {
      label: "Título del Héroe",
      defaultText: "Estilo que Inspira",
      previewBaseStyle: { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em" },
    },
    message: {
      label: "Mensaje del Héroe",
      defaultText: "Descubre nuestra nueva colección diseñada para quienes viven con propósito.",
      previewBaseStyle: { fontWeight: 400 },
      multiline: true,
    },
    cta1: {
      label: "Botón principal",
      defaultText: "Ver Colección",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
      isButton: true,
    },
    cta2: {
      label: "Botón secundario",
      defaultText: "Novedades",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
      isButton: true,
    },
    sectionTitle1: {
      label: 'Título "Recién Llegados"',
      defaultText: "Recién Llegados",
      previewBaseStyle: { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em" },
    },
    sectionLink1: {
      label: 'Link "Ver todo"',
      defaultText: "Ver todo",
      previewBaseStyle: { fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "4px" },
    },
    sectionTitle2: {
      label: 'Título "Populares ahora"',
      defaultText: "Populares ahora",
      previewBaseStyle: { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em" },
    },
    footerHeading1: {
      label: "Footer — Contacto",
      defaultText: "Contacto",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
    footerHeading2: {
      label: "Footer — Ubicación",
      defaultText: "Ubicación",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
    footerHeading3: {
      label: "Footer — Síguenos",
      defaultText: "Síguenos",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
    navMenu: {
      label: "Menú de categorías",
      defaultText: "Mujer • Hombre • Kids",
      previewBaseStyle: { fontWeight: 500 },
      hideText: true,
      hidePreview: true,
      infoText: NAV_MENU_INFO,
    },
    productCardCta: {
      label: 'Botón "Agregar" del producto',
      defaultText: "Agregar +",
      previewBaseStyle: { fontWeight: 700 },
    },
    menuDrawerTitle: {
      label: "Título del menú hamburguesa",
      defaultText: "Categorías",
      previewBaseStyle: { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em" },
    },
  },
  sectionBgs: {
    navbar: "Barra de menú",
    hero: "Héroe (lado del texto)",
    section1: "Recién Llegados",
    section2: "Populares ahora",
    footer: "Footer",
  },
};

/** Trendy Fashion — hero foto orgánica + texto, serif. */
const TRENDY_FASHION_CONFIG: TemplateEditorConfig = {
  elements: {
    title: {
      label: "Título del Héroe",
      defaultText: "Los Mejores Productos\nPara Ti",
      previewBaseStyle: { fontWeight: 700, fontFamily: "Georgia, serif" },
      multiline: true,
    },
    cta1: {
      label: "Botón principal",
      defaultText: "Ver Ahora",
      previewBaseStyle: { fontWeight: 600 },
      isButton: true,
    },
    cta2: {
      label: "Botón secundario",
      defaultText: "Nueva Colección",
      previewBaseStyle: { fontWeight: 600 },
      isButton: true,
    },
    promoText: {
      label: "Texto promocional",
      defaultText: "¡Ahorra 20% Ahora!",
      previewBaseStyle: { fontWeight: 400 },
    },
    navMenu: {
      label: "Menú de categorías",
      defaultText: "Belleza • Hombre • Mujer",
      previewBaseStyle: { fontWeight: 500 },
      hideText: true,
      hidePreview: true,
      infoText: NAV_MENU_INFO,
    },
    sectionTitle1: {
      label: 'Título "Nueva Colección"',
      defaultText: "Nueva Colección",
      previewBaseStyle: { fontWeight: 700, fontFamily: "Georgia, serif" },
    },
    sectionSubtitle1: {
      label: "Subtítulo de la sección",
      defaultText: "Los mejores estilos de temporada",
      previewBaseStyle: { fontWeight: 400 },
    },
    sectionLink1: {
      label: 'Link "Ver todo"',
      defaultText: "Ver todo",
      previewBaseStyle: { fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "4px" },
    },
    footerHeading1: {
      label: "Footer — Contacto",
      defaultText: "Contacto",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
    footerHeading2: {
      label: "Footer — Ubicación",
      defaultText: "Ubicación",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
    footerHeading3: {
      label: "Footer — Síguenos",
      defaultText: "Síguenos",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
  },
  sectionBgs: {
    navbar: "Barra de menú",
    hero: "Héroe",
    section1: "Sección de productos",
    footer: "Footer",
  },
};

/** Adriático (fashion) — estilo revista: tipografía masiva, hero de 3 fotos. */
const FASHION_CONFIG: TemplateEditorConfig = {
  elements: {
    title: {
      label: "Título del Héroe",
      defaultText: "Nueva Colección\nde Verano",
      previewBaseStyle: { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em" },
      multiline: true,
    },
    message: {
      label: "Mensaje del Héroe",
      defaultText: "Descubre la nueva colección de moda con colores vibrantes, estampados únicos y piezas cómodas perfectas para cualquier ocasión.",
      previewBaseStyle: { fontWeight: 500 },
      multiline: true,
    },
    cta1: {
      label: "Botón principal",
      defaultText: "Ver Colección",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
      isButton: true,
    },
    cta2: {
      label: "Botón secundario",
      defaultText: "Novedades",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
      isButton: true,
    },
    navMenu: {
      label: "Menú de categorías",
      defaultText: "Inicio • Tienda • Blog",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
      hideText: true,
      hidePreview: true,
      infoText: NAV_MENU_INFO,
    },
    sectionTitle1: {
      label: 'Título "Recién Llegados"',
      defaultText: "RECIÉN LLEGADOS",
      previewBaseStyle: { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em" },
    },
    midBannerTitle: {
      label: "Título del Banner Editorial",
      defaultText: "Estilo Sin Límites",
      previewBaseStyle: { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em" },
    },
    sectionTitle2: {
      label: 'Título "Populares"',
      defaultText: "POPULARES",
      previewBaseStyle: { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em" },
    },
  },
  sectionBgs: {
    navbar: "Barra de menú",
    hero: "Héroe (lado del texto)",
    section1: "Recién Llegados",
    section2: "Populares",
    footer: "Footer",
  },
};

/** Mediterráneo (minimal) — catálogo-home tipográfico, hero panorámico con overlay. */
const MINIMAL_CONFIG: TemplateEditorConfig = {
  elements: {
    title: {
      label: "Título del Héroe",
      defaultText: "Esenciales de Temporada",
      previewBaseStyle: { fontWeight: 400, fontFamily: "Georgia, serif" },
    },
    message: {
      label: "Mensaje del Héroe",
      defaultText: "Descubre la nueva colección minimalista.",
      previewBaseStyle: { fontWeight: 300, letterSpacing: "0.02em" },
      multiline: true,
    },
    cta1: {
      label: "Botón del Héroe",
      defaultText: "Ver colección",
      previewBaseStyle: { fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.2em" },
      isButton: true,
    },
    navMenu: {
      label: "Menú (Catálogo / Contacto)",
      defaultText: "Catálogo • Contacto",
      previewBaseStyle: { fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em" },
      hideText: true,
      infoText: "Estos enlaces son fijos (Catálogo y Contacto). Aquí puedes cambiar su fuente, tamaño y color.",
    },
    midBannerTitle: {
      label: "Título del Banner Editorial",
      defaultText: "Hecho para durar",
      previewBaseStyle: { fontWeight: 400, fontFamily: "Georgia, serif" },
    },
    sectionTitle2: {
      label: 'Título "Destacados"',
      defaultText: "Destacados",
      previewBaseStyle: { fontWeight: 400, fontFamily: "Georgia, serif" },
    },
    footerHeading1: {
      label: "Footer — Nosotros",
      defaultText: "Nosotros",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
    footerAbout: {
      label: "Texto 'Nosotros' del Footer",
      defaultText: "Una selección curada de esenciales minimalistas para el estilo de vida moderno.",
      previewBaseStyle: { fontWeight: 300 },
      multiline: true,
    },
    footerHeading2: {
      label: "Footer — Contacto",
      defaultText: "Contacto",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
    footerHeading3: {
      label: "Footer — Síguenos",
      defaultText: "Síguenos",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
  },
  sectionBgs: {
    navbar: "Barra de menú",
    section1: "Área de productos",
    section2: "Destacados",
    footer: "Footer",
  },
};

/** Simple Live — deportiva/bold: hero panorámico, carrusel, mid-banner gigante. */
const SIMPLE_LIVE_CONFIG: TemplateEditorConfig = {
  elements: {
    title: {
      label: "Título del Héroe",
      defaultText: "Para Nuestros Atletas Híbridos",
      previewBaseStyle: { fontWeight: 800, textTransform: "uppercase" },
    },
    message: {
      label: "Mensaje del Héroe",
      defaultText: "Cuando lo das todo, tu equipo también debería hacerlo. Echa un vistazo a nuestros estilos más queridos.",
      previewBaseStyle: { fontWeight: 500 },
      multiline: true,
    },
    cta1: {
      label: "Botón del Héroe",
      defaultText: "TIENDA",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" },
      isButton: true,
    },
    navMenu: {
      label: "Menú de categorías",
      defaultText: "Mujer • Hombre • Kids",
      previewBaseStyle: { fontWeight: 600, textTransform: "uppercase" },
      hideText: true,
      hidePreview: true,
      infoText: NAV_MENU_INFO,
    },
    sectionTitle1: {
      label: 'Título "Recién Llegados"',
      defaultText: "Recién Llegados",
      previewBaseStyle: { fontWeight: 800, textTransform: "uppercase" },
    },
    sectionLink1: {
      label: 'Link "Ver todo"',
      defaultText: "Ver todo",
      previewBaseStyle: { fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "4px" },
    },
    midBannerCta: {
      label: "Botón del Banner Central",
      defaultText: "Ver Colección",
      previewBaseStyle: { fontWeight: 700 },
      isButton: true,
    },
    sectionTitle2: {
      label: 'Título "Popular en este momento"',
      defaultText: "Popular en este momento",
      previewBaseStyle: { fontWeight: 800, textTransform: "uppercase" },
    },
    footerHeading1: {
      label: "Footer — Contacto",
      defaultText: "Contacto",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
    footerHeading2: {
      label: "Footer — Ubicación",
      defaultText: "Ubicación",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
    footerHeading3: {
      label: "Footer — Síguenos",
      defaultText: "Síguenos",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
  },
  sectionBgs: {
    navbar: "Barra de menú",
    section1: "Recién Llegados",
    section2: "Popular en este momento",
    footer: "Footer",
  },
};

/** Nature & Earth — orgánica/serif: hero full-bleed, tabs por categoría, collage "Nuestra Historia". */
const NATURE_CONFIG: TemplateEditorConfig = {
  elements: {
    title: {
      label: "Título del Héroe",
      defaultText: "Nuevos Estilos\nHan Llegado",
      previewBaseStyle: { fontWeight: 700, fontFamily: "Georgia, serif" },
      multiline: true,
    },
    message: {
      label: "Mensaje del Héroe",
      defaultText: "Una nueva paleta de colores diseñada para el cambio de temporada—fácil de combinar ahora, perfecta para cualquier ocasión.",
      previewBaseStyle: { fontWeight: 400 },
      multiline: true,
    },
    cta1: {
      label: "Botón principal del Héroe",
      defaultText: "VER CATÁLOGO",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
      isButton: true,
    },
    cta2: {
      label: "Botón secundario del Héroe",
      defaultText: "NOVEDADES",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
      isButton: true,
    },
    navMenu: {
      label: "Menú de categorías",
      defaultText: "Mujer • Hombre • Accesorios",
      previewBaseStyle: { fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },
      hideText: true,
      hidePreview: true,
      infoText: NAV_MENU_INFO,
    },
    sectionTitle1: {
      label: 'Título "Novedades"',
      defaultText: "Novedades",
      previewBaseStyle: { fontWeight: 700, fontFamily: "Georgia, serif" },
    },
    featureTitle: {
      label: "Título de 'Nuestra Historia'",
      defaultText: "Nuestra Historia",
      previewBaseStyle: { fontWeight: 700, fontFamily: "Georgia, serif" },
    },
    featureSubtitle: {
      label: "Subtítulo de 'Nuestra Historia'",
      defaultText: "Comprometidos con el planeta",
      previewBaseStyle: { fontWeight: 400 },
    },
    featureDescription: {
      label: "Texto de 'Nuestra Historia'",
      defaultText: "Tenemos la misión de crear productos de calidad con responsabilidad ambiental. Cada compra contribuye a un mundo mejor para las generaciones futuras.",
      previewBaseStyle: { fontWeight: 400 },
      multiline: true,
    },
    featureCta1: {
      label: "Botón 1 de 'Nuestra Historia'",
      defaultText: "VER CATÁLOGO",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
      isButton: true,
    },
    featureCta2: {
      label: "Botón 2 de 'Nuestra Historia'",
      defaultText: "NOVEDADES",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
      isButton: true,
    },
    footerHeading1: {
      label: "Footer — Tienda",
      defaultText: "Tienda",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
    footerHeading2: {
      label: "Footer — Soporte",
      defaultText: "Soporte",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
  },
  sectionBgs: {
    navbar: "Barra de menú",
    section1: "Novedades",
    section2: "Nuestra Historia",
    footer: "Footer",
  },
};

/**
 * Registry by template_id. Templates are added as they reach Indico level
 * (Partes 1-9); missing ids fall back to the Indico config so nothing breaks.
 */
/** Premium Brand — alta conversión: olas, testimonios, tarjetas de categoría. */
const PREMIUM_BRAND_CONFIG: TemplateEditorConfig = {
  elements: {
    title: {
      label: "Título del Héroe",
      defaultText: "Calidad excepcional en cada detalle.\nDescubre nuestra nueva colección.",
      previewBaseStyle: { fontWeight: 700 },
      multiline: true,
    },
    message: {
      label: "Mensaje del Héroe",
      defaultText: "Conoce más",
      previewBaseStyle: { fontWeight: 400 },
      multiline: true,
    },
    cta1: {
      label: "Botón principal",
      defaultText: "Comprar Ahora",
      previewBaseStyle: { fontWeight: 700 },
      isButton: true,
    },
    cta2: {
      label: "Botón secundario",
      defaultText: "Ver Catálogo",
      previewBaseStyle: { fontWeight: 700 },
      isButton: true,
    },
    navMenu: {
      label: "Menú de categorías",
      defaultText: "Productos • Colección",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" },
      hideText: true,
      hidePreview: true,
      infoText: NAV_MENU_INFO,
    },
    headerCta: {
      label: 'Botón "VER TODO" del menú',
      defaultText: "VER TODO",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase" },
      isButton: true,
    },
    sectionTitle1: {
      label: 'Título "¿Qué estás buscando?"',
      defaultText: "¿Qué estás buscando?",
      previewBaseStyle: { fontWeight: 700 },
    },
    sectionTitle2: {
      label: 'Título "Productos más vendidos"',
      defaultText: "Productos más vendidos",
      previewBaseStyle: { fontWeight: 700 },
    },
    sectionTitle3: {
      label: 'Título "Productos"',
      defaultText: "Productos",
      previewBaseStyle: { fontWeight: 700 },
    },
    footerHeading1: {
      label: "Footer — Tienda",
      defaultText: "Tienda",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
    footerHeading2: {
      label: "Footer — Soporte",
      defaultText: "Soporte",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
    footerHeading3: {
      label: "Footer — Síguenos",
      defaultText: "Síguenos",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
  },
  sectionBgs: {
    navbar: "Barra de menú",
    section1: "¿Qué estás buscando? (categorías)",
    section2: "Productos más vendidos",
    section3: "Productos",
    footer: "Footer",
  },
};

/** Default — plantilla utilitaria: carrusel de banners + carruseles de categorías.
 * No tiene hero editorial de textos; solo se expone el fondo de la barra de menú. */
const DEFAULT_CONFIG: TemplateEditorConfig = {
  elements: {
    searchBar: {
      label: "Buscador",
      defaultText: "Buscar productos...",
      previewBaseStyle: { fontWeight: 400 },
      infoText: "Texto de ayuda dentro de la barra de búsqueda.",
    },
    viewMore: {
      label: 'Enlace "Ver más"',
      defaultText: "Ver más",
      previewBaseStyle: { fontWeight: 500 },
      infoText: "Aparece a la derecha de cada título de sección.",
    },
  },
  sectionBgs: {
    navbar: "Barra de menú",
    section1: "Área de productos",
    footer: "Footer",
  },
};

/** Bauhaus — editorial geométrico: grid asimétrico, manifiesto, primarios. */
const BAUHAUS_CONFIG: TemplateEditorConfig = {
  elements: {
    heroNumber: {
      label: 'Número grande "01" del Héroe',
      defaultText: "01",
      previewBaseStyle: { fontWeight: 900 },
      canHide: true,
    },
    title: {
      label: "Título del Héroe",
      defaultText: "FORMA\nSIGUE\nFUNCIÓN",
      previewBaseStyle: { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em" },
      multiline: true,
    },
    message: {
      label: "Mensaje del Héroe",
      defaultText: "Una colección curada de piezas esenciales. Geometría, color, propósito.",
      previewBaseStyle: { fontWeight: 400 },
      multiline: true,
    },
    cta1: {
      label: "Botón del Héroe",
      defaultText: "Explorar colección →",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
      isButton: true,
    },
    navMenu: {
      label: "Menú de categorías",
      defaultText: "Tienda • Colección • Diario",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase" },
      hideText: true,
      hidePreview: true,
      infoText: NAV_MENU_INFO,
    },
    sectionTitle1: {
      label: 'Título "Selección"',
      defaultText: "Selección",
      previewBaseStyle: { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em" },
    },
    manifesto1: {
      label: "Manifiesto — Bloque 1",
      defaultText: "Menos pero mejor",
      previewBaseStyle: { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em" },
    },
    manifesto2: {
      label: "Manifiesto — Bloque 2",
      defaultText: "Diseño honesto",
      previewBaseStyle: { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.05em" },
    },
    footerHeading1: {
      label: "Footer — Tienda",
      defaultText: "Tienda",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
    footerHeading2: {
      label: "Footer — Contacto",
      defaultText: "Contacto",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
    footerHeading3: {
      label: "Footer — Legal",
      defaultText: "Legal",
      previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" },
    },
  },
  sectionBgs: {
    navbar: "Barra de menú",
    hero: "Héroe",
    section1: "Selección (productos)",
    section2: "Manifiesto",
    footer: "Footer",
  },
};

/** Cyber — modo oscuro neón: hero con stats, newsletter, footer monospace. */
const NEON_TITLE = { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em" } as React.CSSProperties;
const NEON_HEADING = { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" } as React.CSSProperties;
const CYBER_CONFIG: TemplateEditorConfig = {
  elements: {
    heroBadge: { label: 'Badge "SYSTEM ONLINE"', defaultText: "SYSTEM ONLINE", previewBaseStyle: NEON_HEADING, canHide: true },
    title: { label: "Título del Héroe", defaultText: "FUTURO\nDIGITAL.\nDISEÑADO\nHOY.", previewBaseStyle: NEON_TITLE, multiline: true },
    message: { label: "Mensaje del Héroe", defaultText: "Productos del mañana. Tecnología que se adelanta. Bienvenido al perímetro.", previewBaseStyle: { fontWeight: 400 }, multiline: true },
    cta1: { label: "Botón principal", defaultText: "Explorar drops", previewBaseStyle: NEON_HEADING, isButton: true },
    cta2: { label: "Botón secundario", defaultText: "Ver catálogo", previewBaseStyle: NEON_HEADING, isButton: true },
    navMenu: { label: "Menú de categorías", defaultText: "Catálogo • Drops • Tech", previewBaseStyle: NEON_HEADING, hideText: true, hidePreview: true, infoText: NAV_MENU_INFO },
    stat1: { label: "Stat 1 — valor (24/7)", defaultText: "24/7", previewBaseStyle: { fontWeight: 900 }, canHide: true },
    statLabel1: { label: "Stat 1 — etiqueta", defaultText: "Soporte", previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" } },
    stat2: { label: "Stat 2 — valor (100%)", defaultText: "100%", previewBaseStyle: { fontWeight: 900 } },
    statLabel2: { label: "Stat 2 — etiqueta", defaultText: "Garantía", previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" } },
    stat3: { label: "Stat 3 — valor (FAST)", defaultText: "FAST", previewBaseStyle: { fontWeight: 900 } },
    statLabel3: { label: "Stat 3 — etiqueta", defaultText: "Envíos", previewBaseStyle: { fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" } },
    sectionEyebrow1: { label: 'Etiqueta sobre "Drops activos"', defaultText: "PRODUCTS", previewBaseStyle: NEON_HEADING, canHide: true },
    sectionTitle1: { label: 'Título "Drops activos"', defaultText: "Drops activos", previewBaseStyle: NEON_TITLE },
    newsletterTitle: { label: "Título del Newsletter", defaultText: "Sé el primero en saber.", previewBaseStyle: NEON_TITLE, canHide: true },
    newsletterText: { label: "Texto del Newsletter", defaultText: "Drops exclusivos. Ofertas anticipadas. Cero spam.", previewBaseStyle: { fontWeight: 400 }, multiline: true },
    sectionEyebrow3: { label: 'Etiqueta sobre "Otros productos"', defaultText: "MÁS", previewBaseStyle: NEON_HEADING, canHide: true },
    sectionTitle3: { label: 'Título "Otros productos"', defaultText: "También te puede interesar", previewBaseStyle: NEON_TITLE },
    footerHeading1: { label: "Footer — Tienda", defaultText: "// Tienda", previewBaseStyle: NEON_HEADING },
    footerHeading2: { label: "Footer — Contacto", defaultText: "// Contacto", previewBaseStyle: NEON_HEADING },
    footerHeading3: { label: "Footer — Legal", defaultText: "// Legal", previewBaseStyle: NEON_HEADING },
  },
  sectionBgs: {
    navbar: "Barra de menú",
    hero: "Héroe",
    section1: "Productos (Drops)",
    section2: "Banner",
    section3: "Otros productos",
    footer: "Footer",
  },
};

export const TEMPLATE_EDITOR_CONFIG: Record<string, TemplateEditorConfig> = {
  fashion_hero: FASHION_HERO_CONFIG,
  trendy_fashion: TRENDY_FASHION_CONFIG,
  fashion: FASHION_CONFIG,
  minimal: MINIMAL_CONFIG,
  simple_live: SIMPLE_LIVE_CONFIG,
  nature: NATURE_CONFIG,
  premium_brand: PREMIUM_BRAND_CONFIG,
  default: DEFAULT_CONFIG,
  bauhaus: BAUHAUS_CONFIG,
  cyber: CYBER_CONFIG,
};

export const getTemplateEditorConfig = (templateId?: string | null): TemplateEditorConfig =>
  TEMPLATE_EDITOR_CONFIG[templateId || ""] ?? FASHION_HERO_CONFIG;
