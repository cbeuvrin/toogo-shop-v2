import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface WhatsAppBotConfig {
  phone: string;
  display_name: string;
}

export const useWhatsAppBotNumber = () => {
  return useQuery({
    queryKey: ["whatsapp-bot-number"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "whatsapp_bot_number")
        .single();

      if (error) {
        console.error("Error fetching WhatsApp bot number:", error);
        return null;
      }

      if (!data?.setting_value) return null;
      
      const value = data.setting_value as any;
      return {
        phone: value.phone || "",
        display_name: value.display_name || "",
      };
    },
  });
};
