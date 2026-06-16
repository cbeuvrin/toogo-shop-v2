import React, { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Phone, Mail, User, MapPin, AlertCircle, Truck, MessageCircle, Tag, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useTenantContext } from '@/contexts/TenantContext';
import { LogoDisplay } from '@/components/ui/LogoDisplay';
import { useTenantCoupons } from '@/hooks/useTenantCoupons';
import { EmbeddedStoreCheckoutDialog } from './EmbeddedStoreCheckoutDialog';
import { useNavigate } from 'react-router-dom';
interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
  icon: React.ReactNode;
}
interface ShippingInfo {
  enabled: boolean;
  type: 'free_minimum' | 'flat_rate' | 'zone_based';
  minimumAmount?: number;
  flatRate?: number;
  zonesConfig?: any;
}
interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preloadedConfig?: any;
}
export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  onOpenChange,
  preloadedConfig
}) => {
  const {
    items,
    totalPrice,
    clearCart
  } = useCart();
  const {
    toast
  } = useToast();
  const {
    settings
  } = useTenantSettings();
  const {
    currentTenantId
  } = useTenantContext();
  const {
    validateStoreCoupon,
    isLoading: couponLoading
  } = useTenantCoupons();
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [bricksOpen, setBricksOpen] = useState(false);
  const navigate = useNavigate();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [shippingCost, setShippingCost] = useState(0);
  // Logo resolved from the public RPC (so it shows for anonymous buyers too).
  const [storeLogo, setStoreLogo] = useState<{ url?: string | null; size?: number | null }>({});

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // totalPrice is always a plain number from CartContext
  const cartTotalMxn = typeof totalPrice === 'number' ? totalPrice : 0;
  const exchange = settings?.exchange_rate_value || 20;
  const cartTotalUsd = exchange > 0 ? cartTotalMxn / exchange : 0;
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    state: ''
  });

  // Load available payment methods and shipping settings
  useEffect(() => {
    if (preloadedConfig) {
      loadPreloadedConfig();
    } else if (open && currentTenantId) {
      // loadPaymentMethods now reads payment methods, logo AND shipping from the
      // public RPC in one shot (works for anonymous buyers; RLS-safe).
      loadPaymentMethods();
    }
  }, [open, currentTenantId, preloadedConfig]);

  // Calculate shipping cost when relevant data changes
  useEffect(() => {
    if (shippingInfo && shippingInfo.enabled) {
      calculateShippingCost();
    } else {
      setShippingCost(0);
    }
  }, [shippingInfo, customerData.state, cartTotalMxn]);
  const loadPaymentMethods = async () => {
    if (!currentTenantId) {
      console.error('No tenant ID available for loading payment methods');
      return;
    }
    try {
      // Read the store config through the public SECURITY DEFINER RPC. Direct table
      // reads (tenant_payment_integrations / tenant_settings) are blocked by RLS for
      // anonymous buyers, which is exactly who is checking out — so a store that
      // connected MercadoPago via OAuth used to see "No hay métodos de pago".
      const { data, error } = await (supabase as any).rpc('get_public_store_data_demo', {
        p_tenant_id: currentTenantId
      });
      if (error || !data?.ok) {
        console.error('Error loading storefront config:', error || data?.error);
        return;
      }
      const settings = data.settings || {};
      const providers: string[] = Array.isArray(settings.payment_providers) ? settings.payment_providers : [];
      const methods: PaymentMethod[] = [];

      // MercadoPago: active OAuth integration OR a legacy public key.
      if (providers.includes('mercadopago') || settings.mercadopago_public_key) {
        methods.push({ id: 'mercadopago', name: 'MercadoPago', enabled: true, icon: <CreditCard className="w-5 h-5" /> });
      }
      // PayPal: active OAuth integration OR legacy client id.
      if (providers.includes('paypal') || settings.paypal_client_id) {
        methods.push({ id: 'paypal', name: 'PayPal', enabled: true, icon: <CreditCard className="w-5 h-5" /> });
      }
      if (settings.whatsapp_number) {
        methods.push({ id: 'whatsapp', name: 'WhatsApp (Pago manual)', enabled: true, icon: <Phone className="w-5 h-5" /> });
      }
      console.log('Available payment methods:', methods);
      setPaymentMethods(methods);
      if (methods.length > 0) {
        // Auto-select WhatsApp if it's the only option
        setSelectedPaymentMethod(methods.length === 1 && methods[0].id === 'whatsapp' ? 'whatsapp' : methods[0].id);
      }

      // Logo (so it shows for anonymous buyers, not the "LOGO" placeholder).
      setStoreLogo({ url: settings.logo_url, size: settings.logo_size });

      // Shipping (same RLS reason — read it from the RPC instead of the table).
      setShippingInfo({
        enabled: settings.shipping_enabled || false,
        type: (settings.shipping_type as 'free_minimum' | 'flat_rate' | 'zone_based') || 'free_minimum',
        minimumAmount: settings.shipping_minimum_amount,
        flatRate: settings.shipping_flat_rate,
        zonesConfig: settings.shipping_zones_config
      });
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los métodos de pago",
        variant: "destructive"
      });
    }
  };
  const loadShippingSettings = async () => {
    if (!currentTenantId) {
      console.error('No tenant ID available for loading shipping settings');
      return;
    }
    try {
      const {
        data: settings,
        error
      } = await (supabase as any).from('tenant_settings').select('shipping_enabled, shipping_type, shipping_minimum_amount, shipping_flat_rate, shipping_zones_config').eq('tenant_id', currentTenantId).maybeSingle();
      if (error) {
        console.error('Error loading shipping settings:', error);
        return;
      }
      if (settings) {
        const shippingType = (settings as any).shipping_type as 'free_minimum' | 'flat_rate' | 'zone_based';
        setShippingInfo({
          enabled: (settings as any).shipping_enabled || false,
          type: shippingType || 'free_minimum',
          minimumAmount: (settings as any).shipping_minimum_amount,
          flatRate: (settings as any).shipping_flat_rate,
          zonesConfig: (settings as any).shipping_zones_config
        });
      }
    } catch (error) {
      console.error('Error loading shipping settings:', error);
    }
  };
  const calculateShippingCost = () => {
    if (!shippingInfo || !shippingInfo.enabled) {
      setShippingCost(0);
      return;
    }
    switch (shippingInfo.type) {
      case 'free_minimum':
        if (shippingInfo.minimumAmount && cartTotalMxn >= shippingInfo.minimumAmount) {
          setShippingCost(0);
        } else {
          // If minimum not reached, charge default shipping cost
          setShippingCost(100); // Default shipping cost of $100 MXN
        }
        break;
      case 'flat_rate':
        setShippingCost(shippingInfo.flatRate || 0);
        break;
      case 'zone_based':
        if (customerData.state && shippingInfo.zonesConfig?.zones?.[customerData.state]) {
          setShippingCost(shippingInfo.zonesConfig.zones[customerData.state]);
        } else {
          setShippingCost(shippingInfo.zonesConfig?.default_rate || 0);
        }
        break;
      default:
        setShippingCost(0);
    }
  };

  const loadPreloadedConfig = () => {
    if (!preloadedConfig) return;

    // Check if paymentMethods array is provided directly (from Catalogo/Tienda)
    if (Array.isArray(preloadedConfig.paymentMethods)) {
      const methods = preloadedConfig.paymentMethods.map((pm: any) => ({
        ...pm,
        icon: pm.id === 'whatsapp'
          ? <Phone className="w-5 h-5" />
          : <CreditCard className="w-5 h-5" />
      }));
      setPaymentMethods(methods);

      if (methods.length > 0) {
        if (methods.length === 1 && methods[0].id === 'whatsapp') {
          setSelectedPaymentMethod('whatsapp');
        } else {
          setSelectedPaymentMethod(methods[0].id);
        }
      }
    } else {
      // Fallback: build from individual keys
      const methods: PaymentMethod[] = [];

      if (preloadedConfig.mercadopago_public_key) {
        methods.push({
          id: 'mercadopago',
          name: 'MercadoPago',
          enabled: true,
          icon: <CreditCard className="w-5 h-5" />
        });
      }

      if (preloadedConfig.paypal_client_id) {
        methods.push({
          id: 'paypal',
          name: 'PayPal',
          enabled: true,
          icon: <CreditCard className="w-5 h-5" />
        });
      }

      if (preloadedConfig.whatsapp_number) {
        methods.push({
          id: 'whatsapp',
          name: 'WhatsApp (Pago manual)',
          enabled: true,
          icon: <Phone className="w-5 h-5" />
        });
      }

      setPaymentMethods(methods);

      if (methods.length > 0) {
        if (methods.length === 1 && methods[0].id === 'whatsapp') {
          setSelectedPaymentMethod('whatsapp');
        } else {
          setSelectedPaymentMethod(methods[0].id);
        }
      }
    }

    // Check if shippingInfo object is provided directly
    if (preloadedConfig.shippingInfo) {
      setShippingInfo(preloadedConfig.shippingInfo);
    } else if (preloadedConfig.shipping_enabled !== undefined) {
      setShippingInfo({
        enabled: preloadedConfig.shipping_enabled,
        type: preloadedConfig.shipping_type || 'free_minimum',
        minimumAmount: preloadedConfig.shipping_minimum_amount,
        flatRate: preloadedConfig.shipping_flat_rate,
        zonesConfig: preloadedConfig.shipping_zones_config
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentMethod) {
      toast({
        title: "Error",
        description: "Selecciona un método de pago",
        variant: "destructive"
      });
      return;
    }

    // Simplified validation for WhatsApp-only without shipping
    const requiresAddress = !isWhatsAppOnly || shippingInfo?.enabled;
    if (!customerData.name || !customerData.email || !customerData.phone) {
      toast({
        title: "Error",
        description: "Completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }
    if (requiresAddress && !customerData.address) {
      toast({
        title: "Error",
        description: "La dirección es requerida",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      if (selectedPaymentMethod === 'whatsapp') {
        // Handle WhatsApp manual payment
        await handleWhatsAppPayment();
      } else {
        // Handle automated payment providers
        await handleAutomatedPayment();
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: "Error al procesar el pago. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleWhatsAppPayment = async () => {
    // Create order with pending status
    const {
      data,
      error
    } = await supabase.functions.invoke('create-order', {
      body: {
        tenant_id: currentTenantId,
        items: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price_mxn: item.price_mxn,
          price_usd: exchange > 0 ? item.price_mxn / exchange : 0,
          variation_id: item.variation_id || null
        })),
        customer: customerData,
        payment_method: 'whatsapp',
        total_mxn: finalTotal,
        total_usd: exchange > 0 ? finalTotal / exchange : 0,
        shipping_cost: shippingCost,
        store_coupon_id: appliedCoupon?.coupon_id,
        store_discount_amount: couponDiscount
      }
    });
    if (error) throw error;

    // SECURITY: Use RPC function to get WhatsApp settings
    const {
      data: settings,
      error: settingsError
    } = await supabase.rpc('get_tenant_payment_settings', {
      p_tenant_id: currentTenantId
    });
    if (settingsError) {
      console.error('Error fetching WhatsApp settings:', settingsError);
    }
    if ((settings as any)?.whatsapp_number) {
      const orderSummary = items.map(item => `${item.quantity}x ${item.title} - $${item.price_mxn} MXN`).join('\n');
      // Use finalTotal from outer scope (it correctly includes coupon discount)

      // Create message based on context - different for WhatsApp-only vs selected among multiple
      let messageTemplate;
      if (paymentMethods.length === 1 && paymentMethods[0].id === 'whatsapp') {
        // WhatsApp-only scenario - simpler, more natural message
        messageTemplate = (settings as any).whatsapp_message || `Hola 👋, me interesa realizar esta compra:\n\n` + `*Productos:*\n{products_list}\n\n` + `*Total:* $${finalTotal.toFixed(2)} MXN\n\n` + `*Mis datos:*\n` + `📱 {customer_phone}\n` + `📧 {customer_email}\n` + `👤 {customer_name}\n` + (customerData.address ? `📍 {customer_address}\n` : '') + `\n¿Está disponible y cuáles son las formas de pago?`;
      } else {
        // WhatsApp selected among multiple options - more formal order format
        messageTemplate = (settings as any).whatsapp_message || `🛍️ *Nueva Orden*\n\n` + `*Cliente:* {customer_name}\n` + `*Email:* {customer_email}\n` + `*Teléfono:* {customer_phone}\n` + `*Dirección:* {customer_address}\n` + (customerData.state ? `*Estado:* {customer_state}\n` : '') + `\n*Productos:*\n{products_list}\n\n` + `*Subtotal:* ${cartTotalMxn.toFixed(2)} MXN\n` + (shippingCost > 0 ? `*Envío:* $${shippingCost.toFixed(2)} MXN\n` : `*Envío:* Gratis\n`) + `*Total:* $${finalTotal.toFixed(2)} MXN`;
      }

      // Replace variables in the message template
      const message = messageTemplate.replace(/{customer_name}/g, customerData.name).replace(/{customer_email}/g, customerData.email).replace(/{customer_phone}/g, customerData.phone).replace(/{customer_address}/g, customerData.address).replace(/{customer_state}/g, customerData.state || '').replace(/{products_list}/g, orderSummary).replace(/{product_name}/g, items[0]?.title || 'Producto').replace(/{price}/g, `$${finalTotal.toFixed(2)} MXN`).replace(/{order_total}/g, `$${finalTotal.toFixed(2)} MXN`);
      const whatsappUrl = `https://wa.me/${(settings as any).whatsapp_number}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      toast({
        title: "Orden creada",
        description: "Tu orden ha sido registrada. Se abrió WhatsApp para completar el pago."
      });
      clearCart();
      onOpenChange(false);
    } else {
      // Número de WhatsApp no disponible — avisar sin borrar el carrito
      console.error('WhatsApp number not found in tenant settings after order creation');
      toast({
        title: "Orden registrada",
        description: "Tu orden fue guardada, pero no se pudo abrir WhatsApp. Contacta a la tienda directamente.",
        variant: "destructive"
      });
    }
  };
  const handleAutomatedPayment = async () => {
    // MercadoPago uses the embedded Bricks dialog (no redirect).
    if (selectedPaymentMethod === 'mercadopago') {
      setBricksOpen(true);
      return;
    }

    // Other automated providers (PayPal) still use the redirect flow.
    const {
      data,
      error
    } = await supabase.functions.invoke('create-customer-checkout', {
      body: {
        tenant_id: currentTenantId,
        items: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price_mxn: item.price_mxn,
          price_usd: exchange > 0 ? item.price_mxn / exchange : 0,
          title: item.title,
          variation_id: item.variation_id || null
        })),
        customer: customerData,
        payment_method: selectedPaymentMethod,
        total_mxn: cartTotalMxn + shippingCost,
        total_usd: cartTotalUsd,
        shipping_cost: shippingCost
      }
    });
    if (error) throw error;
    if (data.url) {
      window.open(data.url, '_blank');
      toast({
        title: "Redirigiendo al pago",
        description: "Se ha abierto una nueva ventana para completar tu pago"
      });
      setTimeout(() => {
        clearCart();
        onOpenChange(false);
      }, 2000);
    }
  };

  const handleBricksSuccess = (result: { order_id: string; payment_id: string; total_mxn: number; platform_fee_mxn: number }) => {
    clearCart();
    setBricksOpen(false);
    onOpenChange(false);
    navigate(`/payment-success?order_id=${result.order_id}`);
  };
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !currentTenantId) {
      toast({
        title: "Error",
        description: "Ingresa un código de cupón",
        variant: "destructive"
      });
      return;
    }
    const cartItems = items.map(item => ({
      product_id: item.id,
      category_ids: [],
      // Aquí podrías agregar las categorías del producto si las tienes
      quantity: item.quantity,
      price: item.price_mxn
    }));
    const result = await validateStoreCoupon(couponCode, currentTenantId, cartItems);
    if (result.valid) {
      setAppliedCoupon(result);
      setCouponDiscount(result.discount_amount);
      toast({
        title: "¡Cupón aplicado!",
        description: `Ahorro de $${result.discount_amount.toFixed(2)} MXN`
      });
    } else {
      toast({
        title: "Cupón inválido",
        description: result.error || "El cupón no pudo ser aplicado",
        variant: "destructive"
      });
    }
  };
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode('');
    toast({
      title: "Cupón removido",
      description: "El descuento ha sido eliminado"
    });
  };
  const mexicanStates = ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"];
  const finalTotal = cartTotalMxn + shippingCost - couponDiscount;

  // Detect WhatsApp-only scenario
  const isWhatsAppOnly = paymentMethods.length === 1 && paymentMethods[0]?.id === 'whatsapp';
  const isWhatsAppSelected = selectedPaymentMethod === 'whatsapp';

  // Determine modal title based on payment method
  const getModalTitle = () => {
    if (isWhatsAppOnly) return 'Contactar Vendedor';
    if (isWhatsAppSelected) return 'Contactar por WhatsApp';
    return 'Finalizar Compra';
  };

  // Determine button text and icon based on payment method
  const getButtonConfig = () => {
    if (isWhatsAppOnly) {
      return {
        text: 'Contactar por WhatsApp',
        icon: <MessageCircle className="w-5 h-5" />
      };
    }
    if (isWhatsAppSelected) {
      return {
        text: 'Enviar mensaje',
        icon: <MessageCircle className="w-5 h-5" />
      };
    }
    return {
      text: `Pagar $${finalTotal.toFixed(2)} MXN`,
      icon: <CreditCard className="w-5 h-5" />
    };
  };
  const buttonConfig = getButtonConfig();
  return <>
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[768px] max-w-[768px] max-h-[90vh] overflow-hidden p-4 sm:p-6">
      <DialogHeader>
        {/* Title left, logo right — in one row so the logo never overlaps the
            order summary below. The logo is capped (height + width) because the
            store's configured logo_size is meant for the storefront header and
            is too large for a modal; pr-8 keeps it clear of the dialog close (X). */}
        <div className="flex items-start justify-between gap-3 pr-8">
          <DialogTitle className="flex items-center gap-2">
            {isWhatsAppOnly || isWhatsAppSelected ? <MessageCircle className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            {getModalTitle()}
          </DialogTitle>
          <LogoDisplay
            size="sm"
            fallbackText="Logo"
            disableFetch
            tenantId={preloadedConfig?.tenant_id || currentTenantId}
            logoUrl={preloadedConfig?.logoUrl || preloadedConfig?.logo_url || storeLogo.url || undefined}
            className="max-h-9 max-w-[120px] w-auto object-contain shrink-0"
          />
        </div>
      </DialogHeader>

      <ScrollArea className="max-h-[calc(95vh-120px)]">
        {/* Horizontal padding so the content (cards, inputs, "Aplicar"/buttons)
            isn't flush to the edges; extra on the right clears the scrollbar. */}
        <form onSubmit={handleSubmit} className="space-y-6 px-2 pr-5 sm:px-4 sm:pr-7">
          <div className="grid grid-cols-1 gap-6">
            {/* Left Column - Order Summary & Customer Info */}
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Resumen de la orden</h3>
                <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                  {items.map(item => <div key={item.id} className="flex justify-between text-sm">
                    <span className="flex-1">{item.quantity}x {item.title}</span>
                    <span className="font-medium">${(item.price_mxn * item.quantity).toFixed(2)}</span>
                  </div>)}
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${cartTotalMxn.toFixed(2)} MXN</span>
                    </div>
                    {shippingInfo?.enabled && <div className="space-y-1">
                      <div className="flex justify-between text-sm items-center">
                        <span className="flex items-center gap-2">
                          <Truck className="w-4 h-4 px-0 py-0 my-0 mx-[6px]" />
                          Envío:
                        </span>
                        <span className={shippingCost === 0 ? "text-green-600 font-medium" : ""}>
                          {shippingCost === 0 ? "Gratis" : `$${shippingCost.toFixed(2)} MXN`}
                        </span>
                      </div>
                      {shippingInfo.type === 'free_minimum' && shippingInfo.minimumAmount && cartTotalMxn < shippingInfo.minimumAmount && <div className="text-xs text-muted-foreground text-right">
                        Faltan ${(shippingInfo.minimumAmount - cartTotalMxn).toFixed(2)} MXN para envío gratis
                      </div>}
                    </div>}
                    {couponDiscount > 0 && <div className="flex justify-between text-sm text-green-600 font-medium">
                      <span className="flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Descuento:
                      </span>
                      <span>-${couponDiscount.toFixed(2)} MXN</span>
                    </div>}
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total:</span>
                      <span>${finalTotal.toFixed(2)} MXN</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coupon Section */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Cupón de descuento
                </h3>
                {appliedCoupon ? <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-green-900 dark:text-green-100">
                        {appliedCoupon.coupon_code} aplicado
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Ahorro: ${couponDiscount.toFixed(2)} MXN
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleRemoveCoupon} className="text-green-700 hover:text-green-900">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div> : <div className="flex gap-2">
                  <Input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Código de cupón" className="flex-1" onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())} />
                  <Button type="button" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                    {couponLoading ? 'Validando...' : 'Aplicar'}
                  </Button>
                </div>}
              </div>

              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Información del cliente
                </h3>

                <div className="grid gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-0 py-0">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre completo *</Label>
                      <Input id="name" value={customerData.name} onChange={e => setCustomerData(prev => ({
                        ...prev,
                        name: e.target.value
                      }))} placeholder="Tu nombre" required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono *</Label>
                      <Input id="phone" type="tel" value={customerData.phone} onChange={e => setCustomerData(prev => ({
                        ...prev,
                        phone: e.target.value
                      }))} placeholder="+52 123 456 7890" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={customerData.email} onChange={e => setCustomerData(prev => ({
                      ...prev,
                      email: e.target.value
                    }))} placeholder="tu@email.com" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">
                      Dirección completa {isWhatsAppOnly && !shippingInfo?.enabled ? '' : '*'}
                    </Label>
                    <Input id="address" value={customerData.address} onChange={e => setCustomerData(prev => ({
                      ...prev,
                      address: e.target.value
                    }))} placeholder="Calle, número, colonia, ciudad" required={!isWhatsAppOnly || shippingInfo?.enabled} />
                  </div>

                  {shippingInfo?.enabled && shippingInfo.type === 'zone_based' && <div className="space-y-2">
                    <Label htmlFor="state">Estado *</Label>
                    <select id="state" value={customerData.state} onChange={e => setCustomerData(prev => ({
                      ...prev,
                      state: e.target.value
                    }))} className="w-full p-2 border border-input rounded-md bg-background" required>
                      <option value="">Selecciona tu estado</option>
                      {mexicanStates.map(state => <option key={state} value={state}>{state}</option>)}
                    </select>
                  </div>}
                </div>
              </div>
            </div>

            {/* Right Column - Payment Methods & Actions */}
            <div className="space-y-6">
              {/* Payment Methods - Hide if only WhatsApp is available */}
              {!isWhatsAppOnly && <div className="space-y-4">
                <h3 className="font-medium text-lg">Método de pago</h3>

                {paymentMethods.length === 0 ? <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    No hay métodos de pago configurados. Contacta al administrador.
                  </AlertDescription>
                </Alert> : <div className="space-y-3">
                  {paymentMethods.map(method => <label key={method.id} className="relative block">
                    <input type="radio" name="paymentMethod" value={method.id} checked={selectedPaymentMethod === method.id} onChange={e => setSelectedPaymentMethod(e.target.value)} className="sr-only" />
                    <div className={`
                              flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all
                              ${selectedPaymentMethod === method.id ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:bg-muted/50'}
                            `}>
                      {method.icon}
                      <span className="font-medium flex-1">{method.name}</span>
                      {selectedPaymentMethod === method.id && <Badge variant="default">
                        Seleccionado
                      </Badge>}
                    </div>
                  </label>)}
                </div>}
              </div>}

              {/* Shipping Information */}
              {shippingInfo?.enabled && <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                <h4 className="font-medium flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Información de envío
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  {shippingInfo.type === 'free_minimum' && <p>
                    {shippingInfo.minimumAmount && finalTotal >= shippingInfo.minimumAmount ? `✅ Envío gratis por compra mínima de $${shippingInfo.minimumAmount} MXN` : `Envío gratis con compra mínima de $${shippingInfo.minimumAmount || 0} MXN`}
                  </p>}
                  {shippingInfo.type === 'flat_rate' && <p>📦 Tarifa fija de envío: ${shippingInfo.flatRate || 0} MXN</p>}
                  {shippingInfo.type === 'zone_based' && <p>🗺️ Envío calculado por zona/estado</p>}
                </div>
              </div>}

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <Button type="submit" disabled={loading || paymentMethods.length === 0} className="w-full h-12 text-lg font-medium" size="lg">
                  {loading ? 'Procesando...' : <div className="flex items-center gap-2">
                    {buttonConfig.icon}
                    {buttonConfig.text}
                  </div>}
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </form>
      </ScrollArea>
    </DialogContent>
  </Dialog>

  <EmbeddedStoreCheckoutDialog
    open={bricksOpen}
    onOpenChange={setBricksOpen}
    tenantId={currentTenantId || ''}
    publicKey={preloadedConfig?.mercadopago_public_key || settings?.mercadopago_public_key || ''}
    items={items.map(item => ({
      product_id: item.id,
      title: item.title,
      quantity: item.quantity,
      price_mxn: item.price_mxn,
      price_usd: exchange > 0 ? item.price_mxn / exchange : 0,
      variation_id: item.variation_id || null,
    }))}
    customer={customerData}
    totalMxn={cartTotalMxn + shippingCost - couponDiscount}
    totalUsd={cartTotalUsd}
    shippingCost={shippingCost}
    onSuccess={handleBricksSuccess}
  />
  </>;
};