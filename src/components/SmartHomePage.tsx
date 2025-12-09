import React from 'react';
import { useTenantByDomain } from '@/hooks/useTenantByDomain';
import Index from '@/pages/Index';
import Tienda from '@/pages/Tienda';

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
    const isPreviewDomain = hostname.includes('lovableproject.com') || hostname.includes('lovable.app') || hostname.includes('localhost');
    if (isPreviewDomain && isLoading) {
      const timeout = setTimeout(() => {
        console.log('⏰ [SmartHomePage] Timeout alcanzado - mostrando Index como fallback');
        setFallbackToIndex(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, hostname]);
  
  // Show loading state (with fallback)
  if (isLoading && !fallbackToIndex) {
    console.log('⏳ [SmartHomePage] Mostrando loading state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  // Main TOOGO domain should show landing page
  if (hostname === 'toogo.store' || hostname === 'www.toogo.store') {
    console.log('🏠 [SmartHomePage] Dominio principal detectado - mostrando Index (landing)');
    return <Index />;
  }
  
  // Lovable preview domains - show Tienda for /tienda, Index for everything else
  if (hostname.includes('lovableproject.com') || hostname.includes('lovable.app') || hostname.includes('localhost')) {
    if (pathname === '/tienda') {
      console.log('🏪 [SmartHomePage] Dominio de preview con /tienda - mostrando Tienda (demo)');
      return <Tienda />;
    } else {
      console.log('🏠 [SmartHomePage] Dominio de preview - mostrando Index (landing) (fallback:', fallbackToIndex, ')');
      return <Index />;
    }
  }
  
  // For any other domain (subdomain or purchased domains)
  // Let Tienda component handle whether the store exists or not
  console.log('🏪 [SmartHomePage] Dominio no principal - mostrando Tienda (resolverá existencia internamente)');
  return <Tienda />;
};