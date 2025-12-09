-- Allow public read access to Demo Store data for unauthenticated users

-- Update products policy to allow public access to Demo Store
DROP POLICY IF EXISTS "Users can view products in their tenant" ON public.products;
CREATE POLICY "Users can view products in their tenant" ON public.products
FOR SELECT USING (
  (tenant_id = get_user_tenant(auth.uid())) OR 
  has_role(auth.uid(), 'superadmin'::app_role) OR
  (tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'::uuid) -- Demo Store public access
);

-- Update visual_editor_data policy to allow public read access to Demo Store
CREATE POLICY "Public can view Demo Store editor data" ON public.visual_editor_data
FOR SELECT USING (
  tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'::uuid -- Demo Store public access
);

-- Update categories policy to allow public access to Demo Store
DROP POLICY IF EXISTS "Users can view categories in their tenant" ON public.categories;
CREATE POLICY "Users can view categories in their tenant" ON public.categories
FOR SELECT USING (
  (tenant_id = get_user_tenant(auth.uid())) OR 
  has_role(auth.uid(), 'superadmin'::app_role) OR
  (tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'::uuid) -- Demo Store public access
);

-- Update product_images policy to allow public access to Demo Store
DROP POLICY IF EXISTS "Anyone can view product images" ON public.product_images;
CREATE POLICY "Anyone can view product images" ON public.product_images
FOR SELECT USING (
  true OR
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'::uuid
  )
);