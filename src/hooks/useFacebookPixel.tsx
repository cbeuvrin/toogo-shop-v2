import { useEffect } from 'react';

interface FacebookEvent {
  event_id?: string;
  [key: string]: any;
}

export const useFacebookPixel = (tenantId: string | null, pixelId: string | null) => {
  useEffect(() => {
    if (!tenantId || !pixelId) return;

    // Load Facebook Pixel script
    const script1 = document.createElement('script');
    script1.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
    `;
    document.head.appendChild(script1);

    // Initialize pixel
    if (!(window as any).fbq) return;
    (window as any).fbq('init', pixelId);
    (window as any).fbq('track', 'PageView');

    console.log('🔷 [Facebook Pixel] Initialized for tenant:', tenantId, 'Pixel ID:', pixelId);

    return () => {
      const scripts = document.querySelectorAll('script[src*="fbevents.js"]');
      scripts.forEach(s => s.remove());
    };
  }, [tenantId, pixelId]);

  const trackPageView = (pagePath: string, pageTitle: string) => {
    if (!(window as any).fbq || !tenantId) return;
    
    const eventId = `pageview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    (window as any).fbq('track', 'PageView', {}, { eventID: eventId });

    console.log('📄 [Facebook Pixel] Page view tracked:', { pagePath, pageTitle, eventId });
  };

  const trackEvent = (eventName: string, eventParams: FacebookEvent = {}) => {
    if (!(window as any).fbq || !tenantId) return;

    const eventId = eventParams.event_id || `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    (window as any).fbq('track', eventName, eventParams, { eventID: eventId });

    console.log('📊 [Facebook Pixel] Event tracked:', eventName, eventParams);
  };

  const trackProductView = (product: any) => {
    if (!(window as any).fbq || !tenantId) return;

    const eventId = `view_content_${product.id}_${Date.now()}`;

    (window as any).fbq('track', 'ViewContent', {
      content_type: 'product',
      content_ids: [product.id],
      content_name: product.title || product.name,
      value: product.price_mxn || product.price,
      currency: 'MXN'
    }, { eventID: eventId });

    console.log('👁️ [Facebook Pixel] Product view tracked:', product.title || product.name);
  };

  const trackAddToCart = (product: any, quantity: number = 1) => {
    if (!(window as any).fbq || !tenantId) return;

    const eventId = `add_to_cart_${product.id}_${Date.now()}`;

    (window as any).fbq('track', 'AddToCart', {
      content_type: 'product',
      content_ids: [product.id],
      content_name: product.title || product.name,
      value: (product.price_mxn || product.price) * quantity,
      currency: 'MXN',
      num_items: quantity
    }, { eventID: eventId });

    console.log('🛒 [Facebook Pixel] Add to cart tracked:', product.title || product.name, 'x', quantity);
  };

  const trackInitiateCheckout = (items: any[], total: number) => {
    if (!(window as any).fbq || !tenantId) return;

    const eventId = `initiate_checkout_${Date.now()}`;

    (window as any).fbq('track', 'InitiateCheckout', {
      content_type: 'product',
      content_ids: items.map(item => item.id || item.product_id),
      num_items: items.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0),
      value: total,
      currency: 'MXN'
    }, { eventID: eventId });

    console.log('💳 [Facebook Pixel] Initiate checkout tracked:', total);
  };

  const trackPurchase = (orderId: string, total: number, items: any[]) => {
    if (!(window as any).fbq || !tenantId) return;

    const eventId = `purchase_${orderId}_${Date.now()}`;

    (window as any).fbq('track', 'Purchase', {
      content_type: 'product',
      content_ids: items.map(item => item.product_id || item.id),
      num_items: items.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0),
      value: total,
      currency: 'MXN'
    }, { eventID: eventId });

    console.log('💰 [Facebook Pixel] Purchase tracked:', orderId, total);
  };

  return {
    trackPageView,
    trackEvent,
    trackProductView,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase
  };
};
