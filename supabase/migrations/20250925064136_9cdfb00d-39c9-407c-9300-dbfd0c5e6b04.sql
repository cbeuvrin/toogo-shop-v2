-- Crear política RLS para permitir acceso público a tenants activos
-- Esto permite que usuarios no autenticados puedan consultar información de tiendas activas
-- para resolver correctamente los dominios/subdominios a sus respectivas tiendas

CREATE POLICY "Public can view active tenants for store resolution" 
ON public.tenants 
FOR SELECT 
TO public 
USING (status = 'active');