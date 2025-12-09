-- Create helper functions first
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _tenant_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        _tenant_id IS NULL OR 
        tenant_id = _tenant_id OR 
        role = 'superadmin'
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role IN ('tenant_admin', 'tenant_staff')
  LIMIT 1
$$;

-- RLS policies for tenants
CREATE POLICY "Users can view own tenant" ON public.tenants
  FOR SELECT
  USING (
    auth.uid() = owner_user_id OR
    public.has_role(auth.uid(), 'superadmin') OR
    id = public.get_user_tenant(auth.uid())
  );

CREATE POLICY "Superadmins can manage all tenants" ON public.tenants
  FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can create tenants" ON public.tenants
  FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Superadmins can manage all roles" ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Tenant admins can manage roles in their tenant" ON public.user_roles
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'tenant_admin', tenant_id) OR
    public.has_role(auth.uid(), 'superadmin')
  );

-- RLS policies for categories
CREATE POLICY "Users can view categories in their tenant" ON public.categories
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant(auth.uid()) OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Tenant admins can manage categories" ON public.categories
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'tenant_admin', tenant_id) OR
    public.has_role(auth.uid(), 'superadmin')
  );

-- RLS policies for products
CREATE POLICY "Users can view products in their tenant" ON public.products
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant(auth.uid()) OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Tenant users can manage products" ON public.products
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'tenant_admin', tenant_id) OR
    public.has_role(auth.uid(), 'tenant_staff', tenant_id) OR
    public.has_role(auth.uid(), 'superadmin')
  );

-- RLS policies for product_images
CREATE POLICY "Users can view product images in their tenant" ON public.product_images
  FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM public.products 
      WHERE tenant_id = public.get_user_tenant(auth.uid())
    ) OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Tenant users can manage product images" ON public.product_images
  FOR ALL
  USING (
    product_id IN (
      SELECT id FROM public.products p 
      WHERE public.has_role(auth.uid(), 'tenant_admin', p.tenant_id) OR
            public.has_role(auth.uid(), 'tenant_staff', p.tenant_id) OR
            public.has_role(auth.uid(), 'superadmin')
    )
  );

-- RLS policies for product_categories
CREATE POLICY "Users can view product categories in their tenant" ON public.product_categories
  FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM public.products 
      WHERE tenant_id = public.get_user_tenant(auth.uid())
    ) OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Tenant users can manage product categories" ON public.product_categories
  FOR ALL
  USING (
    product_id IN (
      SELECT id FROM public.products p 
      WHERE public.has_role(auth.uid(), 'tenant_admin', p.tenant_id) OR
            public.has_role(auth.uid(), 'tenant_staff', p.tenant_id) OR
            public.has_role(auth.uid(), 'superadmin')
    )
  );

-- RLS policies for orders
CREATE POLICY "Users can view orders in their tenant" ON public.orders
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant(auth.uid()) OR
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Tenant users can manage orders" ON public.orders
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'tenant_admin', tenant_id) OR
    public.has_role(auth.uid(), 'tenant_staff', tenant_id) OR
    public.has_role(auth.uid(), 'superadmin')
  );

-- RLS policies for order_items
CREATE POLICY "Users can view order items in their tenant" ON public.order_items
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders 
      WHERE tenant_id = public.get_user_tenant(auth.uid()) OR
            user_id = auth.uid()
    ) OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Tenant users can manage order items" ON public.order_items
  FOR ALL
  USING (
    order_id IN (
      SELECT id FROM public.orders o 
      WHERE public.has_role(auth.uid(), 'tenant_admin', o.tenant_id) OR
            public.has_role(auth.uid(), 'tenant_staff', o.tenant_id) OR
            public.has_role(auth.uid(), 'superadmin')
    )
  );

-- RLS policies for tenant_settings
CREATE POLICY "Users can view settings for their tenant" ON public.tenant_settings
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant(auth.uid()) OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Tenant admins can manage their settings" ON public.tenant_settings
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'tenant_admin', tenant_id) OR
    public.has_role(auth.uid(), 'superadmin')
  );

-- RLS policies for verification_codes (public for signup process)
CREATE POLICY "Anyone can create verification codes" ON public.verification_codes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read their verification codes" ON public.verification_codes
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update their verification codes" ON public.verification_codes
  FOR UPDATE
  USING (true);

-- RLS policies for sessions_realtime
CREATE POLICY "Users can view sessions in their tenant" ON public.sessions_realtime
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant(auth.uid()) OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Tenant users can manage sessions" ON public.sessions_realtime
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'tenant_admin', tenant_id) OR
    public.has_role(auth.uid(), 'tenant_staff', tenant_id) OR
    public.has_role(auth.uid(), 'superadmin')
  );

-- RLS policies for domain_purchases
CREATE POLICY "Users can view domain purchases for their tenant" ON public.domain_purchases
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant(auth.uid()) OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Tenant admins can manage domain purchases" ON public.domain_purchases
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'tenant_admin', tenant_id) OR
    public.has_role(auth.uid(), 'superadmin')
  );

-- RLS policies for webhooks
CREATE POLICY "Users can view webhooks for their tenant" ON public.webhooks
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant(auth.uid()) OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "System can insert webhooks" ON public.webhooks
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage webhooks" ON public.webhooks
  FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS policies for banners
CREATE POLICY "Users can view banners in their tenant" ON public.banners
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant(auth.uid()) OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Tenant admins can manage banners" ON public.banners
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'tenant_admin', tenant_id) OR
    public.has_role(auth.uid(), 'superadmin')
  );

-- Create triggers for updated_at with proper search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_settings_updated_at BEFORE UPDATE ON public.tenant_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_domain_purchases_updated_at BEFORE UPDATE ON public.domain_purchases
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON public.banners
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_primary_host ON public.tenants(primary_host);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON public.tenants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_tenant ON public.user_roles(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON public.categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON public.verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_sessions_realtime_tenant ON public.sessions_realtime(tenant_id);