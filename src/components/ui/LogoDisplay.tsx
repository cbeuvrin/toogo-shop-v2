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
}

export const LogoDisplay = ({ 
  className = '', 
  fallbackText = 'Tu Logo',
  size = 'md',
  customSize,
  tenantId,
  subtleShadow = true,
  logoUrl: propLogoUrl,
  logoSize: propLogoSize
}: LogoDisplayProps) => {
  const shouldFetchSettings = !propLogoUrl && !propLogoSize;
  const { settings, isLoading } = useTenantSettings(shouldFetchSettings ? tenantId : undefined);

  // Calculate dynamic height based on logo_size from settings or props
  const logoHeight = useMemo(() => {
    if (customSize) return customSize;
    if (propLogoSize) return propLogoSize * 16; // 1-10 scale to 16-160px
    if (settings?.logo_size) {
      return settings.logo_size * 16; // 1-10 scale to 16-160px
    }
    // Default heights if no logo_size is set
    const defaultHeights = { sm: 32, md: 48, lg: 64 };
    return defaultHeights[size];
  }, [settings?.logo_size, propLogoSize, size, customSize]);

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

  const finalLogoUrl = propLogoUrl || settings?.logo_url;

  if (finalLogoUrl) {
    console.log('Rendering LogoDisplay with URL:', finalLogoUrl);
    return (
      <div className="flex items-center">
        <img 
          src={finalLogoUrl} 
          alt="Logo"
          style={{ height: `${logoHeight}px` }}
          className={`w-auto object-contain ${subtleShadow ? 'drop-shadow-sm' : ''} ${className}`}
          onError={(e) => {
            console.error('Logo failed to load:', finalLogoUrl);
            console.error('Showing fallback text:', fallbackText);
            // Hide the image and show fallback
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const container = target.parentElement;
            const fallbackDiv = container?.querySelector('.logo-fallback') as HTMLElement;
            if (fallbackDiv) {
              fallbackDiv.style.display = 'flex';
            }
          }}
          onLoad={() => {
            console.log('Logo loaded successfully:', finalLogoUrl);
          }}
        />
        <div 
          className="logo-fallback flex items-center justify-center bg-primary/10 text-primary rounded font-semibold"
          style={{ display: 'none', height: `${logoHeight}px` }}
        >
          {fallbackText}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center justify-center bg-primary/10 text-primary rounded font-semibold ${className}`}
      style={{ height: `${logoHeight}px` }}
    >
      {fallbackText}
    </div>
  );
};