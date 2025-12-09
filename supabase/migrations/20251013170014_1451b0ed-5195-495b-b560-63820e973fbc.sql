-- Limpiar orders de infraestructura que ya están en platform_orders
-- Estas orders fueron creadas por el sistema legacy y ya fueron migradas

-- Primero eliminar los order_items asociados
DELETE FROM order_items 
WHERE order_id IN (
  SELECT id FROM orders 
  WHERE payment_ref LIKE 'domain_setup_%' 
  OR payment_ref LIKE 'plan_upgrade_%'
  OR payment_ref LIKE 'subscription_%'
);

-- Luego eliminar las orders de infraestructura
DELETE FROM orders 
WHERE payment_ref LIKE 'domain_setup_%' 
OR payment_ref LIKE 'plan_upgrade_%'
OR payment_ref LIKE 'subscription_%';