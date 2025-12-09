-- Continue fixing remaining RLS policies

-- 6. Tenant settings policies (tenant-scoped)
CREATE POLICY "Tenant admins can view their settings" 
ON public.tenant_settings 
FOR SELECT 
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Tenant admins can manage their settings" 
ON public.tenant_settings 
FOR ALL 
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- 7. User roles policies (security-sensitive)
CREATE POLICY "Superadmins can manage all user roles" 
ON public.user_roles 
FOR ALL 
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Tenant admins can view roles in their tenant" 
ON public.user_roles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

-- 8. Sessions realtime policies (tenant-scoped)
CREATE POLICY "Tenant admins can view sessions in their tenant" 
ON public.sessions_realtime 
FOR SELECT 
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "System can manage sessions" 
ON public.sessions_realtime 
FOR ALL 
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- 9. Verification codes policies (security-sensitive)
CREATE POLICY "Users can view their own verification codes" 
ON public.verification_codes 
FOR SELECT 
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "System can manage verification codes" 
ON public.verification_codes 
FOR ALL 
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (true); -- Allow system to create codes for any email

-- 10. Webhooks policies (system-level)
CREATE POLICY "Tenant admins can view webhooks for their tenant" 
ON public.webhooks 
FOR SELECT 
USING (
  tenant_id IS NULL OR 
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "System can manage webhooks" 
ON public.webhooks 
FOR ALL 
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (true); -- Allow system to create webhooks

-- 11. Domain purchases policies (tenant-scoped)
CREATE POLICY "Tenant owners can view their domain purchases" 
ON public.domain_purchases 
FOR SELECT 
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Tenant owners can manage their domain purchases" 
ON public.domain_purchases 
FOR ALL 
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);