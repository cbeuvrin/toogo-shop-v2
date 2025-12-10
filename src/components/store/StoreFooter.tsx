import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StoreFooterProps {
    tenant: {
        name: string;
        id: string;
    } | null;
    settings: any;
}

export const StoreFooter = ({ tenant, settings }: StoreFooterProps) => {
    const [openModal, setOpenModal] = useState<string | null>(null);

    const currentYear = new Date().getFullYear();
    const storeName = tenant?.name || "Tienda";

    // Generic templates for legal content
    const getLegalContent = (type: string) => {
        if (type === 'terms') {
            if (settings?.terms_text) {
                return <div className="text-sm text-gray-600 whitespace-pre-wrap">{settings.terms_text}</div>;
            }
            return (
                <div className="space-y-4 text-sm text-gray-600">
                    <p>Bienvenido a {storeName}. Al utilizar nuestro sitio web, aceptas cumplir con los siguientes términos y condiciones de uso.</p>

                    <h3 className="font-semibold text-gray-900 mt-4">1. Uso del Sitio</h3>
                    <p>El contenido de las páginas de este sitio web es para tu información y uso general únicamente. Está sujeto a cambios sin previo aviso.</p>

                    <h3 className="font-semibold text-gray-900 mt-4">2. Productos y Precios</h3>
                    <p>Nos esforzamos por mostrar con precisión los colores y las imágenes de nuestros productos. Sin embargo, no podemos garantizar que la visualización del monitor de tu computadora de cualquier color sea precisa. Nos reservamos el derecho de limitar las cantidades de cualquier producto o servicio que ofrecemos.</p>

                    <h3 className="font-semibold text-gray-900 mt-4">3. Envíos y Devoluciones</h3>
                    <p>Los envíos están sujetos a la disponibilidad del producto y a la zona de cobertura. Las devoluciones se aceptarán de acuerdo con nuestra política de devoluciones vigente, siempre que el producto esté en su estado original.</p>

                    <h3 className="font-semibold text-gray-900 mt-4">4. Propiedad Intelectual</h3>
                    <p>Este sitio web contiene material que es propiedad nuestra o licenciado a nosotros. Este material incluye, pero no se limita a, el diseño, la apariencia, el estilo y los gráficos.</p>
                </div>
            );
        }

        if (type === 'privacy') {
            if (settings?.privacy_text) {
                return <div className="text-sm text-gray-600 whitespace-pre-wrap">{settings.privacy_text}</div>;
            }
            return (
                <div className="space-y-4 text-sm text-gray-600">
                    <p>{storeName} respeta tu privacidad y se compromete a proteger los datos personales que nos proporcionas.</p>

                    <h3 className="font-semibold text-gray-900 mt-4">1. Recolección de Información</h3>
                    <p>Recopilamos información cuando te registras en nuestro sitio, realizas un pedido o te suscribes a nuestro boletín. La información recopilada incluye tu nombre, dirección de correo electrónico, dirección postal y número de teléfono.</p>

                    <h3 className="font-semibold text-gray-900 mt-4">2. Uso de la Información</h3>
                    <p>Cualquier información que recopilamos de ti puede ser utilizada para: personalizar tu experiencia, mejorar nuestro sitio web, mejorar el servicio al cliente y procesar transacciones.</p>

                    <h3 className="font-semibold text-gray-900 mt-4">3. Protección de Información</h3>
                    <p>Implementamos una variedad de medidas de seguridad para mantener la seguridad de tu información personal cuando realizas un pedido o accedes a tu información personal.</p>
                </div>
            );
        }

        return null;
    };

    return (
        <footer
            className="border-t py-8 mt-12 transition-colors duration-300"
            style={{ backgroundColor: settings?.footer_bg_color || '#ffffff' }}
        >
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    {/* Brand */}
                    <div className="text-center md:text-left">
                        <h3 className="font-bold text-lg mb-2" style={{ color: settings?.footer_icon_color || '#111827' }}>
                            {storeName}
                        </h3>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto md:mx-0">
                            Tu tienda de confianza para encontrar los mejores productos.
                        </p>
                    </div>

                    {/* Links */}
                    <div className="text-center">
                        <h4 className="font-semibold mb-4" style={{ color: settings?.footer_icon_color || '#111827' }}>Legal</h4>
                        <div className="space-y-2 flex flex-col items-center">
                            <button
                                onClick={() => setOpenModal('terms')}
                                className="text-sm text-gray-500 hover:text-gray-900 hover:underline transition-colors"
                            >
                                Términos y Condiciones
                            </button>
                            <button
                                onClick={() => setOpenModal('privacy')}
                                className="text-sm text-gray-500 hover:text-gray-900 hover:underline transition-colors"
                            >
                                Política de Privacidad
                            </button>
                        </div>
                    </div>

                    {/* Contact placeholder or powered by */}
                    <div className="text-center md:text-right">
                        <h4 className="font-semibold mb-4" style={{ color: settings?.footer_icon_color || '#111827' }}>Plataforma</h4>
                        <p className="text-sm text-gray-500">
                            Powered by <a href="https://toogo.store" target="_blank" rel="noopener noreferrer" className="font-bold hover:text-blue-600">Toogo</a>
                        </p>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-8 text-center text-sm text-gray-400">
                    <p>&copy; {currentYear} {storeName}. Todos los derechos reservados.</p>
                </div>
            </div>

            {/* Legal Modal */}
            <Dialog open={!!openModal} onOpenChange={() => setOpenModal(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>
                            {openModal === 'terms' ? 'Términos y Condiciones' : 'Política de Privacidad'}
                        </DialogTitle>
                        <DialogDescription>
                            {storeName}
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] pr-4 mt-4">
                        {openModal && getLegalContent(openModal)}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </footer>
    );
};
