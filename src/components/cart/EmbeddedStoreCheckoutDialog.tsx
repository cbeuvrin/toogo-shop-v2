// @ts-nocheck
import { useEffect, useState } from "react";
import { Payment, initMercadoPago } from "@mercadopago/sdk-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Lock, AlertCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Embedded MP Bricks checkout for the public store.
 * Anonymous shoppers complete payment without leaving the storefront.
 *
 * NOTE: This dialog is intentionally separate from EmbeddedPaymentForm
 * (which is hard-wired to membership/domain purchases with its own
 * post-payment side-effects). They share only the MP SDK component;
 * the surrounding flow is genuinely different per use case.
 */

interface StoreItem {
  product_id: string;
  title?: string;
  quantity: number;
  price_mxn: number;
  price_usd?: number;
  variation_id?: string | null;
}

interface CustomerData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  state?: string;
}

interface EmbeddedStoreCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  publicKey: string;
  items: StoreItem[];
  customer: CustomerData;
  totalMxn: number;
  totalUsd: number;
  shippingCost: number;
  onSuccess: (result: { order_id: string; payment_id: string; total_mxn: number; platform_fee_mxn: number }) => void;
}

export const EmbeddedStoreCheckoutDialog = ({
  open,
  onOpenChange,
  tenantId,
  publicKey,
  items,
  customer,
  totalMxn,
  totalUsd,
  shippingCost,
  onSuccess,
}: EmbeddedStoreCheckoutDialogProps) => {
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!open || !publicKey) return;
    try {
      initMercadoPago(publicKey, { locale: "es-MX", advancedFraudPrevention: false });
      setSdkReady(true);
    } catch (err) {
      console.error("[EmbeddedStoreCheckout] MP SDK init failed:", err);
      setErrorMsg("No se pudo inicializar MercadoPago. Recarga e intenta de nuevo.");
      setStatus("error");
    }
  }, [open, publicKey]);

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setErrorMsg(null);
    }
  }, [open]);

  const [firstName, ...rest] = (customer.name || "").trim().split(" ");
  const lastName = rest.join(" ") || firstName;

  const initialization = {
    amount: Number(totalMxn.toFixed(2)),
    payer: {
      email: customer.email,
      first_name: firstName,
      last_name: lastName,
    },
    preferenceId: undefined,
  };

  const customization = {
    paymentMethods: {
      creditCard: "all" as const,
      debitCard: "all" as const,
      mercadoPago: "wallet_purchase" as const,
    },
    visual: {
      style: { theme: "default" as const },
      hideFormTitle: true,
    },
  };

  const onSubmit = async ({ formData }: any) => {
    setStatus("processing");
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.functions.invoke("process-store-payment", {
        body: {
          tenant_id: tenantId,
          items,
          customer,
          shipping_cost: shippingCost,
          total_mxn: totalMxn,
          total_usd: totalUsd,
          payment_token: formData.token,
          payment_method_id: formData.payment_method_id,
          issuer_id: formData.issuer_id,
          installments: formData.installments,
        },
      });

      if (error) {
        const msg = (error as any)?.message || "Error al procesar el pago";
        throw new Error(msg);
      }

      const result = data;
      const paymentStatus = result?.payment?.status;

      if (paymentStatus === "approved") {
        setStatus("success");
        toast.success("¡Pago aprobado!");
        onSuccess({
          order_id: result.order_id,
          payment_id: String(result.payment.id),
          total_mxn: result.total_mxn,
          platform_fee_mxn: result.platform_fee_mxn,
        });
      } else if (paymentStatus === "pending" || paymentStatus === "in_process") {
        setStatus("success");
        toast.message("Pago pendiente de aprobación", {
          description: "Recibirás confirmación por email cuando se procese.",
        });
        onSuccess({
          order_id: result.order_id,
          payment_id: String(result.payment.id),
          total_mxn: result.total_mxn,
          platform_fee_mxn: result.platform_fee_mxn,
        });
      } else {
        throw new Error(result?.payment?.status_detail || "Pago rechazado");
      }
    } catch (err: any) {
      console.error("[EmbeddedStoreCheckout] Payment error:", err);
      setErrorMsg(err?.message || "Error al procesar el pago");
      setStatus("error");
      toast.error("Error al procesar el pago");
    }
  };

  const onError = (err: any) => {
    console.error("[EmbeddedStoreCheckout] Brick error:", err);
    setErrorMsg(err?.message || "Error en el formulario de pago");
    setStatus("error");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pago seguro
          </DialogTitle>
        </DialogHeader>

        {status === "success" ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">¡Pago Procesado!</h3>
              <p className="text-green-600 text-sm">
                Recibirás un correo de confirmación. Puedes cerrar esta ventana.
              </p>
              <Button onClick={() => onOpenChange(false)} className="mt-4">
                Cerrar
              </Button>
            </CardContent>
          </Card>
        ) : status === "error" ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error en el Pago</h3>
              <p className="text-red-700 text-sm mb-4">
                {errorMsg || "No se pudo procesar el pago. Verifica tu tarjeta e intenta de nuevo."}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => { setStatus("idle"); setErrorMsg(null); }} variant="outline">
                  Reintentar
                </Button>
                <Button onClick={() => onOpenChange(false)} variant="ghost">
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : !publicKey ? (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <p className="text-yellow-800">MercadoPago no está configurado para esta tienda.</p>
            </CardContent>
          </Card>
        ) : !sdkReady ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-muted-foreground">Cargando pasarela de pago...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" />
              <span>Pago 100% seguro procesado por MercadoPago</span>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between font-medium">
                <span>Total a pagar:</span>
                <span>${totalMxn.toFixed(2)} MXN</span>
              </div>
            </div>

            <Payment
              initialization={initialization}
              customization={customization}
              onSubmit={onSubmit}
              onError={onError}
              onReady={() => console.log("[EmbeddedStoreCheckout] Brick ready")}
            />

            {status === "processing" && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span>Procesando pago...</span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
