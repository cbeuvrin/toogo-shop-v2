import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter, Youtube, Linkedin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  hours: string;
}

interface SocialMedia {
  platform: string;
  url: string;
  enabled: boolean;
  icon: any;
  color: string;
}

export const DashboardContact = () => {
  const { toast } = useToast();
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    phone: "",
    email: "",
    address: "",
    hours: ""
  });

  const [socialMedia, setSocialMedia] = useState<SocialMedia[]>([
    {
      platform: "Facebook",
      url: "",
      enabled: false,
      icon: Facebook,
      color: "text-blue-600"
    },
    {
      platform: "Instagram", 
      url: "",
      enabled: false,
      icon: Instagram,
      color: "text-pink-600"
    },
    {
      platform: "X",
      url: "",
      enabled: false,
      icon: Twitter,
      color: "text-gray-900"
    },
    {
      platform: "LinkedIn",
      url: "",
      enabled: false,
      icon: Linkedin,
      color: "text-blue-700"
    }
  ]);

  const updateContactInfo = (field: keyof ContactInfo, value: string) => {
    setContactInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateSocialMedia = (index: number, field: keyof SocialMedia, value: any) => {
    setSocialMedia(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleSave = () => {
    toast({
      title: "Información guardada",
      description: "Los datos de contacto y redes sociales se han actualizado correctamente.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Contacto y Redes Sociales</h3>
        <p className="text-sm text-muted-foreground">
          Configura la información de contacto que aparecerá en tu tienda
        </p>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Información de Contacto
          </CardTitle>
          <CardDescription>
            Esta información aparecerá en el footer de tu tienda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={contactInfo.phone}
                  onChange={(e) => updateContactInfo("phone", e.target.value)}
                  placeholder="+52 55 1234 5678"
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={contactInfo.email}
                  onChange={(e) => updateContactInfo("email", e.target.value)}
                  placeholder="contacto@mitienda.com"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          
          <div>
            <Label htmlFor="address">Dirección</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Textarea
                id="address"
                value={contactInfo.address}
                onChange={(e) => updateContactInfo("address", e.target.value)}
                placeholder="Calle Principal #123, Colonia Centro, Ciudad, CP 12345"
                className="pl-10 resize-none"
                rows={2}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="hours">Horarios de Atención</Label>
            <Textarea
              id="hours"
              value={contactInfo.hours}
              onChange={(e) => updateContactInfo("hours", e.target.value)}
              placeholder="Lunes a Viernes: 9:00 AM - 6:00 PM&#10;Sábados: 9:00 AM - 2:00 PM&#10;Domingos: Cerrado"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="w-5 h-5" />
            Redes Sociales
          </CardTitle>
          <CardDescription>
            Configura tus redes sociales para mostrar los iconos en el footer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {socialMedia.map((social, index) => (
            <div key={social.platform} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <social.icon className={`w-5 h-5 ${social.color}`} />
                  <span className="font-medium">{social.platform}</span>
                </div>
                <Switch
                  checked={social.enabled}
                  onCheckedChange={(checked) => updateSocialMedia(index, "enabled", checked)}
                />
              </div>
              
              {social.enabled && (
                <div>
                  <Label htmlFor={`${social.platform}-url`}>
                    URL de {social.platform}
                  </Label>
                  <Input
                    id={`${social.platform}-url`}
                    value={social.url}
                    onChange={(e) => updateSocialMedia(index, "url", e.target.value)}
                    placeholder={`https://${social.platform.toLowerCase()}.com/tu-cuenta`}
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Vista Previa del Footer</CardTitle>
          <CardDescription>
            Así se verá la información en tu tienda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-6 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Contact Info */}
              <div>
                <h4 className="font-semibold mb-3">Contacto</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {contactInfo.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{contactInfo.phone}</span>
                    </div>
                  )}
                  {contactInfo.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{contactInfo.email}</span>
                    </div>
                  )}
                  {contactInfo.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <span>{contactInfo.address}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Hours */}
              {contactInfo.hours && (
                <div>
                  <h4 className="font-semibold mb-3">Horarios</h4>
                  <div className="text-sm text-muted-foreground whitespace-pre-line">
                    {contactInfo.hours}
                  </div>
                </div>
              )}
              
              {/* Social Media */}
              <div>
                <h4 className="font-semibold mb-3">Síguenos</h4>
                <div className="flex gap-3">
                  {socialMedia
                    .filter(social => social.enabled && social.url)
                    .map((social) => (
                      <a
                        key={social.platform}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${social.color} hover:opacity-80 transition-opacity`}
                      >
                        <social.icon className="w-6 h-6" />
                      </a>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full">
        Guardar Información de Contacto
      </Button>
    </div>
  );
};