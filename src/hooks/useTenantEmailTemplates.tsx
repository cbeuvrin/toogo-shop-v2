import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplate {
  subject: string;
  greeting: string;
  mainMessage: string;
  footerMessage: string;
}

export const useTenantEmailTemplates = () => {
  const [customerTemplate, setCustomerTemplate] = useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { currentTenantId } = useTenantContext();
  const { toast } = useToast();

  const loadTemplate = async () => {
    if (!currentTenantId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('custom_email_template_customer')
        .eq('tenant_id', currentTenantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading tenant email template:', error);
        return;
      }

      if (data?.custom_email_template_customer) {
        setCustomerTemplate(data.custom_email_template_customer as unknown as EmailTemplate);
      }
    } catch (error) {
      console.error('Error in loadTemplate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplate = async (template: EmailTemplate) => {
    if (!currentTenantId) return false;

    try {
      const { error } = await supabase
        .from('tenant_settings')
        .update({ 
          custom_email_template_customer: template as unknown as any,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', currentTenantId);

      if (error) {
        console.error('Error saving tenant email template:', error);
        toast({
          title: "Error",
          description: "No se pudo guardar la plantilla",
          variant: "destructive",
        });
        return false;
      }

      setCustomerTemplate(template);
      toast({
        title: "Éxito",
        description: "Plantilla guardada correctamente",
      });
      return true;
    } catch (error) {
      console.error('Error in saveTemplate:', error);
      toast({
        title: "Error",
        description: "Error al guardar la plantilla",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    loadTemplate();
  }, [currentTenantId]);

  return {
    customerTemplate,
    isLoading,
    saveTemplate,
    loadTemplate
  };
};
