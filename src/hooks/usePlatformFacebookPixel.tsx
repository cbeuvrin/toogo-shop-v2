import { useEffect } from 'react';
import { FACEBOOK_PIXEL_ID } from '@/lib/constants';

// Extend Window interface to include Facebook Pixel
declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

interface FacebookEventParams {
  content_ids?: string[];
  content_type?: string;
  content_name?: string;
  value?: number;
  currency?: string;
  num_items?: number;
  [key: string]: any;
}

export const usePlatformFacebookPixel = () => {
  useEffect(() => {
    if (!FACEBOOK_PIXEL_ID) {
      console.warn('🔷 [Facebook Pixel] No Pixel ID configured');
      return;
    }

    // Check if already loaded
    if (window.fbq) {
      console.log('🔷 [Facebook Pixel] Already initialized');
      return;
    }

    console.log('🔷 [Facebook Pixel] Initializing with ID:', FACEBOOK_PIXEL_ID);

    // El stub de cola se crea DE INMEDIATO (los track se encolan y no se
    // pierde ninguno), pero el script de Meta (238KB que PageSpeed marcaba
    // en la ruta crítica) se inyecta hasta que el navegador esté libre o el
    // usuario interactúe — lo que ocurra primero.
    (function(f: any, n?: any) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
    })(window);

    // Encolar init + PageView ya mismo; se envían cuando cargue el script
    window.fbq('init', FACEBOOK_PIXEL_ID);
    window.fbq('track', 'PageView');

    let injected = false;
    const injectScript = () => {
      if (injected) return;
      injected = true;
      const t = document.createElement('script');
      t.async = true;
      t.src = 'https://connect.facebook.net/en_US/fbevents.js';
      const s = document.getElementsByTagName('script')[0];
      s.parentNode?.insertBefore(t, s);
      console.log('🔷 [Facebook Pixel] Script injected (deferred)');
      window.removeEventListener('pointerdown', injectScript);
      window.removeEventListener('scroll', injectScript);
      window.removeEventListener('keydown', injectScript);
    };
    window.addEventListener('pointerdown', injectScript, { once: true, passive: true });
    window.addEventListener('scroll', injectScript, { once: true, passive: true });
    window.addEventListener('keydown', injectScript, { once: true });
    // El respaldo automático espera al evento load: en móvil lento el timer
    // desde el mount caía ANTES de load y Lighthouse volvía a contar los
    // 238KB de Meta dentro de la carga de la página.
    const armIdleFallback = () => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(injectScript, { timeout: 3000 });
      } else {
        setTimeout(injectScript, 3000);
      }
    };
    if (document.readyState === 'complete') {
      armIdleFallback();
    } else {
      window.addEventListener('load', armIdleFallback, { once: true });
    }

    console.log('🔷 [Facebook Pixel] Queue ready, PageView queued');

    // Cleanup function
    return () => {
      window.removeEventListener('pointerdown', injectScript);
      window.removeEventListener('scroll', injectScript);
      window.removeEventListener('keydown', injectScript);
      const script = document.querySelector('script[src*="fbevents.js"]');
      if (script) {
        script.remove();
      }
    };
  }, []);

  const trackPageView = (pagePath: string, pageTitle: string) => {
    if (!window.fbq) {
      console.warn('🔷 [Facebook Pixel] Not initialized - cannot track PageView');
      return;
    }

    console.log('🔷 [Facebook Pixel] PageView tracked:', { pagePath, pageTitle });
    window.fbq('track', 'PageView');
  };

  const trackLead = (eventSource: string, metadata: any = {}) => {
    if (!window.fbq) {
      console.warn('🔷 [Facebook Pixel] Not initialized - cannot track Lead');
      return;
    }

    console.log('🔷 [Facebook Pixel] Lead tracked:', eventSource, metadata);
    window.fbq('track', 'Lead', {
      source: eventSource,
      ...metadata
    });
  };

  const trackCompleteRegistration = (email: string, subdomain: string) => {
    if (!window.fbq) {
      console.warn('🔷 [Facebook Pixel] Not initialized - cannot track CompleteRegistration');
      return;
    }

    console.log('🔷 [Facebook Pixel] CompleteRegistration tracked:', { email, subdomain });
    window.fbq('track', 'CompleteRegistration', {
      content_name: 'Free Subdomain Signup',
      status: 'completed',
      subdomain
    });
  };

  const trackInitiateCheckout = (planType: string, metadata: any = {}) => {
    if (!window.fbq) {
      console.warn('🔷 [Facebook Pixel] Not initialized - cannot track InitiateCheckout');
      return;
    }

    console.log('🔷 [Facebook Pixel] InitiateCheckout tracked:', planType, metadata);
    window.fbq('track', 'InitiateCheckout', {
      content_name: planType,
      ...metadata
    });
  };

  const trackPurchase = (orderId: string, value: number, planType: string, currency: string = 'MXN') => {
    if (!window.fbq) {
      console.warn('🔷 [Facebook Pixel] Not initialized - cannot track Purchase');
      return;
    }

    console.log('🔷 [Facebook Pixel] Purchase tracked:', { orderId, value, planType, currency });
    window.fbq('track', 'Purchase', {
      value,
      currency,
      content_name: planType,
      content_type: 'product',
      order_id: orderId
    });
  };

  const trackViewContent = (contentName: string, contentType: string = 'article', metadata: any = {}) => {
    if (!window.fbq) {
      console.warn('🔷 [Facebook Pixel] Not initialized - cannot track ViewContent');
      return;
    }

    console.log('🔷 [Facebook Pixel] ViewContent tracked:', { contentName, contentType });
    window.fbq('track', 'ViewContent', {
      content_name: contentName,
      content_type: contentType,
      ...metadata
    });
  };

  const trackCustomEvent = (eventName: string, params: FacebookEventParams = {}) => {
    if (!window.fbq) {
      console.warn('🔷 [Facebook Pixel] Not initialized - cannot track custom event:', eventName);
      return;
    }

    console.log('🔷 [Facebook Pixel] Custom event tracked:', eventName, params);
    window.fbq('trackCustom', eventName, params);
  };

  return {
    trackPageView,
    trackLead,
    trackCompleteRegistration,
    trackInitiateCheckout,
    trackPurchase,
    trackViewContent,
    trackCustomEvent
  };
};
