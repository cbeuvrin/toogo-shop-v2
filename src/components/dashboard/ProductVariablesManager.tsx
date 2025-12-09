import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useProductVariables, ProductVariable } from '@/hooks/useProductVariables';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
interface ProductVariablesManagerProps {
  onVariableSelect?: (variableIds: string[]) => void;
  selectedVariables?: string[];
  showSelection?: boolean;
}
export const ProductVariablesManager = ({
  onVariableSelect,
  selectedVariables = [],
  showSelection = false
}: ProductVariablesManagerProps) => {
  const {
    variables,
    isLoading,
    saveVariable,
    deleteVariable,
    saveVariableValues
  } = useProductVariables();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<ProductVariable | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'dropdown' as const,
    is_required: false,
    sort_order: 0,
    values: ['']
  });
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'dropdown',
      is_required: false,
      sort_order: 0,
      values: ['']
    });
    setEditingVariable(null);
  };
  const handleEdit = (variable: ProductVariable) => {
    setEditingVariable(variable);
    setFormData({
      name: variable.name,
      type: 'dropdown',
      is_required: false,
      sort_order: variable.sort_order,
      values: variable.values?.map(v => v.value) || ['']
    });
    setIsModalOpen(true);
  };
  const handleSave = async () => {
    try {
      const variableData = {
        name: formData.name,
        type: 'dropdown' as 'dropdown',
        is_required: false,
        sort_order: formData.sort_order,
        values: formData.values.filter(v => v.trim()).map((value, index) => ({
          id: '',
          variable_id: '',
          value,
          sort_order: index,
          created_at: ''
        }))
      };
      await saveVariable(variableData, editingVariable?.id);

      // If editing and has values, update them
      if (editingVariable) {
        const validValues = formData.values.filter(v => v.trim());
        if (validValues.length > 0) {
          await saveVariableValues(editingVariable.id, validValues);
        }
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving variable:', error);
    }
  };
  const handleDelete = async (variableId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta variable?')) {
      await deleteVariable(variableId);
    }
  };
  const addValue = () => {
    setFormData(prev => ({
      ...prev,
      values: [...prev.values, '']
    }));
  };
  const removeValue = (index: number) => {
    setFormData(prev => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== index)
    }));
  };
  const updateValue = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      values: prev.values.map((v, i) => i === index ? value : v)
    }));
  };
  const handleVariableToggle = (variableId: string, checked: boolean) => {
    if (!onVariableSelect) return;
    let newSelection = [...selectedVariables];
    if (checked) {
      newSelection.push(variableId);
    } else {
      newSelection = newSelection.filter(id => id !== variableId);
    }
    onVariableSelect(newSelection);
  };
  if (isLoading) {
    return <div>Cargando variables...</div>;
  }
  return <div className="space-y-4">
      <div className="flex justify-end items-center">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }} 
              variant="ghost" 
              size="sm" 
              className="h-auto p-1 text-xs text-muted-foreground hover:text-primary"
            >
              <Plus className="h-3 w-3 mr-1" />
              Nueva Variable
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingVariable ? 'Editar Variable' : 'Nueva Variable'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la variable</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData(prev => ({
                ...prev,
                name: e.target.value
              }))} placeholder="ej. Talla, Color, Material" />
              </div>
              
              <div>
                <div>
                  <Label>Valores disponibles</Label>
                  <div className="space-y-2">
                    {formData.values.map((value, index) => <div key={index} className="flex items-center space-x-2">
                        <Input value={value} onChange={e => updateValue(index, e.target.value)} placeholder={`Opción ${index + 1}`} />
                        {formData.values.length > 1 && <Button variant="outline" size="icon" onClick={() => removeValue(index)}>
                            <X className="h-4 w-4" />
                          </Button>}
                      </div>)}
                    <Button variant="outline" onClick={addValue} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar opción
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {editingVariable ? 'Guardar Cambios' : 'Crear Variable'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {variables.map(variable => <Card key={variable.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {showSelection && <Switch checked={selectedVariables.includes(variable.id)} onCheckedChange={checked => handleVariableToggle(variable.id, checked)} />}
                  <div>
                    <CardTitle className="text-base">{variable.name}</CardTitle>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(variable)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleDelete(variable.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {variable.values && variable.values.length > 0 && <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1">
                  {variable.values.map(value => <Badge key={value.id} variant="outline" className="text-xs">
                      {value.value}
                    </Badge>)}
                </div>
              </CardContent>}
          </Card>)}
      </div>

      {variables.length === 0 && <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No hay variables configuradas. Crea tu primera variable como "Talla", "Color", etc.
            </p>
          </CardContent>
        </Card>}
    </div>;
};