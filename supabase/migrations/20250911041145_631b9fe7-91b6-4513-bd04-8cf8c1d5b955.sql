-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for logo uploads
CREATE POLICY "Tenant admins can upload their logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'logos' 
  AND has_role(auth.uid(), 'tenant_admin'::app_role, (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Tenant admins can update their logos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'logos' 
  AND has_role(auth.uid(), 'tenant_admin'::app_role, (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Tenant admins can delete their logos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'logos' 
  AND has_role(auth.uid(), 'tenant_admin'::app_role, (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Logos are publicly viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'logos');