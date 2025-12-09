import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplate {
  subject: string;
  greeting: string;
  mainMessage: string;
  orderDetails?: string; // Made optional for backward compatibility
  footerMessage: string;
}

interface WhatsAppTemplate {
  message: string;
}

interface SystemTemplates {
  email_template_vendor: EmailTemplate;
  email_template_customer: EmailTemplate;
  whatsapp_template: WhatsAppTemplate;
}

export const useSystemSettings = () => {
  const [templates, setTemplates] = useState<SystemTemplates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['email_template_vendor', 'email_template_customer', 'whatsapp_template']);

      if (error) {
        console.error('Error loading system templates:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las plantillas del sistema",
          variant: "destructive",
        });
        return;
      }

      if (!data || data.length === 0) {
        console.error('No templates found in system_settings');
        return;
      }

      // Convert array to object
      const templatesObj: any = {};
      data.forEach(item => {
        templatesObj[item.setting_key] = item.setting_value;
      });

      setTemplates(templatesObj);
    } catch (error) {
      console.error('Error in loadTemplates:', error);
      toast({
        title: "Error",
        description: "Error al cargar las plantillas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplates = async (newTemplates: SystemTemplates) => {
    try {
      setIsLoading(true);

      // Update each template in the database
      const updates = Object.entries(newTemplates).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .update({ 
            setting_value: update.setting_value,
            updated_at: update.updated_at
          })
          .eq('setting_key', update.setting_key);

        if (error) {
          throw error;
        }
      }

      setTemplates(newTemplates);
      toast({
        title: "Éxito",
        description: "Plantillas guardadas correctamente",
      });

    } catch (error) {
      console.error('Error saving templates:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las plantillas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  return {
    templates,
    isLoading,
    saveTemplates,
    loadTemplates
  };
};