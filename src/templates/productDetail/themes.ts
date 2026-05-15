/**
 * Per-template design tokens for the public ProductDetail page.
 * Keys map to the `template_id` saved in tenant_settings.
 *
 * Adding a new template? Add an entry here AND fall through to `default`
 * if you want the same neutral look.
 */

export type ProductDetailTheme = {
  // Page chrome
  pageBg: string;          // outer background
  surfaceBg: string;       // card/section background
  borderColor: string;     // dividers and outlines
  // Text
  fontFamily: string;      // tailwind utility class on the root
  textPrimary: string;     // body/headline color
  textSecondary: string;   // muted text
  textAccent: string;      // sale tag, highlights
  // Layout
  containerMaxWidth: string;
  galleryAspect: string;   // tailwind aspect class
  // Heading typography
  headingFont: string;     // tailwind family class for h1
  headingScale: string;    // tailwind text size classes for h1
  // Buttons
  buttonPrimary: string;       // full class for primary CTA
  buttonSecondary: string;     // full class for secondary CTA
  buttonRadius: string;
  // Header style
  headerBg: string;        // top bar background
  headerBorder: string;    // border-b class
  // Sale/discount badge
  saleBg: string;
  saleText: string;
};

const DEFAULT_THEME: ProductDetailTheme = {
  pageBg: 'bg-white',
  surfaceBg: 'bg-gray-50',
  borderColor: 'border-gray-200',
  fontFamily: 'font-sans',
  textPrimary: 'text-gray-900',
  textSecondary: 'text-gray-600',
  textAccent: 'text-red-600',
  containerMaxWidth: 'max-w-7xl',
  galleryAspect: 'aspect-square',
  headingFont: 'font-sans',
  headingScale: 'text-2xl md:text-3xl lg:text-4xl',
  buttonPrimary: 'bg-gray-900 text-white hover:bg-gray-800 rounded-md',
  buttonSecondary: 'border border-gray-900 text-gray-900 hover:bg-gray-50 rounded-md bg-transparent',
  buttonRadius: 'rounded-md',
  headerBg: 'bg-white',
  headerBorder: 'border-b border-gray-200',
  saleBg: 'bg-red-500',
  saleText: 'text-white',
};

