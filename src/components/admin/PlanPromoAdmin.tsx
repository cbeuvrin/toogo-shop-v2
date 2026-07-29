import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Gift, Loader2 } from "lucide-react";

const PROMO_CODE = "TOOGO100";

interface PromoState {
  ok: boolean;
  code?: string;
  active?: boolean;
  used_count?: number;
  max_uses?: number;
  plan_grant?: string;
  duration_days?: number;
  title?: string;
}

export const PlanPromoAdmin = () => {
  const { toast } = useToast();
  const [promo, setPromo] = useState<PromoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_plan_promo_admin", { p_code: PROMO_CODE });
    setPromo((data || { ok: false }) as PromoState);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (active: boolean) => {
    setToggling(true);
    try {
      const { data, error } = await supabase.rpc("set_plan_promo_active", { p_code: PROMO_CODE, p_active: active });
      if (error) throw error;
      const res = data as { ok: boolean; error?: string };
      if (!res?.ok) throw new Error(res?.error || "error");
      toast({ title: active ? "Promo activada" : "Promo pausada", description: active ? "Las nuevas tiendas verán el popup del código." : "El popup ya no se mostrará." });
      await load();
    } catch (e: any) {
      toast({ variant: "destructive", title: "No se pudo cambiar", description: e?.message === "not_superadmin" ? "Solo un superadmin puede cambiar la promo." : "Intenta de nuevo." });
    } finally {
      setToggling(false);
    }
  };

  const used = promo?.used_count ?? 0;
  const max = promo?.max_uses ?? 100;
  const remaining = Math.max(max - used, 0);
  const pct = max > 0 ? Math.round((used / max) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-purple-600" />
          Promo de lanzamiento — {PROMO_CODE}
        </CardTitle>
        <CardDescription>
          Regala el plan <b>{promo?.plan_grant || "basic"}</b> gratis por {Math.round((promo?.duration_days || 365) / 365)} año a las primeras {max} tiendas.
          Cuando alguien crea su tienda, ve un popup con el código y al aplicarlo obtiene el plan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</div>
        ) : !promo?.ok ? (
          <p className="text-sm text-red-600">No se pudo cargar la promo (¿tienes rol superadmin?).</p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-semibold">{promo.active ? "Promo activa" : "Promo pausada"}</p>
                <p className="text-sm text-muted-foreground">
                  {promo.active ? "Las nuevas tiendas ven el popup del código." : "El popup no se muestra."}
                </p>
              </div>
              <Switch checked={!!promo.active} disabled={toggling} onCheckedChange={toggle} />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Cupos usados</span>
                <span className="text-muted-foreground">{used} / {max} · quedan {remaining}</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-purple-600 transition-all" style={{ width: `${pct}%` }} />
              </div>
              {remaining === 0 && <p className="text-sm text-amber-600 mt-2">Se agotaron los cupos. La promo ya no otorga planes.</p>}
            </div>

            <p className="text-xs text-muted-foreground">
              Código que se muestra en el popup: <b className="font-mono">{promo.code}</b>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlanPromoAdmin;
