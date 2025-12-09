-- Corregir TODOS los .toogo.mx a .toogo.store en la base de datos

-- 1. Corregir primary_host
UPDATE tenants
SET primary_host = regexp_replace(primary_host, '\.toogo\.mx$', '.toogo.store'),
    updated_at = NOW()
WHERE primary_host LIKE '%.toogo.mx';

-- 2. Corregir extra_hosts (array)
UPDATE tenants
SET extra_hosts = (
  SELECT array_agg(regexp_replace(h, '\.toogo\.mx$', '.toogo.store'))
  FROM unnest(COALESCE(extra_hosts, '{}')) as h
),
updated_at = NOW()
WHERE extra_hosts IS NOT NULL
  AND EXISTS (SELECT 1 FROM unnest(extra_hosts) as h WHERE h LIKE '%.toogo.mx');

-- 3. Asegurar que los tenants específicos tengan el formato correcto
UPDATE tenants
SET extra_hosts = ARRAY['beuvrinketing.toogo.store'],
    updated_at = NOW()
WHERE id = '1644578f-2308-4455-9f9e-c06dbecf6e86';

UPDATE tenants
SET extra_hosts = ARRAY['quirabeuvrin.toogo.store'],
    updated_at = NOW()
WHERE id = 'e2090d01-62f7-43c6-b4b3-192336478328';