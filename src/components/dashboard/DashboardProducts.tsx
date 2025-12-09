import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Package, Edit, Trash2, Image, Search, Crown, AlertTriangle, HelpCircle } from "lucide-react";
import { useProducts, type Product } from "@/hooks/useProducts";
import { useCategories, type Category } from "@/hooks/useCategories";
import { ProductImageGallery } from "@/components/ui/product-image-gallery";
import { ProductEditModal } from "@/components/dashboard3/EditModals/ProductEditModal";
import { usePlanRestrictions } from "@/hooks/usePlanRestrictions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOnboardingInteraction } from "@/hooks/useOnboardingInteraction";
import { ProductsTutorialModal } from "./ProductsTutorialModal";

interface DashboardProductsProps {
  onNavigateToCategories?: () => void;
  onNavigateToVariables?: () => void;
  onNavigateToUpgrade?: () => void;
}

export const DashboardProducts = ({ onNavigateToCategories, onNavigateToVariables, onNavigateToUpgrade }: DashboardProductsProps) => {
  const { products, isLoading: productsLoading, saveProduct, deleteProduct } = useProducts();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { restrictions, plan } = usePlanRestrictions();
  const { markProductStepCompleted } = useOnboardingInteraction();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showProductsTutorial, setShowProductsTutorial] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('products-tutorial-dismissed');
    if (!dismissed) {
      setShowProductsTutorial(true);
    }
  }, []);

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    
    const term = searchTerm.toLowerCase();
    return products.filter(product => 
      product.title.toLowerCase().includes(term) ||
      product.sku?.toLowerCase().includes(term) ||
      product.description.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSave = async (productData: Omit<Product, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> & { variables?: string[] }) => {
    const success = await saveProduct(productData, editingProduct?.id);
    
    if (success) {
      // Mark product step as completed when creating new product
      if (!editingProduct) {
        markProductStepCompleted();
      }
      
      setIsModalOpen(false);
      setEditingProduct(null);
    }
  };

  const handleNewProduct = () => {
    if (products.length >= restrictions.maxProducts) {
      return; // This will be handled by the disabled button
    }
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Gestión de Productos</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProductsTutorial(true)}
              className="text-purple-600 hover:bg-purple-100 rounded-full w-8 h-8 p-0"
              title="Ver tutorial de productos"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Administra tu catálogo de productos
          </p>
        </div>
        <Button 
          onClick={handleNewProduct} 
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-[30px]"
          disabled={products.length >= restrictions.maxProducts}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
          {products.length >= restrictions.maxProducts && restrictions.maxProducts !== Infinity && (
            <Crown className="w-3 h-3 ml-1" />
          )}
        </Button>
      </div>

      {/* Product Edit Modal */}
      <ProductEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingProduct}
        categories={categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          showOnHome: cat.showOnHome ?? true
        }))}
        onNavigateToCategories={onNavigateToCategories}
        onNavigateToVariables={onNavigateToVariables}
      />

      {/* Plan Restrictions Alert */}
      {restrictions.maxProducts !== Infinity && (
        <Alert className={products.length >= restrictions.maxProducts ? "border-orange-200 bg-orange-50" : "border-blue-200 bg-blue-50"}>
          <div className="flex items-start gap-3">
            {products.length >= restrictions.maxProducts ? (
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Crown className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            )}
            <AlertDescription>
              {products.length >= restrictions.maxProducts ? (
                <>
                  <strong>Límite alcanzado:</strong> Has alcanzado el límite de {restrictions.maxProducts} productos del Plan Gratuito. 
                  <Button size="sm" className="ml-2 bg-orange-600 hover:bg-orange-700 text-white" onClick={onNavigateToUpgrade}>
                    Actualizar a Basic - $299 MXN/mes
                  </Button>
                </>
              ) : (
                <>
                  <strong>Plan Gratuito:</strong> Puedes agregar hasta {restrictions.maxProducts} productos. 
                  Tienes {products.length}/{restrictions.maxProducts} productos. 
                  <Button size="sm" variant="outline" className="ml-2" onClick={onNavigateToUpgrade}>
                    Actualizar a Basic para productos ilimitados
                  </Button>
                </>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar productos por título, SKU o descripción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Table */}
      {productsLoading || categoriesLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando productos...</p>
          </CardContent>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            {searchTerm ? (
              <>
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron productos</h3>
                <p className="text-muted-foreground mb-4">
                  No hay productos que coincidan con "{searchTerm}"
                </p>
                <Button 
                  onClick={() => setSearchTerm("")} 
                  variant="outline" 
                  className="rounded-[30px]"
                >
                  Limpiar búsqueda
                </Button>
              </>
            ) : (
              <>
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No hay productos</h3>
                <p className="text-muted-foreground mb-4">
                  Comienza agregando tu primer producto al catálogo
                </p>
                <Button onClick={handleNewProduct} className="bg-purple-600 hover:bg-purple-700 text-white rounded-[30px]">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Producto
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay productos</h3>
            <p className="text-muted-foreground mb-4">
              Comienza agregando tu primer producto al catálogo
            </p>
            <Button onClick={handleNewProduct} className="bg-purple-600 hover:bg-purple-700 text-white rounded-[30px]">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Producto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Imagen</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="hidden md:table-cell">SKU</TableHead>
                  <TableHead className="hidden sm:table-cell">Precio</TableHead>
                  <TableHead className="hidden lg:table-cell">Stock</TableHead>
                  <TableHead className="hidden sm:table-cell">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                        {product.images.length > 0 ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Image className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium line-clamp-2 max-w-[200px] lg:line-clamp-1">
                        {product.title}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm text-muted-foreground">
                        {product.sku || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="text-sm">
                        <div className="font-medium">${product.price_mxn} MXN</div>
                        {product.sale_price_mxn > 0 && product.sale_price_mxn < product.price_mxn && (
                          <div className="text-xs text-green-600">Oferta: ${product.sale_price_mxn} MXN</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm">
                        {product.stock}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                        {product.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(product)} 
                          className="rounded-[30px] h-8 w-8 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDelete(product.id)}
                          className="rounded-[30px] h-8 w-8 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ProductsTutorialModal 
        isOpen={showProductsTutorial}
        onClose={() => setShowProductsTutorial(false)}
        step={3}
      />
    </div>
  );
};