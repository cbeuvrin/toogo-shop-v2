import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Image, Trash2, Plus, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BannerPreview } from "./BannerPreview";
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useOnboardingInteraction } from '@/hooks/useOnboardingInteraction';

export const DashboardBranding = () => {
  const { toast } = useToast();
  const { settings, uploadLogo } = useTenantSettings();
  const { markCustomizeStoreCompleted } = useOnboardingInteraction();
  const [logo, setLogo] = useState<string>("");
  const [banners, setBanners] = useState<Array<{ id: string; url: string }>>([]);
  const [previewBanner, setPreviewBanner] = useState<{ id: string; url: string } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (settings?.logo_url) {
      setLogo(settings.logo_url);
    }
  }, [settings]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Show preview immediately
        const previewUrl = URL.createObjectURL(file);
        setLogo(previewUrl);

        // Upload to Supabase and update tenant_settings
        const uploadedUrl = await uploadLogo(file);
        
        if (uploadedUrl) {
          // Clean up preview URL and use the uploaded URL
          URL.revokeObjectURL(previewUrl);
          setLogo(uploadedUrl);
          
          toast({
            title: "Logo actualizado",
            description: "El logo se ha guardado correctamente y aparecerá en toda tu tienda.",
          });

          // Mark customize store step as completed
          markCustomizeStoreCompleted();
        } else {
          // Revert to previous logo if upload failed
          setLogo(settings?.logo_url || '');
          URL.revokeObjectURL(previewUrl);
        }
      } catch (error) {
        console.error('Error uploading logo:', error);
        toast({
          title: "Error",
          description: "No se pudo subir el logo. Intenta de nuevo.",
          variant: "destructive",
        });
        // Revert to previous logo if upload failed
        setLogo(settings?.logo_url || '');
      }
    }
  };

  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newBanner = {
        id: Date.now().toString(),
        url
      };
      setBanners([...banners, newBanner]);
      toast({
        title: "Banner agregado",
        description: "El banner se ha agregado al carrusel.",
      });
    }
  };

  const deleteBanner = (id: string) => {
    setBanners(banners.filter(banner => banner.id !== id));
    toast({
      title: "Banner eliminado",
      description: "El banner se ha eliminado del carrusel.",
    });
  };

  const openPreview = (banner: { id: string; url: string }) => {
    setPreviewBanner(banner);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Logo de la Tienda
          </CardTitle>
          <CardDescription>
            Sube el logo que aparecerá en tu tienda online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {logo && (
              <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            )}
            <div className="flex-1">
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Haz clic para subir tu logo o arrastra aquí
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG hasta 2MB
                  </p>
                </div>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </Label>
            </div>
          </div>
          {logo && (
            <div className="text-center">
              <p className="text-sm text-green-600 font-medium">
                ✓ Logo guardado automáticamente
              </p>
              <p className="text-xs text-muted-foreground">
                Tu logo aparecerá en toda la tienda
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Banners Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Banners del Carrusel
          </CardTitle>
          <CardDescription>
            Gestiona los banners que aparecerán en la página principal de tu tienda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Banner */}
          <Label htmlFor="banner-upload" className="cursor-pointer">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
              <Plus className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Agregar nuevo banner
              </p>
            </div>
            <Input
              id="banner-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerUpload}
            />
          </Label>

          {/* Existing Banners */}
          {banners.map((banner) => (
            <div key={banner.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="w-32 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                  <img src={banner.url} alt="Banner" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Banner de imagen</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPreview(banner)}
                    className="rounded-[30px] w-full sm:w-auto"
                  >
                    <Eye className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Banner Preview</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteBanner(banner.id)}
                    className="rounded-[30px] w-full sm:w-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {banners.length > 0 && (
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-[30px]">
              Guardar Banners
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl p-8 rounded-[30px]">
          <DialogHeader>
            <DialogTitle>Vista Previa del Banner</DialogTitle>
          </DialogHeader>
          {previewBanner && <BannerPreview banner={previewBanner} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};