export const PRODUCT_DETAIL_THEMES: Record<string, ProductDetailTheme> = {
  default: DEFAULT_THEME,

  simple_live: {
    ...DEFAULT_THEME,
    fontFamily: 'font-sans',
    textPrimary: 'text-black',
    headingFont: 'font-sans',
    headingScale: 'text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight',
    buttonPrimary: 'bg-black text-white hover:bg-gray-900 rounded-none uppercase tracking-widest text-xs font-bold',
    buttonSecondary: 'border-2 border-black text-black hover:bg-black hover:text-white rounded-none uppercase tracking-widest text-xs font-bold bg-transparent',
    buttonRadius: 'rounded-none',
  },

  minimal: {
    ...DEFAULT_THEME,
    pageBg: 'bg-white',
    fontFamily: 'font-sans',
    headingFont: 'font-serif',
    headingScale: 'text-3xl md:text-4xl lg:text-5xl font-serif tracking-tighter',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-500',
    buttonPrimary: 'bg-gray-900 text-white hover:bg-black rounded-none tracking-wide',
    buttonSecondary: 'border border-gray-900 text-gray-900 hover:bg-gray-100 rounded-none tracking-wide bg-transparent',
    buttonRadius: 'rounded-none',
    galleryAspect: 'aspect-[3/4]',
  },

  fashion: {
    ...DEFAULT_THEME,
    headingFont: 'font-serif',
    headingScale: 'text-3xl md:text-4xl lg:text-5xl font-serif italic',
    buttonPrimary: 'bg-black text-white hover:bg-gray-900 rounded-full uppercase tracking-wider text-sm',
    buttonSecondary: 'border-2 border-black text-black hover:bg-black hover:text-white rounded-full uppercase tracking-wider text-sm bg-transparent',
    buttonRadius: 'rounded-full',
    galleryAspect: 'aspect-[3/4]',
  },

  fashion_hero: {
    ...DEFAULT_THEME,
    headingFont: 'font-serif',
    headingScale: 'text-3xl md:text-4xl lg:text-5xl font-serif',
    buttonPrimary: 'bg-black text-white hover:bg-gray-900 rounded-none',
    buttonSecondary: 'border border-black text-black hover:bg-black hover:text-white rounded-none bg-transparent',
    buttonRadius: 'rounded-none',
    galleryAspect: 'aspect-[3/4]',
  },

  trendy_fashion: {
    pageBg: 'bg-[#e8f0ef]',
    surfaceBg: 'bg-white',
    borderColor: 'border-gray-300',
    fontFamily: 'font-sans',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    textAccent: 'text-red-700',
    containerMaxWidth: 'max-w-7xl',
    galleryAspect: 'aspect-[3/4]',
    headingFont: 'font-serif',
    headingScale: 'text-3xl md:text-4xl lg:text-5xl font-serif font-bold tracking-tight',
    buttonPrimary: 'bg-gray-900 text-white hover:bg-black rounded-full',
    buttonSecondary: 'border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white rounded-full bg-transparent',
    buttonRadius: 'rounded-full',
    headerBg: 'bg-[#e8f0ef]',
    headerBorder: 'border-b border-gray-300',
    saleBg: 'bg-red-600',
    saleText: 'text-white',
  },

  nature: {
    pageBg: 'bg-[#f4f4f0]',
    surfaceBg: 'bg-white',
    borderColor: 'border-[#d8d8d0]',
    fontFamily: 'font-sans',
    textPrimary: 'text-[#1a202c]',
    textSecondary: 'text-gray-600',
    textAccent: 'text-[#9b3b3b]',
    containerMaxWidth: 'max-w-6xl',
    galleryAspect: 'aspect-[3/4]',
    headingFont: 'font-serif',
    headingScale: 'text-3xl md:text-4xl lg:text-5xl font-serif',
    buttonPrimary: 'bg-[#4f6354] text-white hover:bg-[#3d4d41] rounded-none uppercase tracking-widest text-xs font-bold py-4',
    buttonSecondary: 'border-2 border-[#4f6354] text-[#4f6354] hover:bg-[#4f6354] hover:text-white rounded-none uppercase tracking-widest text-xs font-bold py-4 bg-transparent',
    buttonRadius: 'rounded-none',
    headerBg: 'bg-[#f4f4f0]',
    headerBorder: 'border-b border-[#d8d8d0]',
    saleBg: 'bg-[#9b3b3b]',
    saleText: 'text-white',
  },

  premium_brand: {
    pageBg: 'bg-white',
    surfaceBg: 'bg-gray-50',
    borderColor: 'border-gray-200',
    fontFamily: 'font-sans',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    textAccent: 'text-[#e98063]',
    containerMaxWidth: 'max-w-7xl',
    galleryAspect: 'aspect-square',
    headingFont: 'font-sans',
    headingScale: 'text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight',
    buttonPrimary: 'bg-[#023f66] text-white hover:bg-[#012a45] rounded-full',
    buttonSecondary: 'border-2 border-[#023f66] text-[#023f66] hover:bg-[#023f66] hover:text-white rounded-full bg-transparent',
    buttonRadius: 'rounded-full',
    headerBg: 'bg-white',
    headerBorder: 'border-b border-gray-200',
    saleBg: 'bg-[#e98063]',
    saleText: 'text-white',
  },

  bauhaus: {
    pageBg: 'bg-[#FEFAE0]',
    surfaceBg: 'bg-white',
    borderColor: 'border-[#0A0A0A]',
    fontFamily: 'font-sans',
    textPrimary: 'text-[#0A0A0A]',
    textSecondary: 'text-gray-700',
    textAccent: 'text-[#E63946]',
    containerMaxWidth: 'max-w-7xl',
    galleryAspect: 'aspect-square',
    headingFont: 'font-sans',
    headingScale: 'text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none',
    buttonPrimary: 'bg-[#E63946] text-white hover:bg-[#c92e3a] rounded-none uppercase font-bold tracking-wider',
    buttonSecondary: 'border-4 border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white rounded-none uppercase font-bold tracking-wider bg-transparent',
    buttonRadius: 'rounded-none',
    headerBg: 'bg-[#FEFAE0]',
    headerBorder: 'border-b-2 border-[#0A0A0A]',
    saleBg: 'bg-[#003049]',
    saleText: 'text-white',
  },

  cyber: {
    pageBg: 'bg-[#0A0A14]',
    surfaceBg: 'bg-[#13131E]',
    borderColor: 'border-[#2A2A3E]',
    fontFamily: 'font-mono',
    textPrimary: 'text-[#E8E8F0]',
    textSecondary: 'text-[#8888A0]',
    textAccent: 'text-[#00F5FF]',
    containerMaxWidth: 'max-w-7xl',
    galleryAspect: 'aspect-square',
    headingFont: 'font-mono',
    headingScale: 'text-2xl md:text-3xl lg:text-4xl font-mono uppercase tracking-wider',
    buttonPrimary: 'bg-[#00F5FF] text-[#0A0A14] hover:bg-[#00d4dd] rounded-none uppercase font-bold tracking-widest text-xs',
    buttonSecondary: 'border border-[#00F5FF] text-[#00F5FF] hover:bg-[#00F5FF]/10 rounded-none uppercase font-bold tracking-widest text-xs bg-transparent',
    buttonRadius: 'rounded-none',
    headerBg: 'bg-[#0A0A14]/95 backdrop-blur',
    headerBorder: 'border-b border-[#2A2A3E]',
    saleBg: 'bg-[#FF00AA]',
    saleText: 'text-white',
  },
};

export function getProductDetailTheme(templateId?: string | null): ProductDetailTheme {
  if (!templateId) return PRODUCT_DETAIL_THEMES.default;
  return PRODUCT_DETAIL_THEMES[templateId] || PRODUCT_DETAIL_THEMES.default;
}
