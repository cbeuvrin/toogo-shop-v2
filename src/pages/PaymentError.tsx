import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle, ShoppingBag, Home, RefreshCw } from 'lucide-react';

const PaymentError = () => {
  const [searchParams] = useSearchParams();
  
  const error = searchParams.get('error');
  const orderId = searchParams.get('order_id');

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-600">
            Error en el Pago
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Hubo un problema al procesar tu pago.
            </p>
            {orderId && (
              <p className="text-sm text-muted-foreground">
                <strong>ID de orden:</strong> {orderId}
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              No se realizó ningún cargo a tu cuenta.
            </p>
            
            <p className="text-sm text-muted-foreground">
              Puedes intentar nuevamente o contactar al vendedor si el problema persiste.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Button asChild className="w-full">
              <Link to="/tienda">
                <RefreshCw className="w-4 h-4 mr-2" />
                Intentar Nuevamente
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

export default PaymentError;