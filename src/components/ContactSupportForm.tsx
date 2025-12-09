import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { useTenantContext } from "@/contexts/TenantContext";

const contactSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "El nombre no puede exceder 100 caracteres" }),
  email: z.string()
    .trim()
    .email({ message: "Email inválido" })
    .max(255, { message: "El email no puede exceder 255 caracteres" }),
  phone: z.string()
    .trim()
    .optional(),
  subject: z.string()
    .trim()
    .min(5, { message: "El asunto debe tener al menos 5 caracteres" })
    .max(200, { message: "El asunto no puede exceder 200 caracteres" }),
  message: z.string()
    .trim()
    .min(10, { message: "El mensaje debe tener al menos 10 caracteres" })
    .max(2000, { message: "El mensaje no puede exceder 2000 caracteres" }),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactSupportFormProps {
  onSuccess?: () => void;
}

export const ContactSupportForm = ({ onSuccess }: ContactSupportFormProps = {}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { availableTenants, currentTenantId } = useTenantContext();
  
  const currentTenant = availableTenants.find(t => t.id === currentTenantId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setIsSuccess(false);

    try {
      const { error } = await supabase.functions.invoke("send-support-email", {
        body: {
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          subject: data.subject,
          message: data.message,
          tenantName: currentTenant?.name || undefined,
        },
      });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: "¡Mensaje enviado!",
        description: "Recibirás una confirmación en tu email y te responderemos pronto.",
      });
      reset();
      onSuccess?.();

      // Reset success state after 5 seconds
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error: any) {
      console.error("Error sending support email:", error);
      toast({
        title: "Error al enviar mensaje",
        description: "Por favor intenta nuevamente o escríbenos directamente a soporte@toogo.store",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-primary/10 rounded-full p-4">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">¡Mensaje enviado!</h3>
        <p className="text-muted-foreground mb-4">
          Hemos recibido tu mensaje y te responderemos a la brevedad.
        </p>
        <p className="text-sm text-muted-foreground">
          También recibirás una confirmación en tu email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre completo *</Label>
          <Input
            id="name"
            placeholder="Tu nombre"
            {...register("name")}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            {...register("email")}
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono (opcional)</Label>
        <Input
          id="phone"
          placeholder="+52 123 456 7890"
          {...register("phone")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Asunto *</Label>
        <Input
          id="subject"
          placeholder="¿En qué podemos ayudarte?"
          {...register("subject")}
          className={errors.subject ? "border-destructive" : ""}
        />
        {errors.subject && (
          <p className="text-sm text-destructive">{errors.subject.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Mensaje *</Label>
        <Textarea
          id="message"
          placeholder="Describe tu consulta o problema con el mayor detalle posible..."
          rows={6}
          {...register("message")}
          className={errors.message ? "border-destructive" : ""}
        />
        {errors.message && (
          <p className="text-sm text-destructive">{errors.message.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full md:w-auto"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Enviar mensaje
          </>
        )}
      </Button>

      <p className="text-sm text-muted-foreground">
        * Campos obligatorios. Responderemos en un plazo de 24 horas hábiles.
      </p>
    </form>
  );
};
