import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Check, Loader2 } from "lucide-react";

const PURPLE = "#8346C1";

interface PlanPromoModalProps {
  /** Se abre cuando hay un tenant recién creado. */
  open: boolean;
  tenantId: string | null;
  /** Continuar (redirigir a la tienda). Se llama al aplicar, al saltar, o si no hay promo activa. */
  onDone: () => void;
}

type Promo = { active: boolean; code?: string; title?: string; plan_grant?: string; duration_days?: number; remaining?: number };

export const PlanPromoModal = ({ open, tenantId, onDone }: PlanPromoModalProps) => {
  const [promo, setPromo] = useState<Promo | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.rpc("get_active_plan_promo");
        if (cancelled) return;
        const p = (data || {}) as Promo;
        setPromo(p);
        if (p?.code) setCode(p.code);
        // Si no hay promo activa, no interrumpimos: continuamos directo.
        if (!p?.active) onDone();
      } catch {
        if (!cancelled) onDone();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const apply = async () => {
    if (!tenantId || !code.trim()) return;
    setApplying(true);
    setError("");
    try {
      const { data, error: rpcErr } = await supabase.rpc("redeem_plan_promo", {
        p_code: code.trim(),
        p_tenant_id: tenantId,
      });
      if (rpcErr) throw rpcErr;
      const res = data as { ok: boolean; error?: string };
      if (res?.ok) {
        setSuccess(true);
        setTimeout(onDone, 2200);
      } else {
        const msgs: Record<string, string> = {
          invalid_or_inactive: "Ese código no es válido o la promo ya cerró.",
          sold_out: "¡Se agotaron los cupos! Ya no quedan lugares en esta promo.",
          already_redeemed: "Esta tienda ya usó un código de promo.",
          not_owner: "No pudimos verificar tu tienda. Intenta desde tu cuenta.",
          not_authenticated: "Tu sesión expiró. Vuelve a entrar.",
        };
        setError(msgs[res?.error || ""] || "No se pudo aplicar el código.");
      }
    } catch {
      setError("No se pudo aplicar el código. Intenta de nuevo.");
    } finally {
      setApplying(false);
    }
  };

  // Nada que mostrar mientras carga o si no hay promo activa (onDone ya se llamó).
  if (!open || loading || !promo?.active) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDone(); }}>
      <DialogContent className="sm:max-w-md rounded-3xl text-center p-8">
        {success ? (
          <div className="py-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: PURPLE }}>
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black mb-2">¡Listo! 🎉</h2>
            <p className="text-gray-600">Tu tienda tiene el plan <b>{promo.plan_grant}</b> gratis por 1 año. Redirigiendo…</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#F3EDFB" }}>
              <Gift className="w-8 h-8" style={{ color: PURPLE }} />
            </div>
            <h2 className="text-2xl font-black mb-2">¡Eres de las primeras tiendas! 🎁</h2>
            <p className="text-gray-600 mb-1">
              {promo.title || `Llévate el plan ${promo.plan_grant} gratis por 1 año.`}
            </p>
            {typeof promo.remaining === "number" && (
              <p className="text-sm font-semibold mb-5" style={{ color: PURPLE }}>
                Quedan {promo.remaining} de 100 lugares
              </p>
            )}
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(""); }}
                placeholder="Código de promo"
                className="rounded-full text-center font-bold uppercase"
              />
              <Button
                onClick={apply}
                disabled={applying || !code.trim()}
                className="rounded-full px-6 font-bold text-white"
                style={{ backgroundColor: PURPLE }}
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
              </Button>
            </div>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            <button onClick={onDone} className="text-sm text-gray-400 mt-5 hover:text-gray-600">
              Ahora no, ir a mi tienda
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PlanPromoModal;
