import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Tienda from "./pages/Tienda";
import Catalogo from "./pages/Catalogo";
import Dashboard3 from "./pages/Dashboard3";
import Admin from "./pages/Admin";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentError from "./pages/PaymentError";
import AuthHandshake from "./pages/AuthHandshake";
import NotFound from "./pages/NotFound";
import { SmartHomePage } from "./components/SmartHomePage";
import SubdomainAvailablePage from "./pages/SubdomainAvailablePage";
import TerminosCondiciones from "./pages/TerminosCondiciones";
import PoliticaPrivacidad from "./pages/PoliticaPrivacidad";
import LiberacionResponsabilidad from "./pages/LiberacionResponsabilidad";
import StoreBeingCreated from "./pages/StoreBeingCreated";
import AyudaConfigurarPagos from "./pages/AyudaConfigurarPagos";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Soporte from "./pages/Soporte";

export const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<SmartHomePage />} />
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
    );
};
