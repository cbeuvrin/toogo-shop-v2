-- Fix existing tenants: Update primary_host to .com and move .toogo.mx to extra_hosts
-- Para beuvrinketing
UPDATE tenants 
SET 
  primary_host = 'beuvrinketing.com',
  extra_hosts = ARRAY['beuvrinketing.toogo.mx'],
  updated_at = NOW()
WHERE id = '1644578f-2308-4455-9f9e-c06dbecf6e86';

-- Para quirabeuvrin
UPDATE tenants 
SET 
  primary_host = 'quirabeuvrin.com',
  extra_hosts = ARRAY['quirabeuvrin.toogo.mx'],
  updated_at = NOW()
WHERE id = 'e2090d01-62f7-43c6-b4b3-192336478328';