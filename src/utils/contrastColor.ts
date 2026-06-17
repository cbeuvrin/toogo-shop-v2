// Decide whether a background hex color is "light" (so text on it should be dark).
// Used so footer text auto-adapts to the footer background the store owner picks —
// e.g. a white footer gets dark text instead of staying invisible white-on-white.
export function isLightBg(hex?: string | null): boolean {
  if (!hex || typeof hex !== 'string') return false;
  let c = hex.trim().replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return false;
  // Perceived luminance (0–255). >160 ≈ light background.
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}

// Readable footer text colors derived from the footer background.
export function footerTextColors(footerBgHex?: string | null) {
  const light = isLightBg(footerBgHex);
  return {
    light,
    text: light ? '#18181b' : '#ffffff',        // main text
    muted: light ? '#52525b' : '#a1a1aa',       // secondary/muted text
    border: light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)',
  };
}
