-- Create subscriptions table for monthly recurring payments
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'suspended', 'past_due')),
  next_billing_date timestamp with time zone NOT NULL,
  amount_mxn numeric NOT NULL DEFAULT 299,
  mercadopago_subscription_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create cancellation requests table for 72-hour grace period
CREATE TABLE public.cancellation_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  scheduled_deletion_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'reverted')),
  can_revert boolean NOT NULL DEFAULT true,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create domain renewals table for optional automatic renewal
CREATE TABLE public.domain_renewals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain text NOT NULL,
  auto_renew boolean NOT NULL DEFAULT false,
  next_renewal_date timestamp with time zone,
  amount_mxn numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_renewals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscriptions
CREATE POLICY "Tenant admins can manage their subscriptions"
ON public.subscriptions
FOR ALL
USING (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Create RLS policies for cancellation requests
CREATE POLICY "Tenant admins can manage their cancellation requests"
ON public.cancellation_requests
FOR ALL
USING (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Create RLS policies for domain renewals
CREATE POLICY "Tenant admins can manage their domain renewals"
ON public.domain_renewals
FOR ALL
USING (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'tenant_admin'::app_role, tenant_id) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_next_billing_date ON public.subscriptions(next_billing_date);
CREATE INDEX idx_cancellation_requests_tenant_id ON public.cancellation_requests(tenant_id);
CREATE INDEX idx_cancellation_requests_scheduled_deletion ON public.cancellation_requests(scheduled_deletion_at);
CREATE INDEX idx_domain_renewals_tenant_id ON public.domain_renewals(tenant_id);
CREATE INDEX idx_domain_renewals_next_renewal ON public.domain_renewals(next_renewal_date);

-- Create trigger for updated_at columns
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_domain_renewals_updated_at
  BEFORE UPDATE ON public.domain_renewals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();