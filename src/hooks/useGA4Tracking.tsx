import { useEffect } from 'react';
import { GA4_MEASUREMENT_ID } from '@/lib/constants';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

interface GA4Event {
  event_category?: string;
  event_label?: string;
  value?: number;
  tenant_id?: string;
  [key: string]: any;
}

export const useGA4Tracking = (tenantId: string | null) => {
  useEffect(() => {
    if (!tenantId || !GA4_MEASUREMENT_ID) return;

    // Load gtag.js script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());

    // Configure GA4 with custom dimension for tenant_id
    window.gtag('config', GA4_MEASUREMENT_ID, {
      custom_map: {
        dimension1: 'tenant_id'
      },
      tenant_id: tenantId,
      send_page_view: false // We'll manually track page views
    });

    console.log('🎯 [GA4] Initialized for tenant:', tenantId);

    return () => {
      // Cleanup script on unmount
      const scripts = document.querySelectorAll(`script[src*="googletagmanager"]`);
      scripts.forEach(s => s.remove());
    };
  }, [tenantId]);

  const trackPageView = (pagePath: string, pageTitle: string) => {
    if (!window.gtag || !tenantId) return;
    
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle,
      tenant_id: tenantId
    });

    console.log('📄 [GA4] Page view tracked:', { pagePath, pageTitle, tenantId });
  };

  const trackEvent = (eventName: string, eventParams: GA4Event = {}) => {
    if (!window.gtag || !tenantId) return;

    window.gtag('event', eventName, {
      ...eventParams,
      tenant_id: tenantId
    });

    console.log('📊 [GA4] Event tracked:', eventName, eventParams);
  };

  const trackProductView = (product: any) => {
    if (!window.gtag || !tenantId) return;

    window.gtag('event', 'view_item', {
      currency: 'MXN',
      value: product.price_mxn || product.price,
      items: [{
        item_id: product.id,
        item_name: product.title || product.name,
        price: product.price_mxn || product.price
      }],
      tenant_id: tenantId
    });

    console.log('👁️ [GA4] Product view tracked:', product.title || product.name);
  };

  const trackAddToCart = (product: any, quantity: number = 1) => {
    if (!window.gtag || !tenantId) return;

    window.gtag('event', 'add_to_cart', {
      currency: 'MXN',
      value: (product.price_mxn || product.price) * quantity,
      items: [{
        item_id: product.id,
        item_name: product.title || product.name,
        price: product.price_mxn || product.price,
        quantity: quantity
      }],
      tenant_id: tenantId
    });

    console.log('🛒 [GA4] Add to cart tracked:', product.title || product.name, 'x', quantity);
  };

  const trackPurchase = (orderId: string, total: number, items: any[]) => {
    if (!window.gtag || !tenantId) return;

    window.gtag('event', 'purchase', {
      transaction_id: orderId,
      currency: 'MXN',
      value: total,
      items: items.map(item => ({
        item_id: item.product_id || item.id,
        item_name: item.title || item.name,
        price: item.price_mxn || item.price,
        quantity: item.qty || item.quantity || 1
      })),
      tenant_id: tenantId
    });

    console.log('💰 [GA4] Purchase tracked:', orderId, total);
  };

  return {
    trackPageView,
    trackEvent,
    trackProductView,
    trackAddToCart,
    trackPurchase
  };
};
