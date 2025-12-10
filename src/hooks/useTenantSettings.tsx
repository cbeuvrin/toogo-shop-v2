// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';

interface TenantSettings {
  id?: string;
  tenant_id: string;
  logo_url?: string;
  logo_size?: number;
  primary_color?: string;
  secondary_color?: string;
  whatsapp_number?: string;
  whatsapp_message?: string;
  shipping_enabled?: boolean;
  shipping_type?: string;
  shipping_flat_rate?: number;
  shipping_minimum_amount?: number;
  mercadopago_public_key?: string;
  paypal_client_id?: string;
  exchange_rate_mode?: string;
  exchange_rate_value?: number;
  store_background_color?: string;
  product_card_hover_color?: string;
  product_card_bg_color?: string;
  navbar_bg_color?: string;
  footer_bg_color?: string;
  header_icon_color?: string;
  header_icon_scale?: number;
  footer_icon_color?: string;
  footer_icon_scale?: number;
  share_title?: string;
  share_description?: string;
  share_image_url?: string;
  terms_text?: string;
  privacy_text?: string;
}

export const useTenantSettings = (overrideTenantId?: string) => {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { currentTenantId, isLoading: tenantLoading, userRole, isSuperAdmin } = useTenantContext();
  const { user } = useAuth();
  const tenantId = overrideTenantId || currentTenantId;
  const { toast } = useToast();

  useEffect(() => {
    // Si hay overrideTenantId, cargar inmediatamente sin esperar el contexto
    if (overrideTenantId) {
      loadSettings();
    } else if (tenantId && !tenantLoading) {
      loadSettings();
    } else if (!tenantLoading && !tenantId) {
      console.log('useTenantSettings: No tenantId available, setting isLoading to false');
      setIsLoading(false);
    }
  }, [tenantId, tenantLoading, overrideTenantId]);

  const loadSettings = async () => {
    // Skip loading for unauthenticated users
    if (!user) {
      console.log('useTenantSettings: No authenticated user, skipping load');
      setIsLoading(false);
      setSettings(null);
      return;
    }

    if (!tenantId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('Loading tenant settings for tenant:', tenantId);

      const { data, error } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading tenant settings:', error);
        return;
      }

      if (data) {
        console.log('Loaded tenant settings:', data);
        console.log('Logo URL found:', data.logo_url);
        setSettings(data);
      } else {
        console.log('No settings found');

        // Only attempt to create default settings if user is authenticated and authorized
        const isAuthorized = user && (isSuperAdmin || userRole === 'tenant_admin');

        if (!isAuthorized) {
          console.log('User not authorized to create tenant settings, returning null');
          setSettings(null);
        } else {
          console.log('Creating default settings for authorized user');
          const defaultSettings = {
            tenant_id: tenantId,
            exchange_rate_mode: 'manual',
            exchange_rate_value: 20.0,
          };

          const { data: newSettings, error: insertError } = await supabase
            .from('tenant_settings')
            .insert(defaultSettings)
            .select()
            .single();

          if (insertError) {
            console.error('Error creating tenant settings:', insertError);
            setSettings(null);
          } else {
            console.log('Created new tenant settings:', newSettings);
            setSettings(newSettings);
          }
        }
      }
    } catch (error) {
      console.error('Error in loadSettings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<TenantSettings>) => {
    if (!tenantId || !settings) return false;

    try {
      const { data, error } = await supabase
        .from('tenant_settings')
        .update(updates)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        console.error('Error updating tenant settings:', error);
        toast({
          title: "Error",
          description: "No se pudieron actualizar las configuraciones",
          variant: "destructive",
        });
        return false;
      }

      setSettings(data);
      return true;
    } catch (error) {
      console.error('Error in updateSettings:', error);
      return false;
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    if (!tenantId) return null;

    try {
      // Create a unique filename with timestamp for cache busting
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${tenantId}/logo_${timestamp}.${fileExt}`;

      // Delete existing logo if any
      if (settings?.logo_url) {
        const oldPath = settings.logo_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('logos')
            .remove([`${tenantId}/${oldPath}`]);
        }
      }

      // Upload new logo
      const { data, error } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Error uploading logo:', error);
        toast({
          title: "Error",
          description: "No se pudo subir el logo",
          variant: "destructive",
        });
        return null;
      }

      // Get public URL with cache busting
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      const cacheBustedUrl = `${publicUrl}?t=${timestamp}`;

      // Update tenant_settings with new logo URL
      const success = await updateSettings({ logo_url: cacheBustedUrl });

      if (success) {
        // Force reload settings to ensure sync
        await loadSettings();
        toast({
          title: "Éxito",
          description: "Logo actualizado correctamente",
        });
        return cacheBustedUrl;
      }

      return null;
    } catch (error) {
      console.error('Error in uploadLogo:', error);
      toast({
        title: "Error",
        description: "Error al procesar el logo",
        variant: "destructive",
      });
      return null;
    }
  };

  const uploadShareImage = async (file: File): Promise<string | null> => {
    if (!tenantId) return null;

    try {
      // Create a unique filename with timestamp for cache busting
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${tenantId}/share_${timestamp}.${fileExt}`;

      // Delete existing share image if any
      if (settings?.share_image_url) {
        const oldPath = settings.share_image_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('banners')
            .remove([`${tenantId}/${oldPath}`]);
        }
      }

      // Upload new share image to banners bucket
      const { data, error } = await supabase.storage
        .from('banners')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Error uploading share image:', error);
        toast({
          title: "Error",
          description: "No se pudo subir la imagen",
          variant: "destructive",
        });
        return null;
      }

      // Get public URL with cache busting
      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName);

      const cacheBustedUrl = `${publicUrl}?t=${timestamp}`;

      // Update tenant_settings with new share image URL
      const success = await updateSettings({ share_image_url: cacheBustedUrl });

      if (success) {
        // Force reload settings to ensure sync
        await loadSettings();
        toast({
          title: "Éxito",
          description: "Imagen para compartir actualizada correctamente",
        });
        return cacheBustedUrl;
      }

      return null;
    } catch (error) {
      console.error('Error in uploadShareImage:', error);
      toast({
        title: "Error",
        description: "Error al procesar la imagen",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    uploadLogo,
    uploadShareImage,
    loadSettings
  };
};