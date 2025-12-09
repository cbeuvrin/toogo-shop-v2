// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CancellationRequest {
  id: string;
  scheduled_deletion_at: string;
  status: string;
  can_revert: boolean;
}

interface CancellationBannerProps {
  tenantId: string;
}

export const CancellationBanner: React.FC<CancellationBannerProps> = ({ tenantId }) => {
  const [cancellation, setCancellation] = useState<CancellationRequest | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkCancellationStatus();
  }, [tenantId]);

  const checkCancellationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('cancellation_requests')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .eq('can_revert', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking cancellation status:', error);
        return;
      }

      setCancellation(data);
    } catch (error) {
      console.error('Error checking cancellation status:', error);
    }
  };

  const handleRevertCancellation = async () => {
    if (!cancellation) return;

    setIsReverting(true);
    
    try {
      const { error } = await supabase
        .from('cancellation_requests')
        .update({
          status: 'reverted',
          can_revert: false
        })
        .eq('id', cancellation.id);

      if (error) throw error;

      toast({
        title: "Cancelación revertida",
        description: "Tu plan Basic ha sido restaurado exitosamente.",
      });

      setCancellation(null);
      
    } catch (error) {
      console.error('Error reverting cancellation:', error);
      toast({
        title: "Error",
        description: "No se pudo revertir la cancelación. Contacta soporte.",
        variant: "destructive"
      });
    } finally {
      setIsReverting(false);
    }
  };

  const formatTimeRemaining = (scheduledDeletion: string) => {
    const now = new Date();
    const deletionDate = new Date(scheduledDeletion);
    const diffMs = deletionDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return '¡Tiempo agotado!';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days} día${days > 1 ? 's' : ''} y ${remainingHours} hora${remainingHours > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hora${hours > 1 ? 's' : ''} y ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else {
      return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
    }
  };

  if (!cancellation || isHidden) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800 mb-1">
              Plan cancelado - Eliminación programada
            </h3>
            <p className="text-sm text-red-700 mb-3">
              Tu plan Basic será cancelado y <strong>todos tus datos serán eliminados</strong> en:{' '}
              <span className="font-semibold">
                {formatTimeRemaining(cancellation.scheduled_deletion_at)}
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRevertCancellation}
                disabled={isReverting}
                className="bg-white border-red-300 text-red-700 hover:bg-red-50"
              >
                {isReverting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Revirtiendo...
                  </>
                ) : (
                  'Revertir cancelación'
                )}
              </Button>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsHidden(true)}
          className="text-red-600 hover:text-red-800 hover:bg-red-100"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};