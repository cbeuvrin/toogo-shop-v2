import React, { Suspense } from 'react';
import { useTenantByDomain } from '@/hooks/useTenantByDomain';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

// Lazy: la landing y la tienda NO deben viajar juntas en el chunk inicial.
// Tienda arrastra las 10 plantillas (~cientos de KB) y la landing no la usa;
// era la mayor parte del "JS sin usar" que marcaba PageSpeed en '/'.
const LandingNueva = React.lazy(() => import('@/pages/LandingNueva'));
const Tienda = React.lazy(() => import('@/pages/Tienda'));

export const SmartHomePage = () => {
  const { tenant, isLoading, error } = useTenantByDomain();
  const [fallbackToIndex, setFallbackToIndex] = React.useState(false);

  // Get current hostname and pathname
  const hostname = window.location.hostname;
  const pathname = window.location.pathname.replace(/\/$/, '');

  console.log('🏠 [SmartHomePage] Estado actual:', {
    hostname,
    pathname,
    tenant: tenant ? { id: tenant.id, name: tenant.name, primary_host: tenant.primary_host } : null,
    isLoading,
    error,
    fallbackToIndex,
    timestamp: new Date().toISOString()
  });

  // Fallback timeout for preview domains (aumentado para conexiones lentas)
  React.useEffect(() => {
    const isPreviewDomain = hostname.includes('lovableproject.com') || hostname.includes('lovable.app') || hostname.includes('localhost') || hostname.includes('vercel.app');
    if (isPreviewDomain && isLoading) {
      const timeout = setTimeout(() => {
        console.log('⏰ [SmartHomePage] Timeout alcanzado - mostrando Index como fallback');
        setFallbackToIndex(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, hostname]);

  // Main TOOGO domain or Vercel preview should show landing page IMMEDIATELY
  // avoiding waiting for useTenantByDomain loading state
  if (hostname === 'toogo.store' || hostname === 'www.toogo.store' || hostname.includes('vercel.app')) {
    // Exception: /tienda on vercel should show Tienda (demo)
    if (hostname.includes('vercel.app') && pathname === '/tienda') {
      console.log('🏪 [SmartHomePage] Vercel preview con /tienda - mostrando Tienda (demo)');
      return <Suspense fallback={<LoadingScreen />}><Tienda /></Suspense>;
    }
    console.log('🏠 [SmartHomePage] Dominio principal/preview detectado - mostrando Index (landing)');
    return <Suspense fallback={<LoadingScreen />}><LandingNueva /></Suspense>;
  }

  // Show loading state (with fallback)
  if (isLoading && !fallbackToIndex) {
    console.log('⏳ [SmartHomePage] Mostrando loading state (Custom Animation)');
    return <LoadingScreen />;
  }

  // Lovable preview domains - show Tienda for /tienda, Index for everything else
  if (hostname.includes('lovableproject.com') || hostname.includes('lovable.app') || hostname.includes('localhost') || hostname.includes('vercel.app')) {
    if (pathname === '/tienda') {
      console.log('🏪 [SmartHomePage] Dominio de preview con /tienda - mostrando Tienda (demo)');
      return <Suspense fallback={<LoadingScreen />}><Tienda /></Suspense>;
    } else {
      console.log('🏠 [SmartHomePage] Dominio de preview - mostrando Index (landing) (fallback:', fallbackToIndex, ')');
      return <Suspense fallback={<LoadingScreen />}><LandingNueva /></Suspense>;
    }
  }

  // For any other domain (subdomain or purchased domains)
  // Let Tienda component handle whether the store exists or not
  console.log('🏪 [SmartHomePage] Dominio no principal - mostrando Tienda (resolverá existencia internamente)');
  return <Suspense fallback={<LoadingScreen />}><Tienda /></Suspense>;
};