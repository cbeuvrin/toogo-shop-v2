// Helper function to process WhatsApp message templates
export const processWhatsAppMessage = (
  template: string, 
  product: any, 
  customerData?: { name?: string; phone?: string; email?: string }
): string => {
  const variables = {
    product_name: product.title || product.name || 'Producto',
    sku: product.sku || 'N/A',
    price: product.price_mxn || product.price || 0,
    customer_name: customerData?.name || '',
    customer_phone: customerData?.phone || '',
    customer_email: customerData?.email || ''
  };

  let processedMessage = template;
  
  // Replace all variables in the template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    processedMessage = processedMessage.replace(regex, String(value));
  });

  return processedMessage;
};

// Default WhatsApp message template
export const DEFAULT_WHATSAPP_MESSAGE = `Hola 👋, quisiera más información sobre

📦 {product_name}
SKU: {sku}
Precio: ${'{price}'} MXN

¿Está disponible y cuáles son las formas de pago?`;