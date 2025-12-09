import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { processWhatsAppMessage } from '@/utils/whatsappMessage';

interface WhatsAppPreviewProps {
  template: string;
}

export const WhatsAppPreview = ({ template }: WhatsAppPreviewProps) => {
  // Sample product data for preview
  const sampleProduct = {
    title: "Producto de Ejemplo",
    sku: "PROD-001",
    price_mxn: 299
  };

  const sampleCustomer = {
    name: "Cliente Ejemplo",
    phone: "+521234567890",
    email: "cliente@ejemplo.com"
  };

  const processedMessage = processWhatsAppMessage(template, sampleProduct, sampleCustomer);

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Preview: Mensaje WhatsApp</CardTitle>
          <Badge variant="outline" className="text-xs">Con variables</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          {/* WhatsApp-style message bubble */}
          <div className="bg-white border border-green-300 rounded-lg p-3 shadow-sm">
            <div className="space-y-1">
              {processedMessage.split('\n').map((line, index) => (
                <div key={index} className="text-sm text-gray-800">
                  {line || '\u00A0'}
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-xs text-gray-500">
                {new Date().toLocaleTimeString('es-MX', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          </div>
          <div className="text-xs text-green-700 mt-2 text-center">
            Variables disponibles: {'{product_name}'}, {'{sku}'}, {'{price}'}, {'{customer_name}'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};