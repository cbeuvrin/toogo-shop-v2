import { useMemo, useEffect, useState } from 'react';
import { useTenantSettings } from '@/hooks/useTenantSettings';

interface LogoDisplayProps {
  className?: string;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg';
  customSize?: number;
  tenantId?: string;
  subtleShadow?: boolean;
  logoUrl?: string;
  logoSize?: number;          // desktop / fallback
  logoSizeMobile?: number;    // <768px override
  logoSizeTablet?: number;    // 768–1023px override
  /** Force a viewport mode (editor preview). Overrides window width. */
  forceDevice?: 'desktop' | 'tablet' | 'mobile';
  /**
   * When true, disables the internal useTenantSettings fetch.
   * Use this in public store templates where logo data already comes
   * from the store's RPC call — prevents cross-tenant logo leakage.
   */
  disableFetch?: boolean;
}

export const LogoDisplay = ({
  className = '',
  fallbackText = 'LOGO',
  size = 'md',
  customSize,
  tenantId,
  subtleShadow = true,
  logoUrl: propLogoUrl,
  logoSize: propLogoSize,
  logoSizeMobile,
  logoSizeTablet,
  forceDevice,
  disableFetch = false,
}: LogoDisplayProps) => {
  const shouldFetchSettings = !propLogoUrl && !propLogoSize && !disableFetch;
  const { settings, isLoading } = useTenantSettings(shouldFetchSettings ? tenantId : undefined);

  // Track viewport width so we can swap between per-device logo sizes live.
  const [vw, setVw] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Pick the right size for the current device. forceDevice (editor preview)
  // overrides the actual window width; otherwise we read window.innerWidth.
  const logoHeight = useMemo(() => {
    if (customSize) return customSize;
    const device = forceDevice
      ?? (vw < 768 ? 'mobile' : vw < 1024 ? 'tablet' : 'desktop');
    const settingsSize = settings?.logo_size;
    const settingsSizeMobile = (settings as any)?.logo_size_mobile;
    const settingsSizeTablet = (settings as any)?.logo_size_tablet;
    const pickFromProps = device === 'mobile'
      ? (logoSizeMobile ?? propLogoSize)
      : device === 'tablet'
        ? (logoSizeTablet ?? propLogoSize)
        : propLogoSize;
    if (pickFromProps) return pickFromProps * 16;
    if (shouldFetchSettings) {
      const pickFromSettings = device === 'mobile'
        ? (settingsSizeMobile ?? settingsSize)
        : device === 'tablet'
          ? (settingsSizeTablet ?? settingsSize)
          : settingsSize;
      if (pickFromSettings) return pickFromSettings * 16;
    }
    const defaultHeights = { sm: 32, md: 48, lg: 64 };
    return defaultHeights[size];
  }, [settings?.logo_size, (settings as any)?.logo_size_mobile, (settings as any)?.logo_size_tablet, propLogoSize, logoSizeMobile, logoSizeTablet, forceDevice, vw, size, customSize, shouldFetchSettings]);

  if (isLoading && shouldFetchSettings) {
    return (
      <div
        className={`bg-muted animate-pulse rounded ${className}`}
        style={{ height: `${logoHeight}px` }}
      >
        <div className="w-full h-full bg-muted-foreground/20 rounded"></div>
      </div>
    );
  }

  // When disableFetch is true, ONLY use the prop — never fall through to settings
  const finalLogoUrl = disableFetch
    ? propLogoUrl || undefined
    : propLogoUrl || settings?.logo_url;

  if (finalLogoUrl) {
    return (
      <div className="flex items-center">
        <img
          src={finalLogoUrl}
          alt="Logo"
          style={{ height: `${logoHeight}px` }}
          className={`w-auto object-contain ${subtleShadow ? 'drop-shadow-sm' : ''} ${className}`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const container = target.parentElement;
            const fallbackDiv = container?.querySelector('.logo-fallback') as HTMLElement;
            if (fallbackDiv) {
              fallbackDiv.style.display = 'flex';
            }
          }}
        />
        <div
          className="logo-fallback flex items-center justify-center font-bold tracking-widest uppercase"
          style={{ display: 'none', height: `${logoHeight}px`, fontSize: `${Math.round(logoHeight * 0.55)}px` }}
        >
          {fallbackText}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center font-bold tracking-widest uppercase ${className}`}
      style={{ height: `${logoHeight}px`, fontSize: `${Math.round(logoHeight * 0.55)}px` }}
    >
      {fallbackText}
    </div>
  );
};