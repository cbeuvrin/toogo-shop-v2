import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface BlogImageManagerProps {
  onImageSelect?: (url: string) => void;
}

export const BlogImageManager = ({ onImageSelect }: BlogImageManagerProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona una imagen válida');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen es muy grande. Máximo 5MB');
        return;
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('blog-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('blog-assets')
        .getPublicUrl(data.path);

      setUploadedUrl(publicUrl);
      
      if (onImageSelect) {
        onImageSelect(publicUrl);
      }

      toast.success('Imagen subida exitosamente');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir imagen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadImage(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadImage(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-12 h-12 text-muted-foreground" />
          <div>
            <Label htmlFor="image-upload" className="cursor-pointer text-primary hover:underline">
              Haz clic para subir
            </Label>
            <span className="text-muted-foreground"> o arrastra y suelta</span>
          </div>
          <p className="text-xs text-muted-foreground">PNG, JPG, WEBP hasta 5MB</p>
          <Input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            disabled={uploading}
            className="hidden"
          />
        </div>
      </div>

      {uploading && (
        <div className="text-center text-sm text-muted-foreground">
          Subiendo imagen...
        </div>
      )}

      {uploadedUrl && (
        <Card className="p-4">
          <div className="flex items-start gap-4">
            <img
              src={uploadedUrl}
              alt="Imagen subida"
              className="w-24 h-24 object-cover rounded"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Imagen lista</p>
              <p className="text-xs text-muted-foreground truncate">{uploadedUrl}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setUploadedUrl('')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
