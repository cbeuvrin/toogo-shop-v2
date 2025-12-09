// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Tenant {
  id: string;
  name: string;
  primary_host: string;
  extra_hosts: string[];
  plan: 'free' | 'basic' | 'premium' | 'pro';
  status: 'active' | 'pending' | 'cancelled' | 'suspended';
}

interface CachedTenant {
  data: Tenant | null;
  timestamp: number;
  hostname: string;
}

interface GlobalTenantState {
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  hostname: string;
  timestamp: number;
}

const DEMO_STORE_ID = import.meta.env.VITE_DEMO_STORE_ID || '2d62ded6-0745-4ced-abdb-30b7b82e5686';
const CACHE_TTL = 60 * 1000; // 1 minuto en milisegundos (reducido para datos más frescos)
const CACHE_VERSION = 'v3'; // Incrementar cuando cambie la estructura

// Estado global singleton que persiste entre re-mounts
const globalTenantState: GlobalTenantState = {
  tenant: null,
  isLoading: true, // Iniciar en true para mostrar spinner hasta que se resuelva el tenant
  error: null,
  isInitialized: false,
  hostname: '',
  timestamp: 0
};

// Lista de callbacks para notificar cambios a todos los hooks activos
const stateSubscribers: Set<(state: GlobalTenantState) => void> = new Set();

