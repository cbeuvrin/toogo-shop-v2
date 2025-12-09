import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Play, Settings, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export const BlogAutoGeneration = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTopic, setNewTopic] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['blog-auto-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_auto_generation_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch topics queue
  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ['blog-topics-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_topics_queue')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Add topic mutation
  const addTopicMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('blog_topics_queue')
        .insert({
          topic: newTopic,
          keywords: newKeywords.split(',').map(k => k.trim()).filter(Boolean),
          tone,
          length,
          created_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-topics-queue'] });
      setNewTopic('');
      setNewKeywords('');
      toast({ title: 'Tema agregado a la cola' });
    },
    onError: (error) => {
      toast({ title: 'Error al agregar tema', description: error.message, variant: 'destructive' });
    },
  });

  // Delete topic mutation
  const deleteTopicMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blog_topics_queue')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-topics-queue'] });
      toast({ title: 'Tema eliminado' });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<typeof settings>) => {
      const { error } = await supabase
        .from('blog_auto_generation_settings')
        .update(updates)
        .eq('id', settings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-auto-settings'] });
      toast({ title: 'Configuración actualizada' });
    },
  });

  // Manual trigger mutation
  const triggerGenerationMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('auto-generate-blog-post');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-topics-queue'] });
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast({ title: 'Generación iniciada', description: 'El artículo se está generando...' });
    },
    onError: (error) => {
      toast({ title: 'Error al generar', description: error.message, variant: 'destructive' });
    },
  });

  const pendingTopics = topics?.filter(t => t.status === 'pending') || [];
  const completedTopics = topics?.filter(t => t.status === 'completed') || [];
  const failedTopics = topics?.filter(t => t.status === 'failed') || [];

  if (settingsLoading) {
    return <div>Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuración de Generación Automática
              </CardTitle>
              <CardDescription>
                El sistema generará artículos automáticamente basándose en los temas en cola
              </CardDescription>
            </div>
            <Switch
              checked={settings?.enabled || false}
              onCheckedChange={(checked) => updateSettingsMutation.mutate({ enabled: checked })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email para notificaciones</Label>
              <Input
                value={settings?.notification_email || ''}
                onChange={(e) => updateSettingsMutation.mutate({ notification_email: e.target.value })}
                placeholder="tu@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Frecuencia (horas)</Label>
              <Input
                type="number"
                value={settings?.frequency_hours || 24}
                onChange={(e) => updateSettingsMutation.mutate({ frequency_hours: parseInt(e.target.value) })}
                min="1"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={settings?.auto_publish || false}
              onCheckedChange={(checked) => updateSettingsMutation.mutate({ auto_publish: checked })}
            />
            <Label>Publicar automáticamente (sin revisión)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Add Topic Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Agregar Tema a la Cola
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Tema del artículo</Label>
              <Input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Ej: Las mejores prácticas de SEO en 2025"
              />
            </div>
            <div className="space-y-2">
              <Label>Palabras clave (separadas por comas)</Label>
              <Input
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                placeholder="SEO, marketing digital, optimización"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tono</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Profesional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="technical">Técnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Longitud</Label>
                <Select value={length} onValueChange={setLength}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Corto</SelectItem>
                    <SelectItem value="medium">Medio</SelectItem>
                    <SelectItem value="long">Largo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button
            onClick={() => addTopicMutation.mutate()}
            disabled={!newTopic || addTopicMutation.isPending}
          >
            {addTopicMutation.isPending ? 'Agregando...' : 'Agregar a la cola'}
          </Button>
        </CardContent>
      </Card>

      {/* Topics Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Cola de Temas
              </CardTitle>
              <CardDescription>
                {pendingTopics.length} pendientes • {completedTopics.length} completados • {failedTopics.length} fallidos
              </CardDescription>
            </div>
            <Button
              onClick={() => triggerGenerationMutation.mutate()}
              disabled={pendingTopics.length === 0 || triggerGenerationMutation.isPending}
              size="sm"
            >
              {triggerGenerationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Generar Ahora
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {topicsLoading ? (
            <div>Cargando temas...</div>
          ) : topics?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay temas en la cola. Agrega uno arriba.
            </div>
          ) : (
            <div className="space-y-2">
              {topics?.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{topic.topic}</h4>
                      <Badge variant={
                        topic.status === 'completed' ? 'default' :
                        topic.status === 'pending' ? 'secondary' :
                        topic.status === 'generating' ? 'outline' :
                        'destructive'
                      }>
                        {topic.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {topic.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                        {topic.status === 'generating' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {topic.status}
                      </Badge>
                    </div>
                    {topic.keywords && topic.keywords.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {topic.keywords.join(', ')}
                      </p>
                    )}
                    {topic.error_message && (
                      <p className="text-sm text-destructive mt-1">{topic.error_message}</p>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar tema?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTopicMutation.mutate(topic.id)}>
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};