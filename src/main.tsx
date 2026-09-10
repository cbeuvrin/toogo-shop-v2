import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Precalentar el chunk lazy de la ruta '/' EN PARALELO con el arranque de
// React. Sin esto, el split de SmartHomePage encadena la red (chunk inicial
// → arranca React → recién pide LandingNueva/Tienda) y el LCP paga un viaje
// extra. Vite deduplica: el React.lazy reutiliza esta misma promesa.
let warmup: Promise<unknown> | null = null;
if (window.location.pathname.replace(/\/$/, '') === '') {
  const h = window.location.hostname;
  const esMarketing = h === 'toogo.store' || h === 'www.toogo.store'
    || h.includes('vercel.app') || h.includes('localhost')
    || h.includes('lovableproject.com') || h.includes('lovable.app');
  warmup = (esMarketing ? import('@/pages/LandingNueva') : import('@/pages/Tienda')).catch(() => {});
}

const mount = () => createRoot(document.getElementById("root")!).render(<App />);

// landing.html (prerender por host, ver scripts/build-landing-html.mjs) trae
// el hero ya pintado en #root y marca window.__prerendered. Si montamos React
// antes de que el chunk lazy de la landing esté listo, el Suspense barrería
// ese DOM con el LoadingScreen — esperamos el warmup (tope 3s por si falla).
if ((window as any).__prerendered && warmup) {
  Promise.race([warmup, new Promise((r) => setTimeout(r, 3000))]).then(mount);
} else {
  mount();
}