export const useTenantByDomain = () => {
  const [tenant, setTenant] = useState<Tenant | null>(globalTenantState.tenant);
  const [isLoading, setIsLoading] = useState<boolean>(globalTenantState.isLoading);
  const [error, setError] = useState<string | null>(globalTenantState.error);
  const currentHostname = window.location.hostname;

  // Función híbrida para obtener cache (localStorage + sessionStorage + memoria)
  const getCachedTenant = (hostname: string): CachedTenant | null => {
    try {
      const cacheKey = `tenant-cache-${CACHE_VERSION}-${hostname}`;
      let cached = null;
      
      try {
        cached = localStorage.getItem(cacheKey);
      } catch {
        // Si localStorage falla (modo incógnito), intentar sessionStorage
        try {
          cached = sessionStorage.getItem(cacheKey);
        } catch {
          // Si ambos fallan, usar cache en memoria
          const memoryKey = `memory-tenant-${hostname}`;
          const memoryCache = (window as any)[memoryKey];
          if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL) {
            return memoryCache;
          }
          return null;
        }
      }
      
      if (!cached) return null;

      const parsedCache: CachedTenant = JSON.parse(cached);
      const now = Date.now();
      
      // Verificar si el cache sigue válido
      if (now - parsedCache.timestamp > CACHE_TTL) {
        try {
          localStorage.removeItem(cacheKey);
          sessionStorage.removeItem(cacheKey);
        } catch {}
        return null;
      }

      // SPECIAL HANDLING FOR .toogo.store SUBDOMAINS
      // If this is a .toogo.store subdomain and cached data doesn't have subdomain_not_found error,
      // but the cached tenant is null, clear cache to ensure proper error is set
      if (hostname.endsWith('.toogo.store') && parsedCache.data === null) {
        console.log('🔄 [useTenantByDomain] Clearing old cache for .toogo.store subdomain to ensure proper error handling');
        try {
          localStorage.removeItem(cacheKey);
          sessionStorage.removeItem(cacheKey);
          const memoryKey = `memory-tenant-${hostname}`;
          delete (window as any)[memoryKey];
        } catch {}
        return null; // Force refresh to set subdomain_not_found error
      }

      return parsedCache;
    } catch (error) {
      console.error('Error reading tenant cache:', error);
      return null;
    }
  };

  // Función híbrida para guardar cache
  const setCachedTenant = (hostname: string, tenantData: Tenant | null) => {
    try {
      const cacheKey = `tenant-cache-${CACHE_VERSION}-${hostname}`;  
      const cacheData: CachedTenant = {
        data: tenantData,
        timestamp: Date.now(),
        hostname
      };
      
      const cacheString = JSON.stringify(cacheData);
      
      // Intentar guardar en localStorage
      try {
        localStorage.setItem(cacheKey, cacheString);
      } catch {
        // Si localStorage falla, guardar en sessionStorage
        try {
          sessionStorage.setItem(cacheKey, cacheString);
        } catch {
          // Si ambos fallan, guardar en memoria
          const memoryKey = `memory-tenant-${hostname}`;
          (window as any)[memoryKey] = cacheData;
        }
      }
    } catch (error) {
      console.error('Error saving tenant cache:', error);
    }
  };

  // Función para notificar cambios a todos los subscribers
  const notifyStateChange = (newState: Partial<GlobalTenantState>) => {
    Object.assign(globalTenantState, newState);
    stateSubscribers.forEach(callback => callback(globalTenantState));
  };

  // Función singleton para cargar tenant (solo se ejecuta una vez por hostname)
  const loadTenantByDomain = async (hostname: string, forceRefresh = false, hostOverride?: string) => {
    // 1. PRIMERO: Si ya tenemos datos válidos para este hostname, usar cache
    if (globalTenantState.isInitialized && 
        globalTenantState.hostname === hostname && 
        Date.now() - globalTenantState.timestamp < CACHE_TTL && 
        !forceRefresh) {
      return;
    }

    // 2. SEGUNDO: Detectar dominios principales/desarrollo ANTES de verificar isLoading
    // Esto permite que estos dominios setéen isLoading=false inmediatamente sin RPC
    if (!hostOverride && (hostname === 'toogo.store' || 
        hostname === 'www.toogo.store' || 
        hostname.includes('lovable.app') || 
        hostname.includes('lovableproject.com') ||
        hostname.includes('localhost'))) {
      console.log('🏠 [useTenantByDomain] Dominio principal/desarrollo detectado. Omitiendo búsqueda de tenant.');
      notifyStateChange({
        tenant: null,
        isLoading: false,
        isInitialized: true,
        hostname,
        timestamp: Date.now()
      });
      return;
    }

    // 3. TERCERO: Si ya está cargando Y está inicializado, evitar cargas duplicadas
    // (Permitir la primera carga aunque isLoading sea true porque isInitialized será false)
    if (globalTenantState.isLoading && globalTenantState.isInitialized) {
      return;
    }

    try {
      notifyStateChange({ isLoading: true, error: null });

      console.log('🔍 [useTenantByDomain] Iniciando búsqueda de tenant para hostname:', hostname);

      // Check if we have a host override (for sandbox/preview mode)
      const effectiveHost = hostOverride || hostname;
      console.log('🔍 [useTenantByDomain] Effective host:', effectiveHost, hostOverride ? '(override)' : '(current)');

      // Verificar cache local primero
      const cachedTenant = getCachedTenant(hostname);
      if (cachedTenant && !forceRefresh) {
        console.log('💾 [useTenantByDomain] Usando tenant desde cache:', {
          hostname: cachedTenant.hostname,
          tenant: cachedTenant.data ? { id: cachedTenant.data.id, name: cachedTenant.data.name } : null,
          age: Math.round((Date.now() - cachedTenant.timestamp) / 1000) + 's'
        });
        notifyStateChange({
          tenant: cachedTenant.data,
          isLoading: false,
          isInitialized: true,
          hostname,
          timestamp: cachedTenant.timestamp
        });
        return;
      }

      // SECURITY: Use the secure get_tenant_by_host function instead of direct table access
      console.log('🔎 [useTenantByDomain] Buscando tenant usando get_tenant_by_host RPC con host:', effectiveHost);
      
      const { data: tenantData, error: lookupError } = await supabase
        .rpc('get_tenant_by_host', { p_host: effectiveHost });

      if (lookupError) {
        console.error('❌ [useTenantByDomain] Error al buscar tenant:', lookupError);
        notifyStateChange({
          error: 'Error al buscar la tienda',
          isLoading: false
        });
        return;
      }

      // The RPC returns an array, get first result
      const tenant = Array.isArray(tenantData) && tenantData.length > 0 ? tenantData[0] : null;

      console.log('🔎 [useTenantByDomain] Resultado RPC query:', { tenant });

      // If no tenant found and this is a .toogo.store subdomain, set specific error
      if (!tenant && hostname.endsWith('.toogo.store')) {
        const subdomain = hostname.replace('.toogo.store', '');
        console.log('🏪 [useTenantByDomain] =====================================================');
        console.log('🏪 [useTenantByDomain] SUBDOMINIO .toogo.store NO ENCONTRADO');
        console.log('🏪 [useTenantByDomain] Subdominio:', subdomain);
        console.log('🏪 [useTenantByDomain] Hostname completo:', hostname);
        console.log('🏪 [useTenantByDomain] Estableciendo error: subdomain_not_found');
        console.log('🏪 [useTenantByDomain] Esto debería mostrar SubdomainAvailablePage');
        console.log('🏪 [useTenantByDomain] =====================================================');
        
        setCachedTenant(hostname, null);
        notifyStateChange({
          tenant: null,
          error: 'subdomain_not_found',
          isLoading: false,
          isInitialized: true,
          hostname,
          timestamp: Date.now()
        });
        return;
      }
      
      console.log('✅ [useTenantByDomain] Resultado final:', tenant ? 
        `Tenant encontrado: ${tenant.id} - ${tenant.name}` : 
        'No tenant found - mostrará landing');
      
      setCachedTenant(hostname, tenant);
      notifyStateChange({
        tenant,
        isLoading: false,
        isInitialized: true,
        hostname,
        timestamp: Date.now()
      });

    } catch (err) {
      console.error('Error in useTenantByDomain:', err);
      notifyStateChange({
        error: 'Error de conexión al buscar la tienda',
        isLoading: false
      });
    }
  };

  useEffect(() => {
    // Subscriber para escuchar cambios en el estado global
    const handleStateChange = (newState: GlobalTenantState) => {
      setTenant(newState.tenant);
      setIsLoading(newState.isLoading);
      setError(newState.error);
    };

    // Registrar este hook como subscriber
    stateSubscribers.add(handleStateChange);

    // Check for host override in query params
    const searchParams = new URLSearchParams(window.location.search);
    const hostOverride = searchParams.get('host') || searchParams.get('domain');

    // Solo cargar si no está inicializado para este hostname o si es un hostname diferente
    // OR if we have a hostOverride (for sandbox preview)
    if (!globalTenantState.isInitialized || globalTenantState.hostname !== currentHostname || hostOverride) {
      loadTenantByDomain(currentHostname, false, hostOverride || undefined);
    } else {
      // Usar el estado global actual
      handleStateChange(globalTenantState);
    }

    // Cleanup: remover subscriber
    return () => {
      stateSubscribers.delete(handleStateChange);
    };
  }, []); // Solo ejecutar una vez al montar

  return {
    tenant,
    tenantId: tenant?.id || null,
    isLoading,
    error
  };
};