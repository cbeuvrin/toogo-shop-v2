import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContentGenerated: (content: {
    title: string;
    content: string;
    excerpt: string;
    seoTitle: string;
    seoDescription: string;
    keywords: string[];
  }) => void;
}

export const AIGeneratorModal = ({ open, onOpenChange, onContentGenerated }: AIGeneratorModalProps) => {
  const [topic, setTopic] = useState('');
  const [targetKeywords, setTargetKeywords] = useState('');
  const [tone, setTone] = useState<'professional' | 'casual' | 'technical' | 'friendly'>('professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Por favor ingresa un tema para el artículo');
      return;
    }

    setIsGenerating(true);

    try {
      const keywords = targetKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const { data, error } = await supabase.functions.invoke('generate-blog-content', {
        body: {
          topic: topic.trim(),
          targetKeywords: keywords,
          tone,
          length,
        },
      });

      if (error) throw error;

      if (data) {
        onContentGenerated(data);
        toast.success('¡Artículo generado exitosamente!');
        onOpenChange(false);
        // Reset form
        setTopic('');
        setTargetKeywords('');
        setTone('professional');
        setLength('medium');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Error al generar el artículo. Intenta nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generar artículo con IA
          </DialogTitle>
          <DialogDescription>
            Completa los detalles y deja que Gemini AI escriba un artículo completo y optimizado para SEO.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Tema del artículo *</Label>
            <Textarea
              id="topic"
              placeholder="Ej: Los beneficios del comercio electrónico para pequeñas empresas"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Palabras clave objetivo (opcional)</Label>
            <Input
              id="keywords"
              placeholder="ecommerce, tienda online, ventas digitales"
              value={targetKeywords}
              onChange={(e) => setTargetKeywords(e.target.value)}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Separa las palabras clave con comas
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tone">Tono</Label>
              <Select
                value={tone}
                onValueChange={(value: any) => setTone(value)}
                disabled={isGenerating}
              >
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Profesional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="technical">Técnico</SelectItem>
                  <SelectItem value="friendly">Amigable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="length">Longitud</Label>
              <Select
                value={length}
                onValueChange={(value: any) => setLength(value)}
                disabled={isGenerating}
              >
                <SelectTrigger id="length">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Corto (500-800 palabras)</SelectItem>
                  <SelectItem value="medium">Medio (1000-1500 palabras)</SelectItem>
                  <SelectItem value="long">Largo (2000-3000 palabras)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generar artículo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
