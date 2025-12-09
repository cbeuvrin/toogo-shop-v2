import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardMisDatos } from "./DashboardMisDatos";
import DashboardUsuarios from "./DashboardUsuarios";
import { DashboardPlanNew } from "./DashboardPlanNew";
import { DashboardCupones } from "./DashboardCupones";
import { DashboardWhatsAppBot } from "./DashboardWhatsAppBot";
import { User, Users, CreditCard, Tag, MessageSquare } from "lucide-react";

type ProfileSection = "mis-datos" | "usuarios" | "mi-plan" | "cupones" | "whatsapp-bot";

interface DashboardMiPerfilProps {
  activeSubTab: ProfileSection;
  onSubTabChange: (tab: ProfileSection) => void;
}

export const DashboardMiPerfil = ({ activeSubTab, onSubTabChange }: DashboardMiPerfilProps) => {

  const profileTabs = [
    { id: "mis-datos" as const, icon: User, label: "Mis Datos" },
    { id: "usuarios" as const, icon: Users, label: "Usuarios" },
    { id: "mi-plan" as const, icon: CreditCard, label: "Mi Plan" },
    { id: "cupones" as const, icon: Tag, label: "Cupones" },
    { id: "whatsapp-bot" as const, icon: MessageSquare, label: "WhatsApp Bot" },
  ];

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={(value) => onSubTabChange(value as ProfileSection)}>
        {/* Tab Contents */}
        <TabsContent value="mis-datos">
          <DashboardMisDatos />
        </TabsContent>
        
        <TabsContent value="usuarios">
          <DashboardUsuarios />
        </TabsContent>
        
        <TabsContent value="mi-plan">
          <DashboardPlanNew />
        </TabsContent>
        
        <TabsContent value="cupones">
          <DashboardCupones />
        </TabsContent>
        
        <TabsContent value="whatsapp-bot">
          <DashboardWhatsAppBot />
        </TabsContent>
      </Tabs>
    </div>
  );
};