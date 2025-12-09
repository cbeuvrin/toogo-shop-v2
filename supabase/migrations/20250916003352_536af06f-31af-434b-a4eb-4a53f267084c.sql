-- Create banners storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true);

-- Create RLS policies for banners bucket
CREATE POLICY "Anyone can view banners" ON storage.objects
FOR SELECT USING (bucket_id = 'banners');

CREATE POLICY "Tenant admins can upload banners" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'banners' AND 
  (has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);

CREATE POLICY "Tenant admins can update banners" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'banners' AND 
  (has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);

CREATE POLICY "Tenant admins can delete banners" ON storage.objects
FOR DELETE USING (
  bucket_id = 'banners' AND 
  (has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);