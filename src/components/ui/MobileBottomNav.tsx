import { useState } from "react";
import { ShoppingCart, Mail, MapPin, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
interface MobileBottomNavProps {
  contactData?: {
    whatsapp?: string;
    email?: string;
    address?: string;
  } | null;
  cartItemsCount: number;
  onCartClick: () => void;
  onSearchClick?: () => void;
  onSearchSubmit?: (query: string) => void;
}
export const MobileBottomNav = ({
  contactData,
  cartItemsCount,
  onCartClick,
  onSearchClick,
  onSearchSubmit
}: MobileBottomNavProps) => {
  const [isEmailPanelOpen, setIsEmailPanelOpen] = useState(false);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const openWhatsApp = () => {
    if (!contactData?.whatsapp) return;
    const cleanPhone = contactData.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };
  const openGoogleMaps = () => {
    if (!contactData?.address) return;
    const encodedAddress = encodeURIComponent(contactData.address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };
  const sendEmail = () => {
    if (!contactData?.email) return;
    window.location.href = `mailto:${contactData.email}`;
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim() && onSearchSubmit) {
      onSearchSubmit(searchQuery.trim());
      setIsSearchPanelOpen(false);
      setSearchQuery("");
    }
  };
  return <>
      {/* Email Panel Backdrop */}
      {isEmailPanelOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in" onClick={() => setIsEmailPanelOpen(false)} />}
      
      {/* Search Panel Backdrop */}
      {isSearchPanelOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in" onClick={() => setIsSearchPanelOpen(false)} />}

      {/* Email Panel */}
      {isEmailPanelOpen && contactData?.email && <div className="fixed bottom-20 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 md:hidden animate-slide-in-bottom p-6 my-0 py-[22px] mx-[30px]">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Enviar correo</h3>
            <p className="text-gray-600">{contactData.email}</p>
            <div className="flex gap-3">
            <Button onClick={sendEmail} className="flex-1 bg-black hover:bg-gray-800 text-white">
              Enviar correo
            </Button>
              <Button onClick={() => setIsEmailPanelOpen(false)} variant="outline" className="flex-1">
                Cerrar
              </Button>
            </div>
          </div>
        </div>}

      {/* Search Panel */}
      {isSearchPanelOpen && <div className="fixed bottom-20 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 md:hidden animate-slide-in-bottom p-6 my-0 py-[22px] mx-[30px]">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 text-center">Buscar productos</h3>
            <Input
              type="text"
              placeholder="¿Qué estás buscando?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
              className="w-full"
              autoFocus
            />
            <div className="flex gap-3">
              <Button onClick={handleSearchSubmit} className="flex-1 bg-black hover:bg-gray-800 text-white">
                Buscar
              </Button>
              <Button onClick={() => setIsSearchPanelOpen(false)} variant="outline" className="flex-1">
                Cerrar
              </Button>
            </div>
          </div>
        </div>}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-40 md:hidden">
        <div className="flex items-end justify-around px-4 relative mx-0 py-4">
          {/* WhatsApp Button */}
          <Button onClick={openWhatsApp} disabled={!contactData?.whatsapp} variant="ghost" size="icon" className={cn("flex flex-col items-center justify-center h-12 w-12 rounded-xl transition-all -mt-2 gap-1", !contactData?.whatsapp && "opacity-40 cursor-not-allowed")}>
            <MessageCircle className="h-6 w-6 text-green-600" />
            <span className="text-[10px] text-gray-600 py-0">WhatsApp</span>
          </Button>

          {/* Email Button */}
          <Button onClick={() => setIsEmailPanelOpen(true)} disabled={!contactData?.email} variant="ghost" size="icon" className={cn("flex flex-col items-center justify-center h-12 w-12 rounded-xl transition-all -mt-2 gap-1", !contactData?.email && "opacity-40 cursor-not-allowed")}>
            <Mail className="h-6 w-6 text-blue-600" />
            <span className="text-[10px] text-gray-600">Email</span>
          </Button>

          {/* Cart Button (Center, Elevated) */}
          <div className="relative -mt-9">
            <Button onClick={onCartClick} className="w-16 h-16 rounded-full bg-black hover:bg-gray-800 text-white shadow-2xl hover:shadow-3xl transition-all duration-200 flex items-center justify-center relative">
              <ShoppingCart className="w-10 h-10" />
              {cartItemsCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 min-w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                  {cartItemsCount}
                </Badge>}
            </Button>
          </div>

          {/* Address/Maps Button */}
          <Button onClick={openGoogleMaps} disabled={!contactData?.address} variant="ghost" size="icon" className={cn("flex flex-col items-center justify-center h-12 w-12 rounded-xl transition-all -mt-2 gap-1", !contactData?.address && "opacity-40 cursor-not-allowed")}>
            <MapPin className="h-6 w-6 text-red-600" />
            <span className="text-[10px] text-gray-600">Ubicación</span>
          </Button>

          {/* Search Button */}
          <Button onClick={() => setIsSearchPanelOpen(true)} variant="ghost" size="icon" className="flex flex-col items-center justify-center h-12 w-12 rounded-xl transition-all -mt-2 gap-1">
            <Search className="h-6 w-6 text-gray-600" />
            <span className="text-[10px] text-gray-600">Buscar</span>
          </Button>
        </div>
      </nav>
    </>;
};