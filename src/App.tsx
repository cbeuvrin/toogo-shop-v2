import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/contexts/CartContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ScrollToTop } from "./components/ScrollToTop";
import { AppRoutes } from "./AppRoutes";

const queryClient = new QueryClient();

// ErrorBoundary para capturar errores de render
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.group('🔴 ErrorBoundary caught error');
    console.error('Error:', error);
    console.error('Error Info:', info);
    console.error('Stack:', error?.stack);
    console.error('Component Stack:', info?.componentStack);
    console.groupEnd();

    // Guardar en localStorage para debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        componentStack: info.componentStack
      };
      localStorage.setItem('last_error', JSON.stringify(errorLog));
    } catch (e) {
      console.error('Could not save error log:', e);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Algo salió mal. Por favor recarga la página.</h2>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#0EA5E9',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  console.log("App component rendering");

  // Persist PWA source flag across redirects
  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('source') === 'pwa') {
      sessionStorage.setItem('fromPWA', '1');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <HelmetProvider>
          <AuthProvider>
            <TenantProvider>
              <CartProvider>
                <Toaster />
                <Sonner />
                <SpeedInsights />
                <Analytics />
                <BrowserRouter>
                  <ScrollToTop />
                  <ErrorBoundary>
                    <AppRoutes />
                  </ErrorBoundary>
                </BrowserRouter>
              </CartProvider>
            </TenantProvider>
          </AuthProvider>
        </HelmetProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
