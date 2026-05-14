import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Status = "processing" | "success" | "error" | "no_code";

export default function MercadopagoConnected() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("processing");
  const [errorMsg, setErrorMsg] = useState("");
  const [mpEmail, setMpEmail] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    // Si el cliente canceló o hubo error en MP
    if (errorParam) {
      setStatus("error");
      setErrorMsg(`MercadoPago: ${errorParam}`);
      return;
    }

    if (!code || !state) {
      setStatus("no_code");
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("mercadopago-oauth-callback", {
          body: { code, state },
        });

        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        if (!data?.success) throw new Error("Respuesta inesperada");

        setMpEmail(data.mp_user_email || data.mp_user_nickname || null);
        setStatus("success");

        // Redirigir al dashboard de pagos en 3s
        setTimeout(() => navigate("/dashboard?tab=pagos&mp_connected=1", { replace: true }), 3000);
      } catch (err: any) {
        console.error("OAuth callback error:", err);
        setStatus("error");
        setErrorMsg(err.message || "No pudimos completar la conexión con MercadoPago");
      }
    })();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          {status === "processing" && (
            <>
              <Loader2 className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Conectando MercadoPago...</h2>
              <p className="text-sm text-gray-600">Estamos guardando tu autorización. Esto toma unos segundos.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">¡MercadoPago conectado!</h2>
              {mpEmail && (
                <p className="text-sm text-gray-600 mb-4">
                  Tu cuenta <span className="font-mono font-medium text-gray-900">{mpEmail}</span> ya está autorizada.
                </p>
              )}
              <p className="text-sm text-gray-500">Redirigiendo al dashboard...</p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">No pudimos conectar</h2>
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                {errorMsg}
              </p>
              <Button onClick={() => navigate("/dashboard?tab=pagos")} variant="outline">
                Volver al dashboard
              </Button>
            </>
          )}

          {status === "no_code" && (
            <>
              <XCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Página no válida</h2>
              <p className="text-sm text-gray-600 mb-4">
                Esta página solo se abre al volver de MercadoPago tras autorizar.
              </p>
              <Button onClick={() => navigate("/dashboard?tab=pagos")} variant="outline">
                Ir al dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
