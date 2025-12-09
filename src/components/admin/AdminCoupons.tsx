import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useCoupons } from '@/hooks/useCoupons';
import { Plus, Trash2, Edit, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CouponFormData {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_discount_amount: number | null;
  applicable_to: 'membership' | 'domain' | 'both';
  expires_at: string;
  max_total_uses: number;
  max_uses_per_user: number;
  is_active: boolean;
}

export const AdminCoupons = () => {
  const { fetchCoupons, createCoupon, updateCoupon, deleteCoupon, isLoading } = useCoupons();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [formData, setFormData] = useState<CouponFormData>({
    code: '',
    discount_type: 'percentage',
    discount_value: 0,
    max_discount_amount: null,
    applicable_to: 'both',
    expires_at: '',
    max_total_uses: 100,
    max_uses_per_user: 1,
    is_active: true,
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    const data = await fetchCoupons();
    setCoupons(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCoupon) {
      await updateCoupon(editingCoupon.id, formData);
    } else {
      await createCoupon(formData);
    }
    
    setIsDialogOpen(false);
    setEditingCoupon(null);
    resetForm();
    loadCoupons();
  };

  const handleEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      max_discount_amount: coupon.max_discount_amount,
      applicable_to: coupon.applicable_to,
      expires_at: coupon.expires_at.split('T')[0],
      max_total_uses: coupon.max_total_uses,
      max_uses_per_user: coupon.max_uses_per_user,
      is_active: coupon.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este cupón?')) {
      await deleteCoupon(id);
      loadCoupons();
    }
  };

  const toggleActive = async (coupon: any) => {
    await updateCoupon(coupon.id, { is_active: !coupon.is_active });
    loadCoupons();
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: 0,
      max_discount_amount: null,
      applicable_to: 'both',
      expires_at: '',
      max_total_uses: 100,
      max_uses_per_user: 1,
      is_active: true,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Gestión de Cupones
            </CardTitle>
            <CardDescription>
              Crea y gestiona cupones de descuento para nuevos usuarios
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingCoupon(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nuevo Cupón
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCoupon ? 'Editar Cupón' : 'Crear Nuevo Cupón'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código del Cupón *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="BIENVENIDA50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discount_type">Tipo de Descuento *</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value: 'percentage' | 'fixed') =>
                        setFormData({ ...formData, discount_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                        <SelectItem value="fixed">Monto Fijo (MXN)</SelectItem>
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

                  {formData.discount_type === 'percentage' && (
                    <div className="space-y-2">
                      <Label htmlFor="max_discount">Descuento Máximo (MXN)</Label>
                      <Input
                        id="max_discount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.max_discount_amount || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          max_discount_amount: e.target.value ? parseFloat(e.target.value) : null
                        })}
                        placeholder="500"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="applicable_to">Aplicable a *</Label>
                    <Select
                      value={formData.applicable_to}
                      onValueChange={(value: 'membership' | 'domain' | 'both') =>
                        setFormData({ ...formData, applicable_to: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="membership">Solo Membresía</SelectItem>
                        <SelectItem value="domain">Solo Dominio</SelectItem>
                        <SelectItem value="both">Ambos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expires_at">Fecha de Expiración *</Label>
                    <Input
                      id="expires_at"
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_total_uses">Usos Totales Máximos *</Label>
                    <Input
                      id="max_total_uses"
                      type="number"
                      min="1"
                      value={formData.max_total_uses}
                      onChange={(e) => setFormData({ ...formData, max_total_uses: parseInt(e.target.value) })}
                      required
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

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>Cupón Activo</Label>
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {editingCoupon ? 'Actualizar' : 'Crear'} Cupón
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descuento</TableHead>
              <TableHead>Aplicable a</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Expira</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                <TableCell>
                  {coupon.discount_type === 'percentage'
                    ? `${coupon.discount_value}%`
                    : `$${coupon.discount_value} MXN`}
                  {coupon.max_discount_amount && (
                    <span className="text-xs text-muted-foreground block">
                      (máx. ${coupon.max_discount_amount} MXN)
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {coupon.applicable_to === 'membership' && 'Membresía'}
                    {coupon.applicable_to === 'domain' && 'Dominio'}
                    {coupon.applicable_to === 'both' && 'Ambos'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {coupon.current_uses}/{coupon.max_total_uses}
                  <span className="text-xs text-muted-foreground block">
                    (máx. {coupon.max_uses_per_user}/usuario)
                  </span>
                </TableCell>
                <TableCell>
                  {format(new Date(coupon.expires_at), 'dd MMM yyyy', { locale: es })}
                </TableCell>
                <TableCell>
                  <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                    {coupon.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(coupon)}
                    >
                      <Switch checked={coupon.is_active} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(coupon)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(coupon.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
