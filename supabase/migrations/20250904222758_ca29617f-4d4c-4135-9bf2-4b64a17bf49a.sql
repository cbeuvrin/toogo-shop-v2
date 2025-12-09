-- Fix missing RLS policies for critical tables

-- 1. Banners policies (public facing but tenant-scoped)
CREATE POLICY "Anyone can view active banners" 
ON public.banners 
FOR SELECT 
USING (active = true);

CREATE POLICY "Tenant admins can manage banners" 
ON public.banners 
FOR ALL 
USING (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role));

-- 2. Product images policies (public facing but tenant-scoped via products)
CREATE POLICY "Anyone can view product images" 
ON public.product_images 
FOR SELECT 
USING (true);

CREATE POLICY "Tenant users can manage product images" 
ON public.product_images 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_images.product_id 
    AND (
      has_role(auth.uid(), 'tenant_admin'::app_role, products.tenant_id) OR 
      has_role(auth.uid(), 'tenant_staff'::app_role, products.tenant_id) OR 
      has_role(auth.uid(), 'superadmin'::app_role)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_images.product_id 
    AND (
      has_role(auth.uid(), 'tenant_admin'::app_role, products.tenant_id) OR 
      has_role(auth.uid(), 'tenant_staff'::app_role, products.tenant_id) OR 
      has_role(auth.uid(), 'superadmin'::app_role)
    )
  )
);

-- 3. Product categories policies (public facing but tenant-scoped)
CREATE POLICY "Anyone can view product categories" 
ON public.product_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Tenant users can manage product categories" 
ON public.product_categories 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_categories.product_id 
    AND (
      has_role(auth.uid(), 'tenant_admin'::app_role, products.tenant_id) OR 
      has_role(auth.uid(), 'tenant_staff'::app_role, products.tenant_id) OR 
      has_role(auth.uid(), 'superadmin'::app_role)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_categories.product_id 
    AND (
      has_role(auth.uid(), 'tenant_admin'::app_role, products.tenant_id) OR 
      has_role(auth.uid(), 'tenant_staff'::app_role, products.tenant_id) OR 
      has_role(auth.uid(), 'superadmin'::app_role)
    )
  )
);

-- 4. Orders policies (tenant-scoped)
CREATE POLICY "Users can view orders in their tenant" 
ON public.orders 
FOR SELECT 
USING (
  tenant_id = get_user_tenant(auth.uid()) OR 
  has_role(auth.uid(), 'superadmin'::app_role) OR
  user_id = auth.uid()
);

CREATE POLICY "Tenant users can manage orders" 
ON public.orders 
FOR ALL 
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR 
  has_role(auth.uid(), 'tenant_staff'::app_role, tenant_id) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR 
  has_role(auth.uid(), 'tenant_staff'::app_role, tenant_id) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- 5. Order items policies (linked to orders)
CREATE POLICY "Users can view order items for their orders" 
ON public.order_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (
      orders.tenant_id = get_user_tenant(auth.uid()) OR 
      has_role(auth.uid(), 'superadmin'::app_role) OR
      orders.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Tenant users can manage order items" 
ON public.order_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (
      has_role(auth.uid(), 'tenant_admin'::app_role, orders.tenant_id) OR 
      has_role(auth.uid(), 'tenant_staff'::app_role, orders.tenant_id) OR 
      has_role(auth.uid(), 'superadmin'::app_role)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (
      has_role(auth.uid(), 'tenant_admin'::app_role, orders.tenant_id) OR 
      has_role(auth.uid(), 'tenant_staff'::app_role, orders.tenant_id) OR 
      has_role(auth.uid(), 'superadmin'::app_role)
    )
  )
);