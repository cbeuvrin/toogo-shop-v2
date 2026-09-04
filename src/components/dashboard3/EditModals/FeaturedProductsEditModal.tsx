import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useProducts } from "@/hooks/useProducts";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface FeaturedProductsEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (productIds: string[]) => void;
    initialProductIds?: string[];
}

export const FeaturedProductsEditModal = ({
    isOpen,
    onClose,
    onSave,
    initialProductIds = []
}: FeaturedProductsEditModalProps) => {
    const { products, isLoading } = useProducts();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (isOpen) {
            console.log("FeaturedProductsEditModal opened, setting initial ids:", initialProductIds);
            setSelectedIds(initialProductIds || []);
        }
    }, [isOpen]); // Remove initialProductIds dependency to avoid overwriting user edits if parent re-renders

    // Ids de productos borrados quedan "fantasma" en visual_editor_data: ocupan
    // cupo del contador (ej. 1/2 sin nada marcado) aunque la tienda los ignora
    // al renderizar. Se podan cuando el catálogo ya cargó.
    useEffect(() => {
        if (!isOpen || isLoading || products.length === 0) return;
        setSelectedIds(prev => {
            const pruned = prev.filter(id => products.some(p => p.id === id));
            return pruned.length === prev.length ? prev : pruned;
        });
    }, [isOpen, isLoading, products]);

    const toggleProduct = (productId: string) => {
        setSelectedIds(prev => {
            if (prev.includes(productId)) {
                return prev.filter(id => id !== productId);
            } else {
                if (prev.length >= 2) {
                    toast.error("Solo puedes seleccionar hasta 2 productos destacados");
                    return prev;
                }
                return [...prev, productId];
            }
        });
    };

    const filteredProducts = products.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSave = () => {
        onSave(selectedIds);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Seleccionar Productos Destacados (Popular)</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                        <Search className="w-4 h-4 text-gray-500" />
                        <Input
                            placeholder="Buscar productos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border-none focus-visible:ring-0 p-0 h-auto"
                        />
                    </div>

                    <div className="text-sm text-muted-foreground">
                        Seleccionados: {selectedIds.length} / 2
                    </div>

                    <ScrollArea className="flex-1 border rounded-md p-2">
                        {isLoading ? (
                            <div className="p-4 text-center">Cargando productos...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {filteredProducts.map(product => {
                                    const isSelected = selectedIds.includes(product.id);
                                    return (
                                        <div
                                            key={product.id}
                                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-gray-50'
                                                }`}
                                            onClick={() => toggleProduct(product.id)}
                                        >
                                            <div className="h-12 w-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                                {product.images?.[0] ? (
                                                    <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">NO IMG</div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm truncate">{product.title}</h4>
                                                <p className="text-xs text-gray-500">${product.price_mxn}</p>
                                            </div>
                                            {isSelected && (
                                                <div className="h-5 w-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {filteredProducts.length === 0 && (
                                    <div className="col-span-2 text-center py-8 text-gray-500">
                                        No se encontraron productos
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSave}>Guardar Selección</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
