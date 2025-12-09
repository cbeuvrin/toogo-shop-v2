import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStoreCloning } from '@/hooks/useStoreCloning';
import { useAuth } from '@/components/AuthProvider';
import { useTenant } from '@/hooks/useTenant';
import { useCoupons } from '@/hooks/useCoupons';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tag } from 'lucide-react';

interface PurchaseStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterTenantId: string;
  masterTenantName: string;
}

export const PurchaseStoreModal = ({ 
  isOpen, 
  onClose, 
  masterTenantId, 
  masterTenantName 
}: PurchaseStoreModalProps) => {
  const [storeName, setStoreName] = useState('');
  const [domain, setDomain] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const { cloneStore, isCloning } = useStoreCloning();
  const { user } = useAuth();
  const { validateCoupon } = useCoupons();
  const { toast } = useToast();

  const basePrice = 99; // USD
  const finalPrice = basePrice - discountAmount;

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        title: 'Error',
        description: 'Ingresa un código de cupón',
        variant: 'destructive',
      });
      return;
    }

    const result = await validateCoupon(couponCode, 'both', basePrice);
    
    if (result.isValid && result.coupon) {
      setAppliedCoupon(result.coupon);
      setDiscountAmount(result.discountAmount || 0);
      toast({
        title: 'Cupón aplicado',
        description: `Descuento de $${result.discountAmount} USD aplicado`,
      });
    } else {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      toast({
        title: 'Cupón inválido',
        description: result.error || 'El cupón no es válido',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setDiscountAmount(0);
  };

  const handlePurchase = async () => {
    if (!user || !storeName || !domain) return;

    try {
      await cloneStore(
        masterTenantId,
        storeName,
        user.id,
        `${domain}.mitienda.app`,
        appliedCoupon?.id,
        discountAmount
      );
      
      onClose();
      setStoreName('');
      setDomain('');
      setCouponCode('');
      setAppliedCoupon(null);
      setDiscountAmount(0);
      
      // Redirect to new store dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Comprar Plantilla de Tienda</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Obtendrás una copia completa de "{masterTenantName}" con todos sus productos, 
              categorías y configuraciones. Tu tienda será completamente independiente.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="storeName">Nombre de tu tienda</Label>
            <Input
              id="storeName"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Mi Tienda Increíble"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Dominio</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="mitienda"
              />
              <span className="text-sm text-muted-foreground">.mitienda.app</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupon" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Código de cupón (opcional)
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="coupon"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="BIENVENIDA50"
                disabled={!!appliedCoupon}
              />
              {appliedCoupon ? (
                <Button
                  variant="outline"
                  onClick={handleRemoveCoupon}
                  size="sm"
                >
                  Quitar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleValidateCoupon}
                  size="sm"
                  disabled={!couponCode.trim()}
                >
                  Aplicar
                </Button>
              )}
            </div>
            {appliedCoupon && (
              <Badge variant="default" className="mt-2">
                ✓ Cupón {appliedCoupon.code} aplicado - ${discountAmount} USD de descuento
              </Badge>
            )}
          </div>

          {discountAmount > 0 && (
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Precio base:</span>
                <span>${basePrice} USD</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento:</span>
                <span>-${discountAmount} USD</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>${finalPrice} USD</span>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handlePurchase}
              disabled={!storeName || !domain || isCloning}
            >
              {isCloning ? 'Creando...' : `Comprar $${finalPrice} USD`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};