import { useEffect, useState } from "react";
import { Payment, initMercadoPago } from "@mercadopago/sdk-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Lock, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

interface EmbeddedRenewalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renewalId: string;
  domain: string;
  amount: number;
  onSuccess: () => void;
}

type PayStatus = "idle" | "processing" | "success" | "error";

export const EmbeddedRenewalDialog = ({
  open,
  onOpenChange,
  renewalId,
  domain,
  amount,
  onSuccess,
}: EmbeddedRenewalDialogProps) => {
  const { user } = useAuth();
  const [mpPublicKey, setMpPublicKey] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [payStatus, setPayStatus] = useState<PayStatus>("idle");
  const [formReady, setFormReady] = useState(false);

  // Cargar public key cuando abre el modal
  useEffect(() => {
    if (!open) return;
    setPayStatus("idle");
    setFormReady(false);

    (async () => {
      try {
        setLoadingConfig(true);
        const { data, error } = await supabase.functions.invoke("manage-membership-settings", {
          body: { action: "get_public_payment_config" },
        });
        if (error) throw new Error(error.message);
        const publicKey = data?.mercadopago?.public_key;
        if (!publicKey) {
          setConfigError("MercadoPago no está configurado. Contacta al administrador.");
          return;
        }
        initMercadoPago(publicKey, { locale: "es-MX", advancedFraudPrevention: false });
        setMpPublicKey(publicKey);
        setConfigError(null);
      } catch (err: any) {
        console.error("[RenewalDialog] config error:", err);
        setConfigError("No pudimos cargar la configuración de pago");
      } finally {
        setLoadingConfig(false);
      }
    })();
  }, [open]);

  const handleSubmit = async ({ formData }: any) => {
    setPayStatus("processing");
    try {
      const { data, error } = await supabase.functions.invoke("process-renewal-payment", {
        body: {
          renewalId,
          paymentData: {
            token: formData.token,
            payment_method_id: formData.payment_method_id,
            issuer_id: formData.issuer_id,
            installments: formData.installments || 1,
            payer: {
              email: user?.email,
              first_name: user?.user_metadata?.first_name || "",
              last_name: user?.user_metadata?.last_name || "",
            },
          },
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data.success && data.payment?.status === "approved") {
        setPayStatus("success");
        toast.success(`¡${domain} renovado por 1 año más!`);
        // Cerrar y refrescar después de 1.5s
        setTimeout(() => {
          onSuccess();
          onOpenChange(false);
        }, 1500);
      } else {
        throw new Error(`Pago no aprobado (${data.payment?.status_detail || "desconocido"})`);
      }
    } catch (err: any) {
      console.error("Renewal payment error:", err);
      setPayStatus("error");
      toast.error(err.message || "Error procesando el pago");
    }
  };

  const handleClose = () => {
    if (payStatus === "processing") return; // No cerrar mientras procesa
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Renovar {domain}
          </DialogTitle>
          <DialogDescription>
            Renovación por 1 año · ${amount} MXN
          </DialogDescription>
        </DialogHeader>

        {/* ESTADO: éxito */}
        {payStatus === "success" && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">¡Pago exitoso!</h3>
              <p className="text-sm text-green-700">Tu dominio fue renovado por 1 año más.</p>
            </CardContent>
          </Card>
        )}

        {/* ESTADO: error de pago */}
        {payStatus === "error" && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Pago rechazado</h3>
              <p className="text-sm text-red-700 mb-4">Verifica los datos de tu tarjeta y vuelve a intentar.</p>
              <Button onClick={() => setPayStatus("idle")} variant="outline">Reintentar</Button>
            </CardContent>
          </Card>
        )}

        {/* ESTADO: error de configuración */}
        {configError && payStatus === "idle" && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <p className="text-sm text-yellow-700">{configError}</p>
            </CardContent>
          </Card>
        )}

        {/* ESTADO: cargando config */}
        {loadingConfig && payStatus === "idle" && !configError && (
          <div className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando formulario de pago...
          </div>
        )}

        {/* ESTADO: form embedded */}
        {!loadingConfig && !configError && mpPublicKey && (payStatus === "idle" || payStatus === "processing") && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" />
              Pago seguro con MercadoPago
            </div>

            {!formReady && (
              <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando formulario...
              </div>
            )}

            <div className={`min-h-[300px] ${!formReady ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}>
              <Payment
                initialization={{
                  amount: Number(amount.toFixed(2)),
                  payer: {
                    email: user?.email || "",
                    first_name: user?.user_metadata?.first_name || "",
                    last_name: user?.user_metadata?.last_name || "",
                  },
                }}
                customization={{
                  paymentMethods: {
                    creditCard: "all",
                    debitCard: "all",
                  },
                  visual: { style: { theme: "default" }, hideFormTitle: true },
                }}
                onSubmit={handleSubmit}
                onReady={() => setFormReady(true)}
                onError={(err: any) => {
                  console.error("[Payment Brick] error:", err);
                  if (err?.message?.includes("Could not fetch site ID")) {
                    setConfigError("Configuración inválida de MercadoPago. Contacta al administrador.");
                  }
                }}
              />
            </div>

            {payStatus === "processing" && (
              <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                <Loader2 className="w-4 h-4 animate-spin" /> Procesando pago, no cierres la ventana...
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Aceptamos Visa, Mastercard, American Express y más
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
