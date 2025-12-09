-- Drop existing restrictive RLS policies on logos bucket
DROP POLICY IF EXISTS "Tenant admins can upload their logos" ON storage.objects;
DROP POLICY IF EXISTS "Tenant admins can update their logos" ON storage.objects;
DROP POLICY IF EXISTS "Tenant admins can delete their logos" ON storage.objects;

-- Create new policies that allow both tenant_admin and superadmin
CREATE POLICY "Allow logo uploads for tenant admins and superadmins" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'logos' AND (
    has_role(auth.uid(), 'tenant_admin'::app_role, (storage.foldername(name))[1]::uuid) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  )
);

CREATE POLICY "Allow logo updates for tenant admins and superadmins" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'logos' AND (
    has_role(auth.uid(), 'tenant_admin'::app_role, (storage.foldername(name))[1]::uuid) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  )
);

CREATE POLICY "Allow logo deletes for tenant admins and superadmins" ON storage.objects
FOR DELETE USING (
  bucket_id = 'logos' AND (
    has_role(auth.uid(), 'tenant_admin'::app_role, (storage.foldername(name))[1]::uuid) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  )
);