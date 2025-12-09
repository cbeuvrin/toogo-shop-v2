// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTenantContext } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Truck, Info } from "lucide-react";
const DashboardShipping = () => {
  const { toast } = useToast();
  const { currentTenantId, isLoading: tenantLoading } = useTenantContext();
  const tenantId = currentTenantId;
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    shippingEnabled: false,
    shippingType: "free_minimum" as "free_minimum" | "flat_rate" | "zone_based",
    minimumAmount: "",
    flatRate: "",
    zonesEnabled: false,
    zonesConfig: {
      default_rate: 0,
      zones: {} as Record<string, number>
    }
  });
  const mexicanStates = ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"];
  useEffect(() => {
    if (tenantId && !tenantLoading) {
      loadShippingSettings();
    }
  }, [tenantId, tenantLoading]);
  const loadShippingSettings = async () => {
    if (!tenantId) return;
    try {
      const {
        data,
        error
      } = await supabase.from("tenant_settings").select("*").eq("tenant_id", tenantId).maybeSingle();
      if (error) {
        console.error("Error loading shipping settings:", error);
        return;
      }
      if (data) {
        setSettings({
          shippingEnabled: (data as any).shipping_enabled || false,
          shippingType: (data as any).shipping_type || "free_minimum",
          minimumAmount: (data as any).shipping_minimum_amount?.toString() || "",
          flatRate: (data as any).shipping_flat_rate?.toString() || "",
          zonesEnabled: (data as any).shipping_zones_enabled || false,
          zonesConfig: (data as any).shipping_zones_config || {
            default_rate: 0,
            zones: {}
          }
        });
      }
    } catch (error) {
      console.error("Error loading shipping settings:", error);
    }
  };
  const handleSave = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const updateData: any = {
        shipping_enabled: settings.shippingEnabled,
        shipping_type: settings.shippingType,
        updated_at: new Date().toISOString()
      };
      if (settings.shippingType === "free_minimum" && settings.minimumAmount) {
        updateData.shipping_minimum_amount = parseFloat(settings.minimumAmount);
      }
      if (settings.shippingType === "flat_rate" && settings.flatRate) {
        updateData.shipping_flat_rate = parseFloat(settings.flatRate);
      }
      if (settings.shippingType === "zone_based") {
        updateData.shipping_zones_enabled = settings.zonesEnabled;
        updateData.shipping_zones_config = settings.zonesConfig;
      }
      const {
        error
      } = await supabase.from("tenant_settings")
        .update(updateData)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      toast({
        title: "Configuración guardada",
        description: "Los ajustes de envío se han actualizado correctamente."
      });
    } catch (error) {
      console.error("Error saving shipping settings:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración de envío.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            <CardTitle>Configuración de Envíos</CardTitle>
          </div>
          <CardDescription>Configura opciones de envío para las plataformas de pago automáticas. Los pedidos por WhatsApp mantienen negociación personalizado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Activar configuración cobro de envíos</Label>
              <p className="text-sm text-muted-foreground">
                Aplica automáticamente costos de envío en checkout de plataformas
              </p>
            </div>
            <Switch checked={settings.shippingEnabled} onCheckedChange={checked => setSettings({
            ...settings,
            shippingEnabled: checked
          })} />
          </div>

          {settings.shippingEnabled && <>
              <Separator />
              
              <div className="space-y-4">
                <Label className="text-base font-medium">Tipo de envío</Label>
                
                <RadioGroup value={settings.shippingType} onValueChange={value => setSettings({
              ...settings,
              shippingType: value as "free_minimum" | "flat_rate" | "zone_based"
            })} className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="free_minimum" id="free_minimum" />
                    <Label htmlFor="free_minimum" className="font-normal">
                      Envío gratis con compra mínima
                    </Label>
                  </div>
                  
                  {settings.shippingType === "free_minimum" && <div className="ml-6 space-y-2">
                      <Label htmlFor="minimum_amount" className="text-sm">Compra mínima para envío gratis (MXN)</Label>
                      <Input id="minimum_amount" type="number" placeholder="1000.00" value={settings.minimumAmount} onChange={e => setSettings({
                  ...settings,
                  minimumAmount: e.target.value
                })} className="w-40" />
                    </div>}

                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flat_rate" id="flat_rate" />
                    <Label htmlFor="flat_rate" className="font-normal">
                      Tarifa fija de envío
                    </Label>
                  </div>
                  
                   {settings.shippingType === "flat_rate" && <div className="ml-6 space-y-2">
                      <Label htmlFor="flat_rate_amount" className="text-sm">Costo de envío (MXN)</Label>
                      <Input id="flat_rate_amount" type="number" placeholder="200.00" value={settings.flatRate} onChange={e => setSettings({
                  ...settings,
                  flatRate: e.target.value
                })} className="w-40" />
                    </div>}

                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="zone_based" id="zone_based" />
                    <Label htmlFor="zone_based" className="font-normal flex items-center gap-2">
                      Envío por zonas/estados
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Premium</span>
                    </Label>
                  </div>
                  
                  {settings.shippingType === "zone_based" && <div className="ml-6 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="default_rate" className="text-sm">Precio base para estados no configurados (MXN)</Label>
                        <Input id="default_rate" type="number" placeholder="250.00" value={settings.zonesConfig.default_rate || ""} onChange={e => setSettings({
                    ...settings,
                    zonesConfig: {
                      ...settings.zonesConfig,
                      default_rate: parseFloat(e.target.value) || 0
                    }
                  })} className="w-40" />
                      </div>
                      
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Configurar precios por estado:</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-3 border rounded-md bg-muted/20">
                          {mexicanStates.map(state => <div key={state} className="flex items-center gap-2">
                              <Label className="text-xs min-w-[120px] truncate" title={state}>
                                {state}:
                              </Label>
                              <Input type="number" placeholder="0" value={settings.zonesConfig.zones[state] || ""} onChange={e => setSettings({
                        ...settings,
                        zonesConfig: {
                          ...settings.zonesConfig,
                          zones: {
                            ...settings.zonesConfig.zones,
                            [state]: parseFloat(e.target.value) || 0
                          }
                        }
                      })} className="w-20 h-8 text-xs" />
                            </div>)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Deja en 0 los estados que quieras que usen el precio base
                        </p>
                      </div>
                    </div>}
                </RadioGroup>
              </div>

              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">¿Cómo funciona?</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Se aplica automáticamente en checkouts de MercadoPago, PayPal y Stripe</li>
                    <li>• Los pedidos por WhatsApp siguen permitiendo negociación manual</li>
                    <li>• Los costos se calculan en tiempo real durante el checkout</li>
                  </ul>
                </div>
              </div>
            </>}

          <div className="pt-4">
            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default DashboardShipping;