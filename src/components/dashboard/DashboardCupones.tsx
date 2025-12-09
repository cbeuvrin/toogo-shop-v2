import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTenantCoupons, type TenantStoreCoupon } from "@/hooks/useTenantCoupons";
import { useTenantContext } from "@/contexts/TenantContext";
import { usePlanRestrictions } from "@/hooks/usePlanRestrictions";
import { Plus, Edit, Trash2, Eye, Tag, AlertCircle, Crown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const DashboardCupones = () => {
  const { currentTenantId } = useTenantContext();
  const { restrictions } = usePlanRestrictions();
  const { 
    isLoading, 
    fetchCoupons, 
    createCoupon, 
    updateCoupon, 
    deleteCoupon,
    getCouponStats 
  } = useTenantCoupons();

  const [coupons, setCoupons] = useState<TenantStoreCoupon[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<TenantStoreCoupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    discount_value: 0,
    max_discount_amount: undefined as number | undefined,
    minimum_purchase_amount: 0,
    applies_to_all_products: true,
    max_total_uses: undefined as number | undefined,
    max_uses_per_user: 1,
    starts_at: new Date().toISOString().slice(0, 16),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  useEffect(() => {
    if (currentTenantId) {
      loadCoupons();
    }
  }, [currentTenantId]);

  const loadCoupons = async () => {
    if (!currentTenantId) return;
    const data = await fetchCoupons(currentTenantId);
    setCoupons(data);
  };

  const activeCouponsCount = coupons.filter(c => c.is_active).length;
  const canCreateMore = restrictions.canCreateCoupons && activeCouponsCount < restrictions.maxActiveCoupons;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenantId) return;

    const couponData = {
      ...formData,
      tenant_id: currentTenantId,
      is_active: true,
      current_uses: 0,
    };

    if (editingCoupon) {
      await updateCoupon(editingCoupon.id, couponData);
    } else {
      await createCoupon(couponData as any);
    }

    await loadCoupons();
    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (coupon: TenantStoreCoupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      max_discount_amount: coupon.max_discount_amount || undefined,
      minimum_purchase_amount: coupon.minimum_purchase_amount || 0,
      applies_to_all_products: coupon.applies_to_all_products,
      max_total_uses: coupon.max_total_uses || undefined,
      max_uses_per_user: coupon.max_uses_per_user,
      starts_at: new Date(coupon.starts_at).toISOString().slice(0, 16),
      expires_at: new Date(coupon.expires_at).toISOString().slice(0, 16),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este cupón?')) {
      await deleteCoupon(id);
      await loadCoupons();
    }
  };

  const toggleActive = async (coupon: TenantStoreCoupon) => {
    await updateCoupon(coupon.id, { is_active: !coupon.is_active });
    await loadCoupons();
  };

  const resetForm = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      max_discount_amount: undefined,
      minimum_purchase_amount: 0,
      applies_to_all_products: true,
      max_total_uses: undefined,
      max_uses_per_user: 1,
      starts_at: new Date().toISOString().slice(0, 16),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    });
  };

  if (!restrictions.canCreateCoupons) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Cupones de Descuento
          </CardTitle>
          <CardDescription>
            Actualiza tu plan para acceder a cupones de descuento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Los cupones están disponibles en el plan Basic o superior.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Cupones de Descuento
            </CardTitle>
            <CardDescription>
              Gestiona cupones para tu tienda ({activeCouponsCount}/{restrictions.maxActiveCoupons} activos)
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button disabled={!canCreateMore}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cupón
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCoupon ? 'Editar Cupón' : 'Crear Nuevo Cupón'}
                </DialogTitle>
                <DialogDescription>
                  Configura los detalles del cupón de descuento
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="VERANO2024"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Descuento Verano"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="20% de descuento en toda la tienda"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount_type">Tipo de Descuento *</Label>
                    <Select 
                      value={formData.discount_type} 
                      onValueChange={(value: 'percentage' | 'fixed_amount') => 
                        setFormData({ ...formData, discount_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                        <SelectItem value="fixed_amount">Cantidad Fija ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount_value">
                      Valor del Descuento * {formData.discount_type === 'percentage' ? '(%)' : '(MXN)'}
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                {formData.discount_type === 'percentage' && (
                  <div className="space-y-2">
                    <Label htmlFor="max_discount">Descuento Máximo (MXN, opcional)</Label>
                    <Input
                      id="max_discount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.max_discount_amount || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        max_discount_amount: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                      placeholder="Sin límite"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="minimum_purchase">Compra Mínima (MXN)</Label>
                  <Input
                    id="minimum_purchase"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minimum_purchase_amount}
                    onChange={(e) => setFormData({ ...formData, minimum_purchase_amount: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_total_uses">Usos Totales (opcional)</Label>
                    <Input
                      id="max_total_uses"
                      type="number"
                      min="1"
                      value={formData.max_total_uses || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        max_total_uses: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      placeholder="Ilimitado"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_uses_per_user">Usos por Usuario *</Label>
                    <Input
                      id="max_uses_per_user"
                      type="number"
                      min="1"
                      value={formData.max_uses_per_user}
                      onChange={(e) => setFormData({ ...formData, max_uses_per_user: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="starts_at">Fecha de Inicio *</Label>
                    <Input
                      id="starts_at"
                      type="datetime-local"
                      value={formData.starts_at}
                      onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expires_at">Fecha de Expiración *</Label>
                    <Input
                      id="expires_at"
                      type="datetime-local"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {editingCoupon ? 'Actualizar' : 'Crear'} Cupón
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!canCreateMore && activeCouponsCount >= restrictions.maxActiveCoupons && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Has alcanzado el límite de {restrictions.maxActiveCoupons} cupones activos para tu plan.
                Desactiva un cupón existente o actualiza tu plan.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Válido</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay cupones creados aún
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-semibold">{coupon.code}</TableCell>
                      <TableCell>
                        {coupon.discount_type === 'percentage' 
                          ? `${coupon.discount_value}%` 
                          : `$${coupon.discount_value} MXN`}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(coupon.expires_at), "dd/MMM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {coupon.current_uses}
                        {coupon.max_total_uses ? `/${coupon.max_total_uses}` : ''}
                      </TableCell>
                      <TableCell>
                        <Badge variant={coupon.is_active ? "default" : "secondary"}>
                          {coupon.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(coupon)}
                          >
                            {coupon.is_active ? 'Desactivar' : 'Activar'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(coupon)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(coupon.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
