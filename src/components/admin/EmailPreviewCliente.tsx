import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import toogoMascot from '@/assets/toogo-mascot.png';

interface OrderData {
  orderNumber: string;
  date: string;
  status: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  paymentReference?: string;
}

interface CustomerData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

interface EmailPreviewClienteProps {
  template: {
    subject: string;
    greeting: string;
    mainMessage: string;
    footerMessage: string;
  };
  tenantLogo?: string;
  storeName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  orderData?: OrderData;
  customerData?: CustomerData;
}

export const EmailPreviewCliente = ({ 
  template, 
  tenantLogo, 
  storeName = "Mi Tienda", 
  primaryColor = "#000000", 
  secondaryColor = "#ffffff",
  orderData,
  customerData
}: EmailPreviewClienteProps) => {
  // Default sample data for preview
  const defaultOrderData: OrderData = {
    orderNumber: "TG-001234",
    date: "30 de Septiembre, 2024",
    status: "Confirmado",
    items: [
      { name: "Producto Ejemplo 1", quantity: 2, price: 150, subtotal: 300 },
      { name: "Producto Ejemplo 2", quantity: 1, price: 250, subtotal: 250 }
    ],
    subtotal: 550,
    shipping: 99,
    total: 649,
    paymentMethod: "MercadoPago",
    paymentReference: "MP123456789"
  };

  const defaultCustomerData: CustomerData = {
    name: "María González",
    email: "maria@ejemplo.com",
    phone: "+52 55 1234 5678",
    address: "Calle Ejemplo 123, Ciudad de México"
  };

  const order = orderData || defaultOrderData;
  const customer = customerData || defaultCustomerData;

  // Helper function to replace variables in text
  const replaceVariables = (text: string): string => {
    return text
      .replace(/{nombre_cliente}/g, customer.name)
      .replace(/{numero_orden}/g, order.orderNumber)
      .replace(/{fecha_pedido}/g, order.date)
      .replace(/{total_pedido}/g, `$${order.total} MXN`)
      .replace(/{nombre_tienda}/g, storeName);
  };

  // Provide default content if template fields are empty
  const getDisplayValue = (value: string, defaultValue: string): string => {
    return value.trim() || defaultValue;
  };
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Preview: Email a Cliente</CardTitle>
          <Badge variant="outline" className="text-xs">Estilo WooCommerce</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-background border rounded-lg p-6 space-y-4 text-sm">
          {/* Header with Tenant Logo */}
          <div className="border-b pb-4 mb-4">
            <div 
              className="flex items-center justify-center h-12 rounded mb-3"
              style={{ backgroundColor: `${secondaryColor}20` }}
            >
              {tenantLogo ? (
                <img 
                  src={tenantLogo} 
                  alt={`${storeName} Logo`}
                  className="h-8 object-contain"
                />
              ) : (
                <div 
                  className="font-bold text-lg"
                  style={{ color: primaryColor }}
                >
                  {storeName}
                </div>
              )}
            </div>
            <h3 
              className="font-semibold text-center text-lg"
              style={{ color: primaryColor }}
            >
              {replaceVariables(getDisplayValue(template.subject, "Confirmación de tu pedido #{numero_orden}"))}
            </h3>
          </div>

          {/* Customer Greeting - Customizable */}
          <div className="mb-4">
            <p className="text-foreground leading-relaxed">
              {replaceVariables(getDisplayValue(template.greeting, "¡Hola {nombre_cliente}! Gracias por tu pedido en {nombre_tienda}."))}
            </p>
          </div>

          {/* Custom Main Message - Customizable */}
          {template.mainMessage && (
            <div 
              className="p-4 rounded-lg border mb-4"
              style={{ 
                backgroundColor: `${primaryColor}08`,
                borderColor: `${primaryColor}20`
              }}
            >
              <p 
                className="font-medium leading-relaxed"
                style={{ color: primaryColor }}
              >
                {replaceVariables(template.mainMessage)}
              </p>
            </div>
          )}

          {/* Order Information - FIXED SECTION */}
          <div className="bg-muted/30 rounded-lg p-4 mb-4">
            <h4 className="font-semibold mb-3" style={{ color: primaryColor }}>
              Información del Pedido
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div>
                <span className="text-muted-foreground">Número de Pedido:</span>
                <div className="font-medium">{order.orderNumber}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha:</span>
                <div className="font-medium">{order.date}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <div className="font-medium">{customer.name}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <div className="font-medium text-green-600">{order.status}</div>
              </div>
            </div>

            {/* Customer Contact Info */}
            <div className="border-t pt-3 mb-4">
              <div className="text-xs space-y-1">
                <div><span className="text-muted-foreground">Email:</span> {customer.email}</div>
                {customer.phone && <div><span className="text-muted-foreground">Teléfono:</span> {customer.phone}</div>}
                {customer.address && <div><span className="text-muted-foreground">Dirección:</span> {customer.address}</div>}
              </div>
            </div>
          </div>

          {/* Products Table - FIXED SECTION */}
          <div className="border rounded-lg overflow-hidden mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3 font-medium">Producto</th>
                  <th className="text-center p-3 font-medium">Cant.</th>
                  <th className="text-right p-3 font-medium">Precio</th>
                  <th className="text-right p-3 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3 text-center">{item.quantity}</td>
                    <td className="p-3 text-right">${item.price} MXN</td>
                    <td className="p-3 text-right font-medium">${item.subtotal} MXN</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Order Totals - FIXED SECTION */}
          <div className="border rounded-lg p-4 mb-4">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${order.subtotal} MXN</span>
              </div>
              <div className="flex justify-between">
                <span>Envío:</span>
                <span>${order.shipping} MXN</span>
              </div>
              <div 
                className="flex justify-between font-bold text-sm pt-2 border-t"
                style={{ color: primaryColor }}
              >
                <span>Total:</span>
                <span>${order.total} MXN</span>
              </div>
            </div>
          </div>

          {/* Payment Information - FIXED SECTION */}
          <div className="bg-muted/20 rounded-lg p-4 mb-4">
            <h4 className="font-semibold mb-2 text-xs" style={{ color: primaryColor }}>
              Información de Pago
            </h4>
            <div className="text-xs space-y-1">
              <div><span className="text-muted-foreground">Método:</span> {order.paymentMethod}</div>
              {order.paymentReference && (
                <div><span className="text-muted-foreground">Referencia:</span> {order.paymentReference}</div>
              )}
            </div>
          </div>

          {/* Footer Message - Customizable */}
          {template.footerMessage && (
            <div className="text-center pt-4 border-t">
              <p className="text-muted-foreground text-xs leading-relaxed">
                {replaceVariables(template.footerMessage)}
              </p>
            </div>
          )}
          
          {/* Small Mascot Footer */}
          <a 
            href="https://toogo.store" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center pt-4 mt-4 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <img 
              src={toogoMascot} 
              alt="Toogo Mascot" 
              className="h-6 w-6 object-contain opacity-60"
            />
            <span className="text-xs text-muted-foreground ml-1">by Toogo</span>
          </a>
        </div>
      </CardContent>
    </Card>
  );
};