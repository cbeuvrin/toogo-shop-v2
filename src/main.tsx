import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Precalentar el chunk lazy de la ruta '/' EN PARALELO con el arranque de
// React. Sin esto, el split de SmartHomePage encadena la red (chunk inicial
// → arranca React → recién pide LandingNueva/Tienda) y el LCP paga un viaje
// extra. Vite deduplica: el React.lazy reutiliza esta misma promesa.
if (window.location.pathname.replace(/\/$/, '') === '') {
  const h = window.location.hostname;
  const esMarketing = h === 'toogo.store' || h === 'www.toogo.store'
    || h.includes('vercel.app') || h.includes('localhost')
    || h.includes('lovableproject.com') || h.includes('lovable.app');
  (esMarketing ? import('@/pages/LandingNueva') : import('@/pages/Tienda')).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);