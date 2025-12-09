// @ts-nocheck
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CancelPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}

export const CancelPlanModal: React.FC<CancelPlanModalProps> = ({
  isOpen,
  onClose,
  tenantId
}) => {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFirstConfirmation = () => {
    setStep(2);
  };

  const handleFinalConfirmation = async () => {
    setIsProcessing(true);
    
    try {
      // Schedule cancellation with 72-hour grace period
      const scheduledDeletion = new Date();
      scheduledDeletion.setHours(scheduledDeletion.getHours() + 72);

      const { error } = await supabase
        .from('cancellation_requests')
        .insert({
          tenant_id: tenantId,
          scheduled_deletion_at: scheduledDeletion.toISOString(),
          status: 'pending',
          can_revert: true,
          reason: 'User requested cancellation'
        });

      if (error) throw error;

      toast({
        title: "Cancelación programada",
        description: "Tu plan será cancelado en 72 horas. Puedes revertir esta acción desde tu dashboard.",
      });

      onClose();
      setStep(1);
      
      // Refresh the page to show the cancellation banner
      window.location.reload();
      
    } catch (error) {
      console.error('Error scheduling cancellation:', error);
      toast({
        title: "Error",
        description: "No se pudo programar la cancelación. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>¿Cancelar Plan Basic?</DialogTitle>
              <DialogDescription>
                Estás a punto de cancelar tu suscripción al Plan Basic.
                Perderás acceso a todas las funcionalidades premium.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Si cancelas tu plan:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Ya no podrás agregar productos ilimitados</li>
                <li>Perderás acceso a métodos de pago premium</li>
                <li>Tu dominio personalizado será desactivado</li>
                <li>Las analíticas avanzadas no estarán disponibles</li>
              </ul>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Mantener Plan
              </Button>
              <Button variant="destructive" onClick={handleFirstConfirmation}>
                Continuar Cancelación
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                ¡Advertencia Final!
              </DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer inmediatamente.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">
                  ⚠️ Todo tu contenido será eliminado en 72 horas
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Todos tus productos serán eliminados</li>
                  <li>• Se cancelarán los cobros automáticos</li>
                  <li>• Tu dominio será liberado</li>
                  <li>• Perderás todos los datos de analíticas</li>
                  <li>• Las configuraciones de tu tienda se borrarán</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Período de gracia:</strong> Tienes 72 horas para revertir 
                  esta cancelación desde tu dashboard si cambias de opinión.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                No, mantener mi plan
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleFinalConfirmation}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Procesando...
                  </>
                ) : (
                  'Sí, cancelar definitivamente'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};