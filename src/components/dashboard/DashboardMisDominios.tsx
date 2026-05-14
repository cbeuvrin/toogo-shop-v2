import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Globe, Calendar, ExternalLink, Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { EmbeddedRenewalDialog } from "./EmbeddedRenewalDialog";

interface DomainRenewal {
  id: string;
  domain: string;
  next_renewal_date: string;
  status: string;
  auto_renew: boolean;
  price_mxn: number;
  mercadopago_preapproval_id: string | null;
  domain_purchase_id: string | null;
  reminders_sent: string[] | null;
}

const daysUntil = (dateStr: string): number => {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};

const statusBadge = (status: string, daysLeft: number) => {
  if (status === "renewed") return <Badge className="bg-green-100 text-green-800 border-green-300">Renovado</Badge>;
  if (status === "expired") return <Badge variant="destructive">Expirado</Badge>;
  if (status === "failed") return <Badge variant="destructive">Error en renovación</Badge>;
  if (daysLeft < 0) return <Badge variant="destructive">Vencido</Badge>;
  if (daysLeft <= 7) return <Badge className="bg-red-100 text-red-800 border-red-300">Vence pronto</Badge>;
  if (daysLeft <= 30) return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Próximo a vencer</Badge>;
  return <Badge className="bg-green-100 text-green-800 border-green-300">Activo</Badge>;
};

export const DashboardMisDominios = () => {
  const { currentTenantId } = useTenantContext();
  const [renewals, setRenewals] = useState<DomainRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRenewal, setActiveRenewal] = useState<DomainRenewal | null>(null);

  const loadRenewals = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("domain_renewals")
      .select("id, domain, next_renewal_date, status, auto_renew, price_mxn, mercadopago_preapproval_id, domain_purchase_id, reminders_sent")
      .eq("tenant_id", currentTenantId)
      .in("status", ["scheduled", "reminded", "renewed", "failed", "expired"])
      .order("next_renewal_date", { ascending: true });

    if (error) {
      toast.error("No pudimos cargar tus dominios");
      console.error(error);
    } else {
      // Solo el registro activo más reciente por dominio (evita mostrar histórico duplicado)
      const seen = new Set<string>();
      const filtered = (data || []).filter((r) => {
        if (r.status === "renewed" || r.status === "expired") return false;
        if (seen.has(r.domain)) return false;
        seen.add(r.domain);
        return true;
      });
      setRenewals(filtered);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRenewals();
  }, [currentTenantId]);

  // Si la URL trae ?renewed=domain.com mostramos toast de éxito (regreso de checkout MP)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const renewed = params.get("renewed");
    if (renewed) {
      toast.success(`¡Tu dominio ${renewed} fue renovado por 1 año más!`, { duration: 5000 });
      params.delete("renewed");
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
      window.history.replaceState({}, "", newUrl);
    }
    const failed = params.get("renewal_failed");
    if (failed) {
      toast.error(`El pago de ${failed} no se procesó. Intenta de nuevo.`);
      params.delete("renewal_failed");
      window.history.replaceState({}, "", window.location.pathname);
    }
    // Vuelta del flujo de autorización de auto-renovación con MP
    const autoRenewed = params.get("auto_renew_activated");
    if (autoRenewed) {
      toast.success(`¡Auto-renovación activada para ${autoRenewed}! Cobraremos automáticamente cuando se acerque la fecha.`, { duration: 6000 });
      params.delete("auto_renew_activated");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleRenew = (renewal: DomainRenewal) => {
    // Abrir el modal con el formulario embebido — el cliente paga sin salir del dashboard
    setActiveRenewal(renewal);
  };

  const handleToggleAutoRenew = async (renewalId: string, current: boolean) => {
    // Llama toggle-auto-renew que crea/cancela un MercadoPago Preapproval.
    // Activar: redirige al cliente a MP para autorizar tarjeta para cobros recurrentes.
    // Desactivar: cancela el preapproval inmediatamente.
    try {
      const { data, error } = await supabase.functions.invoke("toggle-auto-renew", {
        body: { renewalId, enabled: !current },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      // Si activó y MP devolvió un init_point → redirigir para autorizar tarjeta
      if (!current && data?.init_point) {
        toast.info("Te llevamos a MercadoPago para autorizar tu tarjeta");
        window.location.href = data.init_point;
        return;
      }

      // Si activó pero ya estaba autorizado
      if (!current && data?.already_authorized) {
        toast.success("La auto-renovación ya estaba activa");
        loadRenewals();
        return;
      }

      // Desactivación
      if (current) {
        toast.success("Renovación automática desactivada");
      }
      loadRenewals();
    } catch (err: any) {
      console.error("toggle-auto-renew error:", err);
      toast.error(`No pudimos cambiar la auto-renovación: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (renewals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Aún no tienes dominios registrados</p>
          <p className="text-sm mt-1">Cuando compres o transfieras un dominio, aparecerá aquí.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mis Dominios</h2>
          <p className="text-sm text-muted-foreground">Gestiona la renovación de tus dominios</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadRenewals}>
          <RefreshCw className="w-4 h-4 mr-2" /> Actualizar
        </Button>
      </div>

      <div className="grid gap-4">
        {renewals.map((r) => {
          const daysLeft = daysUntil(r.next_renewal_date);
          const expiryDate = new Date(r.next_renewal_date).toLocaleDateString("es-MX", {
            day: "numeric", month: "long", year: "numeric",
          });

          return (
            <Card key={r.id} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-mono">{r.domain}</CardTitle>
                      <CardDescription className="text-sm flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        Vence el {expiryDate}
                        {daysLeft >= 0 && (
                          <span className="ml-2 text-xs">({daysLeft} día{daysLeft !== 1 ? "s" : ""} restante{daysLeft !== 1 ? "s" : ""})</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  {statusBadge(r.status, daysLeft)}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg bg-muted/40">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Costo de renovación (1 año)</p>
                    <p className="text-xl font-bold">${r.price_mxn} <span className="text-sm text-muted-foreground font-normal">MXN</span></p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Renovación automática</p>
                      <p className="text-sm text-muted-foreground">
                        {r.auto_renew ? "Activa (próximamente con cobro auto)" : "Desactivada"}
                      </p>
                    </div>
                    <Switch checked={r.auto_renew} onCheckedChange={() => handleToggleAutoRenew(r.id, r.auto_renew)} />
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => handleRenew(r)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> Renovar ahora
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={`https://${r.domain}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" /> Visitar
                    </a>
                  </Button>
                </div>

                {r.status === "failed" && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">La última renovación falló</p>
                      <p className="text-red-700 text-xs mt-0.5">Intenta de nuevo o contáctanos a soporte@toogo.store</p>
                    </div>
                  </div>
                )}

                {Array.isArray(r.reminders_sent) && r.reminders_sent.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    Te enviamos recordatorios: {r.reminders_sent.join(", ")}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal embedded de pago — el cliente paga sin salir del dashboard */}
      {activeRenewal && (
        <EmbeddedRenewalDialog
          open={!!activeRenewal}
          onOpenChange={(open) => { if (!open) setActiveRenewal(null); }}
          renewalId={activeRenewal.id}
          domain={activeRenewal.domain}
          amount={Number(activeRenewal.price_mxn || 290)}
          onSuccess={() => {
            setActiveRenewal(null);
            loadRenewals();
          }}
        />
      )}
    </div>
  );
};
