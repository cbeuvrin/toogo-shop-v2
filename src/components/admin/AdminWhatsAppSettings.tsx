import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, MessageSquare, Phone, User, Clock, Settings } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { format } from 'date-fns';

export const AdminWhatsAppSettings = () => {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappUser, setWhatsappUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [botPhone, setBotPhone] = useState("");
  const [botDisplayName, setBotDisplayName] = useState("");

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  useEffect(() => {
    if (tenantId) {
      loadWhatsAppUser();
      loadConversations();
    }
    loadBotConfig();
  }, [tenantId]);

  const loadBotConfig = async () => {
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "whatsapp_bot_number")
      .maybeSingle();

    if (data?.setting_value) {
      const config = data.setting_value as any;
      setBotPhone(config.phone || "");
      setBotDisplayName(config.display_name || "");
    }
  };

  const handleSaveBotConfig = async () => {
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({
          setting_key: "whatsapp_bot_number",
          setting_value: {
            phone: botPhone,
            display_name: botDisplayName,
          },
        });

      if (error) throw error;
      
      toast({
        title: 'Guardado',
        description: 'Configuración del bot actualizada correctamente'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id);
    }
  }, [selectedConv]);

  const loadWhatsAppUser = async () => {
    const { data, error } = await supabase
      .from('whatsapp_users')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (!error && data) {
      setWhatsappUser(data);
      setPhoneNumber(data.phone_number);
    }
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('last_message_at', { ascending: false });

    if (!error && data) {
      setConversations(data);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const handleRegisterPhone = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: 'Error',
        description: 'Ingresa tu número de WhatsApp',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      if (whatsappUser) {
        // Actualizar
        const { error } = await supabase
          .from('whatsapp_users')
          .update({ phone_number: phoneNumber })
          .eq('id', whatsappUser.id);

        if (error) throw error;

        toast({
          title: 'Actualizado',
          description: 'Número de WhatsApp actualizado correctamente'
        });
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('whatsapp_users')
          .insert({
            tenant_id: tenantId,
            phone_number: phoneNumber,
            is_active: true
          });

        if (error) throw error;

        toast({
          title: 'Registrado',
          description: 'Tu número de WhatsApp ha sido registrado'
        });
      }

      loadWhatsAppUser();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: 'Copiado',
      description: 'URL del webhook copiada al portapapeles'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración del Bot de WhatsApp
          </CardTitle>
          <CardDescription>
            Configura el número de WhatsApp del bot que verán los tenants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-phone">Número del Bot (con código de país)</Label>
            <Input
              id="bot-phone"
              type="tel"
              placeholder="+521234567890"
              value={botPhone}
              onChange={(e) => setBotPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bot-display-name">Nombre para mostrar</Label>
            <Input
              id="bot-display-name"
              placeholder="Toogo Assistant"
              value={botDisplayName}
              onChange={(e) => setBotDisplayName(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveBotConfig} className="w-full">
            Guardar Configuración del Bot
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Configuración de WhatsApp + IA
          </CardTitle>
          <CardDescription>
            Conecta tu WhatsApp Business para recibir mensajes inteligentes con IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Registro de Número */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Tu número de WhatsApp Business</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="phone"
                  placeholder="+521234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <Button onClick={handleRegisterPhone} disabled={loading}>
                  {whatsappUser ? 'Actualizar' : 'Registrar'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Este es el número desde el cual recibirás y responderás mensajes
              </p>
            </div>

            {whatsappUser && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Phone className="h-3 w-3" />
                  {whatsappUser.phone_number}
                </Badge>
                <Badge variant={whatsappUser.is_active ? 'default' : 'destructive'}>
                  {whatsappUser.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            )}
          </div>

          {/* Webhook URL */}
          {whatsappUser && (
            <div className="space-y-2 border-t pt-4">
              <Label>Webhook URL (Configura esto en Meta for Developers)</Label>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyWebhookUrl}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-md text-sm space-y-2">
                <p className="font-medium">📋 Pasos para configurar en Meta:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Ve a <a href="https://developers.facebook.com" target="_blank" className="underline">Meta for Developers</a></li>
                  <li>Selecciona tu app de WhatsApp Business</li>
                  <li>En "WhatsApp" → "Configuration", pega esta URL en "Callback URL"</li>
                  <li>Usa tu <code>META_VERIFY_TOKEN</code> en "Verify Token"</li>
                  <li>Suscríbete a "messages" en Webhook Fields</li>
                </ol>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversaciones */}
      {whatsappUser && (
        <Card>
          <CardHeader>
            <CardTitle>Conversaciones</CardTitle>
            <CardDescription>
              Mensajes recibidos y respuestas de la IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="conversations">
              <TabsList>
                <TabsTrigger value="conversations">
                  Conversaciones ({conversations.length})
                </TabsTrigger>
                <TabsTrigger value="messages">
                  Mensajes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="conversations" className="space-y-2">
                {conversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No hay conversaciones aún</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConv(conv)}
                        className={`p-4 border rounded-lg mb-2 cursor-pointer transition-colors ${
                          selectedConv?.id === conv.id
                            ? 'bg-accent border-primary'
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">{conv.customer_phone}</span>
                          </div>
                          <Badge variant={conv.status === 'active' ? 'default' : 'secondary'}>
                            {conv.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(conv.last_message_at), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="messages" className="space-y-2">
                {!selectedConv ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>Selecciona una conversación</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 mb-2 rounded-lg ${
                          msg.direction === 'inbound'
                            ? 'bg-muted ml-8'
                            : 'bg-primary/10 mr-8'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={msg.direction === 'inbound' ? 'secondary' : 'default'}>
                            {msg.direction === 'inbound' ? 'Cliente' : 'Bot'}
                          </Badge>
                          <Badge variant="outline">{msg.message_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm">{msg.content}</p>
                        {msg.audio_url && (
                          <p className="text-xs text-muted-foreground mt-1">
                            🎤 Audio: {msg.audio_url}
                          </p>
                        )}
                      </div>
                    ))}
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
