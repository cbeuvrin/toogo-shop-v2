// Helpers puros del wizard "Diséñala con IA". Sin imports con red para que
// `deno test` corra offline (designTools.ts tampoco tiene).
import { TEMPLATE_NAMES } from './designTools.ts';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_B64 = 6_000_000; // ≈ 4.5 MB reales

export interface InspirationInput {
  tenantId?: string;
  imageBase64?: string;
  mimeType?: string;
  description?: string;
}

/** null = entrada válida; string = mensaje de error para el usuario. */
export function validateInspirationInput(b: InspirationInput): string | null {
  if (!b?.tenantId) return 'tenantId es requerido';
  const hasImg = typeof b.imageBase64 === 'string' && b.imageBase64.length > 0;
  const hasDesc = typeof b.description === 'string' && b.description.trim().length > 0;
  if (!hasImg && !hasDesc) return 'Sube una captura o escribe una descripción';
  if (hasImg) {
    if (!ALLOWED_IMAGE_TYPES.includes(b.mimeType ?? '')) {
      return 'Formato de imagen no soportado (usa JPG, PNG o WebP)';
    }
    if (b.imageBase64!.length > MAX_IMAGE_B64) {
      return 'La imagen es muy pesada (máximo ~4 MB)';
    }
  }
  return null;
}

// Tags reales de cada plantilla (src/lib/templatesCatalog.ts) para que el
// modelo elija la base correcta según el mood de la inspiración.
const TEMPLATE_TAGS: Record<string, string> = {
  default: 'versátil, clásico',
  simple_live: 'deporte, dinámico, moderno',
  minimal: 'lujo, moda',
  fashion: 'moda, editorial, moderno',
  fashion_hero: 'moda, hero con foto grande, layout dividido',
  trendy_fashion: 'moda, elegante, premium',
  nature: 'ecológico, outdoor, limpio',
  premium_brand: 'premium, café, oscuro',
  bauhaus: 'editorial, arte, geométrico',
  cyber: 'tech, dark, neón',
};

export function buildInspirationPrompt(description?: string): string {
  const catalogo = Object.entries(TEMPLATE_NAMES)
    .map(([id, nombre]) => `- ${id} ("${nombre}"): ${TEMPLATE_TAGS[id] ?? ''}`)
    .join('\n');
  return `Eres el director de arte de TOOGO, una plataforma mexicana de tiendas en línea.
Tu trabajo: a partir de la inspiración del usuario (una captura de una tienda que le gusta y/o una descripción de su negocio), proponer 2 o 3 TEMAS distintos entre sí para SU tienda.

Catálogo de plantillas disponibles (elige templateId de esta lista, nada más):
${catalogo}

${description?.trim() ? `Descripción del usuario sobre su negocio/estilo: "${description.trim()}"\n` : ''}Reglas:
- La captura es INSPIRACIÓN de paleta, mood y estilo. NO copies textos, nombres, logos ni marcas que aparezcan en ella.
- Colores en hex #RRGGBB. background debe ser legible como fondo de página; navbar debe contrastar con el contenido.
- Las 2-3 propuestas deben sentirse diferentes (p. ej. una fiel a la inspiración, una más sobria, una más atrevida).
- announcementText y tickerText: frases cortas de venta en español neutro, escritas para la tienda del usuario (ej. "Envío gratis en pedidos desde $500"). Omítelas si no aportan.
- name: nombre corto y atractivo del tema en español. rationale: UNA frase de por qué le va a su marca.
Responde ÚNICAMENTE llamando la herramienta propose_store_themes.`;
}
