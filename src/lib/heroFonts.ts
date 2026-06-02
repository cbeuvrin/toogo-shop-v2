/**
 * Single source of truth for the per-element hero font picker.
 *
 * Used by both the editor modal (TextStyleEditModal) and the live store
 * render (StorePreview's heroStyleFontFamily) so the preview always matches
 * what the customer sees. Add a font here and it shows up in both places.
 *
 * The named families (Poppins, Oswald, …) are loaded from Google Fonts in
 * index.html — keep that <link> in sync with FONT_OPTIONS.
 */

export interface HeroFontOption {
  value: string;   // token stored in the template data
  label: string;   // shown in the dropdown
  css?: string;    // CSS font-family stack; undefined = inherit (Default)
}

export const HERO_FONT_OPTIONS: HeroFontOption[] = [
  { value: "default", label: "Default (heredar)" },
  // Generic system families
  { value: "sans", label: "Sans-serif", css: "ui-sans-serif, system-ui, sans-serif" },
  { value: "serif", label: "Serif", css: "ui-serif, Georgia, serif" },
  { value: "mono", label: "Monospace", css: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  // Named display/heading fonts (Google Fonts)
  { value: "poppins", label: "Poppins (moderna)", css: "'Poppins', sans-serif" },
  { value: "montserrat", label: "Montserrat (limpia)", css: "'Montserrat', sans-serif" },
  { value: "oswald", label: "Oswald (condensada)", css: "'Oswald', sans-serif" },
  { value: "bebas", label: "Bebas Neue (titular)", css: "'Bebas Neue', sans-serif" },
  { value: "playfair", label: "Playfair Display (elegante)", css: "'Playfair Display', serif" },
  { value: "lobster", label: "Lobster (script)", css: "'Lobster', cursive" },
];

const FONT_CSS_BY_TOKEN: Record<string, string | undefined> = Object.fromEntries(
  HERO_FONT_OPTIONS.map((o) => [o.value, o.css])
);

/** Resolve a stored font token to a CSS font-family stack (undefined = inherit). */
export const heroFontFamily = (token?: string): string | undefined =>
  token ? FONT_CSS_BY_TOKEN[token] : undefined;
