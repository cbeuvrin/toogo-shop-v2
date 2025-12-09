// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, MessageSquare, Settings } from "lucide-react";

interface ChatbotSettings {
  id: string;
  system_prompt: string;
  max_tokens: number;
  temperature: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminChatbotSettings() {
  const [settings, setSettings] = useState<ChatbotSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    system_prompt: "",
    max_tokens: 150,
    temperature: 0.7,
    is_active: true
  });

  useEffect(() => {
    fetchChatbotSettings();
  }, []);

  const fetchChatbotSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('chatbot_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching chatbot settings:', error);
        toast.error('Error al cargar la configuración del chatbot');
        return;
      }

      if (data) {
        setSettings(data as any);
        setFormData({
          system_prompt: (data as any).system_prompt,
          max_tokens: (data as any).max_tokens,
          temperature: (data as any).temperature,
          is_active: (data as any).is_active
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validaciones
      if (!formData.system_prompt.trim()) {
        toast.error('El prompt del sistema es requerido');
        return;
      }

      if (formData.max_tokens < 50 || formData.max_tokens > 4000) {
        toast.error('Max tokens debe estar entre 50 y 4000');
        return;
      }

      if (formData.temperature < 0 || formData.temperature > 2) {
        toast.error('Temperature debe estar entre 0 y 2');
        return;
      }

      if (settings) {
        // Actualizar configuración existente
        const { error } = await (supabase as any)
          .from('chatbot_settings')
          .update({
            system_prompt: formData.system_prompt,
            max_tokens: formData.max_tokens,
            temperature: formData.temperature,
            is_active: formData.is_active
          })
          .eq('id', (settings as any).id);

        if (error) throw error;
      } else {
        // Crear nueva configuración
        const { error } = await (supabase as any)
          .from('chatbot_settings')
          .insert([{
            system_prompt: formData.system_prompt,
            max_tokens: formData.max_tokens,
            temperature: formData.temperature,
            is_active: formData.is_active
          }]);

        if (error) throw error;
      }

      toast.success('Configuración del chatbot guardada exitosamente');
      await fetchChatbotSettings();
    } catch (error) {
      console.error('Error saving chatbot settings:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    const defaultPrompt = `¡Hola! 👋 Soy Toogi, tu mascota digital súper simpática de Toogo!

🚨 REGLAS IMPORTANTES DE RESPUESTA:
- SOLO respondes sobre Toogo (crear tiendas, vender, usar la plataforma)
- Si preguntan algo NO relacionado con Toogo, dices: "¡Solo sé de Toogo! ¿Te ayudo con tu tienda?"
- MÁXIMO 3 pasos por respuesta
- Si hay más de 3 pasos, al tercer paso preguntas: "¿Continúo con los siguientes pasos o prefieres que esperemos?"
- Mantén respuestas CORTAS y directas
- NO des explicaciones técnicas generales

📱 DEFINICIONES ESPECÍFICAS DE TOOGO:
- "¿Qué es un subdominio?" → "En Toogo, tu subdominio es tu dirección gratis como mitienda.toogo.store"
- "¿Qué es un dominio?" → "En Toogo, tu dominio personalizado es como mitienda.com (Plan Pro)"
- "¿Cómo funciona?" → Explica solo cómo funciona Toogo, no conceptos generales

✨ QUÉ ES TOOGO:
Toogo es la forma MÁS FÁCIL de tener tu tienda en internet y vender por WhatsApp. ¡En 5 minutos ya estás vendiendo!

🆓 PLAN GRATUITO (Subdominio .toogo.store):
- Dirección: "mitienda.toogo.store"
- Hasta 10 productos
- Ventas por WhatsApp
- ¡Gratis para siempre!

💎 PLAN BASIC (Dominio personalizado):
- Dirección: "mitienda.com" 
- Productos ilimitados
- Pasarelas de pago
- $299 MXN/mes

🚀 PROCESO REAL PARA EMPEZAR (RESPUESTAS CORTAS):

Si preguntan "¿Cómo empiezo?":
PASO 1: Ir a Toogo y dar click en "Comenzar gratis"
PASO 2: Elegir entre subdominio gratis (.toogo.store) o dominio Pro (.com)  
PASO 3: Verificar que tu nombre esté disponible

¿Continúo con los siguientes pasos o prefieres que esperemos?

Si dicen "continúa":
PASO 4: Crear cuenta (email, teléfono, país, contraseña)
PASO 5: Verificar email con código de 6 dígitos
PASO 6: Si elegiste gratis, ¡ya tienes tu tienda! Si elegiste Pro, pagar y esperar configuración

🏪 CÓMO FUNCIONA PARA TUS CLIENTES:
1. Ven tu tienda bonita
2. Eligen productos  
3. Dan click en "Pedir por WhatsApp"

¿Continúo explicando cómo sigue?`;

    setFormData({
      system_prompt: defaultPrompt,
      max_tokens: 150,
      temperature: 0.7,
      is_active: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Configuración del Chatbot Toogi</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Prompt del Sistema
          </CardTitle>
          <CardDescription>
            Define cómo se comporta Toogi y qué responde a los usuarios. Este prompt controla toda la personalidad y conocimiento del chatbot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="system_prompt">Prompt del Sistema</Label>
            <Textarea
              id="system_prompt"
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              rows={20}
              placeholder="Escribe aquí el prompt que define cómo se comporta Toogi..."
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Caracteres: {formData.system_prompt.length}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_tokens">Máximo de Tokens</Label>
              <Input
                id="max_tokens"
                type="number"
                min="50"
                max="4000"
                value={formData.max_tokens}
                onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) || 150 })}
              />
              <p className="text-xs text-muted-foreground">
                Controla la longitud máxima de las respuestas (50-4000)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) || 0.7 })}
              />
              <p className="text-xs text-muted-foreground">
                Creatividad de las respuestas (0.0-2.0)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_active">Estado</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="text-sm">
                  {formData.is_active ? 'Activo' : 'Inactivo'}
                </Label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Configuración
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={resetToDefault}
              disabled={saving}
            >
              Restablecer por Defecto
            </Button>
          </div>

          {settings && (
            <div className="text-sm text-muted-foreground pt-4 border-t">
              <p>Última actualización: {new Date(settings.updated_at).toLocaleString('es-ES')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}