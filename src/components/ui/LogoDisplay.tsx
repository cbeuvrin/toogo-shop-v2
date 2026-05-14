import { useMemo } from 'react';
import { useTenantSettings } from '@/hooks/useTenantSettings';

interface LogoDisplayProps {
  className?: string;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg';
  customSize?: number;
  tenantId?: string;
  subtleShadow?: boolean;
  logoUrl?: string;
  logoSize?: number;
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
  disableFetch = false,
}: LogoDisplayProps) => {
  // Only fetch from settings hook when:
  // 1. No logo URL was explicitly provided as prop
  // 2. No logo size was explicitly provided as prop
  // 3. The caller doesn't disable the fetch (e.g. public store templates)
  const shouldFetchSettings = !propLogoUrl && !propLogoSize && !disableFetch;
  const { settings, isLoading } = useTenantSettings(shouldFetchSettings ? tenantId : undefined);

  // Calculate dynamic height based on logo_size from settings or props
  const logoHeight = useMemo(() => {
    if (customSize) return customSize;
    if (propLogoSize) return propLogoSize * 16; // 1-10 scale to 16-160px
    if (settings?.logo_size && shouldFetchSettings) {
      return settings.logo_size * 16;
    }
    // Default heights if no logo_size is set
    const defaultHeights = { sm: 32, md: 48, lg: 64 };
    return defaultHeights[size];
  }, [settings?.logo_size, propLogoSize, size, customSize, shouldFetchSettings]);

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