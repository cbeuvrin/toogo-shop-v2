import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ShoppingBag, Home } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  
  const orderId = searchParams.get('order_id');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Clear the cart on successful payment
    clearCart();
  }, [clearCart]);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">
            ¡Pago Exitoso!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Tu pago ha sido procesado correctamente.
            </p>
            {orderId && (
              <p className="text-sm text-muted-foreground">
                <strong>ID de orden:</strong> {orderId}
              </p>
            )}
            {sessionId && (
              <p className="text-sm text-muted-foreground">
                <strong>ID de sesión:</strong> {sessionId}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Recibirás un email de confirmación con los detalles de tu pedido.
            </p>
            
            <p className="text-sm text-muted-foreground">
              El vendedor se pondrá en contacto contigo para coordinar la entrega.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Button asChild className="w-full">
              <Link to="/tienda">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Continuar Comprando
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Ir al Inicio
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;