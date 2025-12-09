import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ContactData {
  whatsapp: string;
  email: string;
  address: string;
  facebook: string;
  instagram: string;
}

interface ContactEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ContactData) => void;
  initialData?: ContactData;
}

export const ContactEditModal = ({ isOpen, onClose, onSave, initialData }: ContactEditModalProps) => {
  const [formData, setFormData] = useState<ContactData>({
    whatsapp: "",
    email: "",
    address: "",
    facebook: "",
    instagram: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        whatsapp: "+52 55 1234 5678",
        email: "contacto@mitienda.com",
        address: "Ciudad de México, México",
        facebook: "",
        instagram: "",
      });
    }
  }, [initialData]);

  const handleInputChange = (field: keyof ContactData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Información de Contacto</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Contact Info Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Información de Contacto</h3>
              
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                  placeholder="+52 55 1234 5678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contacto@mitienda.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Ciudad de México, México"
                  rows={2}
                />
              </div>
            </div>

            {/* Social Media Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Redes Sociales</h3>
              
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={formData.facebook}
                  onChange={(e) => handleInputChange('facebook', e.target.value)}
                  placeholder="https://facebook.com/mitienda"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.instagram}
                  onChange={(e) => handleInputChange('instagram', e.target.value)}
                  placeholder="https://instagram.com/mitienda"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar Contacto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
