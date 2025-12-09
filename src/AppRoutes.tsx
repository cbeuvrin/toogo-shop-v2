import { Routes, Route } from "react-router-dom";
import React, { Suspense } from "react";
import { LoadingScreen } from "./components/ui/LoadingScreen";
import { SmartHomePage } from "./components/SmartHomePage";

// Lazy loading of pages for code splitting optimization
const Index = React.lazy(() => import("./pages/Index"));
const Auth = React.lazy(() => import("./pages/Auth"));
const Tienda = React.lazy(() => import("./pages/Tienda"));
const Catalogo = React.lazy(() => import("./pages/Catalogo"));
const Dashboard3 = React.lazy(() => import("./pages/Dashboard3"));
const Admin = React.lazy(() => import("./pages/Admin"));
const PaymentSuccess = React.lazy(() => import("./pages/PaymentSuccess"));
const PaymentError = React.lazy(() => import("./pages/PaymentError"));
const AuthHandshake = React.lazy(() => import("./pages/AuthHandshake"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const SubdomainAvailablePage = React.lazy(() => import("./pages/SubdomainAvailablePage"));
const TerminosCondiciones = React.lazy(() => import("./pages/TerminosCondiciones"));
const PoliticaPrivacidad = React.lazy(() => import("./pages/PoliticaPrivacidad"));
const LiberacionResponsabilidad = React.lazy(() => import("./pages/LiberacionResponsabilidad"));
const StoreBeingCreated = React.lazy(() => import("./pages/StoreBeingCreated"));
const AyudaConfigurarPagos = React.lazy(() => import("./pages/AyudaConfigurarPagos"));
const Blog = React.lazy(() => import("./pages/Blog"));
const BlogPost = React.lazy(() => import("./pages/BlogPost"));
const Soporte = React.lazy(() => import("./pages/Soporte"));

export const AppRoutes = () => {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <Routes>
                {/* SmartHomePage handles redirection logic */}
                <Route path="/" element={<SmartHomePage />} />

                {/* Lazy loaded routes */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/tienda" element={<Tienda />} />
                <Route path="/catalogo" element={<Catalogo />} />
                <Route path="/dashboard" element={<Dashboard3 />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-error" element={<PaymentError />} />
                <Route path="/store-being-created" element={<StoreBeingCreated />} />
                <Route path="/auth/handshake" element={<AuthHandshake />} />
                <Route path="/subdomain-demo" element={<SubdomainAvailablePage subdomain="test123" />} />
                <Route path="/terminos-condiciones" element={<TerminosCondiciones />} />
                <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
                <Route path="/liberacion-responsabilidad" element={<LiberacionResponsabilidad />} />
                <Route path="/ayuda/configurar-pagos" element={<AyudaConfigurarPagos />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/soporte" element={<Soporte />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
    );
};
