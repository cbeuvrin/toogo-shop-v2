-- Actualizar el registro de choeventos.com a estado activo y verificado
UPDATE domain_purchases
SET 
  status = 'active',
  dns_verified_bool = true,
  dns_verified_at = now(),
  metadata = jsonb_build_object(
    'steps', jsonb_build_object(
      'domain_purchase', jsonb_build_object('status', 'completed', 'message', 'Domain already exists'),
      'vercel_setup', jsonb_build_object('status', 'completed', 'message', 'Vercel setup completed'),
      'dns_setup', jsonb_build_object('status', 'completed', 'message', 'DNS records configured'),
      'order_creation', jsonb_build_object('status', 'completed', 'message', 'Order created'),
      'tenant_bootstrap', jsonb_build_object('status', 'completed', 'message', 'Tenant bootstrapped'),
      'welcome_email', jsonb_build_object('status', 'completed', 'message', 'Welcome email sent')
    ),
    'completed_at', now(),
    'last_error', null
  ),
  updated_at = now()
WHERE domain = 'choeventos.com';