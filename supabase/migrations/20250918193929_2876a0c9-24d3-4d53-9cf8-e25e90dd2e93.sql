-- Delete empty test tenants (keep only Demo Store with products)
DELETE FROM tenants 
WHERE id IN (
  '67bcbb8e-d164-4a4a-a417-3e91d20f5f50', -- beuvrin02
  'e2bf5f2e-ec5b-4acc-a0ed-d67d85ec17fb', -- kaizen123  
  '2bd09209-525c-4be8-9d5f-d6fa44adbadf', -- Playeras Prueba
  '3255e98c-731f-4403-be61-53d756e93d6f'  -- la brujita
) 
AND (SELECT COUNT(*) FROM products WHERE tenant_id = tenants.id) = 0;