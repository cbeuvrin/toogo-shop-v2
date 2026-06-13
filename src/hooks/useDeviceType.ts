import { useEffect, useState } from 'react';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

/** Breakpoints aligned with Tailwind: <768 mobile, 768–1023 tablet, ≥1024 desktop. */
export function deviceFromWidth(w: number): DeviceType {
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Current device type from the real viewport. `force` (the editor's device tab)
 * overrides the actual window width so the preview reflects the simulated device.
 */
export function useDeviceType(force?: DeviceType): DeviceType {
  const [vw, setVw] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return force || deviceFromWidth(vw);
}

/**
 * Resolve the per-device font size for an element style object that may carry
 * `fontSize` (desktop base), `fontSizeTablet` and `fontSizeMobile` overrides.
 * Falls back to the desktop size when a device override isn't set.
 */
export function pickFontSize(
  e: { fontSize?: number; fontSizeTablet?: number; fontSizeMobile?: number } | undefined | null,
  device: DeviceType
): number | undefined {
  if (!e) return undefined;
  if (device === 'mobile') return e.fontSizeMobile ?? e.fontSize;
  if (device === 'tablet') return e.fontSizeTablet ?? e.fontSize;
  return e.fontSize;
}

/**
 * Resolve per-device visibility for an element that may carry `enabled` (desktop
 * base) plus `enabledTablet` / `enabledMobile` overrides. A device override wins;
 * otherwise it inherits the desktop value. Returns undefined when nothing is set
 * (callers treat `!== false` as visible, so undefined = shown).
 */
export function pickEnabled(
  e: { enabled?: boolean; enabledTablet?: boolean; enabledMobile?: boolean } | undefined | null,
  device: DeviceType
): boolean | undefined {
  if (!e) return undefined;
  if (device === 'mobile') return e.enabledMobile ?? e.enabled;
  if (device === 'tablet') return e.enabledTablet ?? e.enabled;
  return e.enabled;
}
