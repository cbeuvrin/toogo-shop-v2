// Name shown in the footer copyright. Prefers the store's configured name; if
// it isn't set, falls back to the store's own domain (e.g. "www.choeventos.com")
// instead of a generic "Tu Tienda".
export function storeDisplayName(settings?: any): string {
  const name = settings?.store_name?.trim?.();
  if (name) return name;
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return 'Tu Tienda';
}
