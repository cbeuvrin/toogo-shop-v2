-- Limpiar registros corruptos de product_images
-- 1. Eliminar imágenes con URLs base64 (no válidas para mostrar)
DELETE FROM product_images WHERE url LIKE 'data:image%';

-- 2. Eliminar imágenes con URLs antiguas que ya no existen (404)
DELETE FROM product_images WHERE url LIKE '%_1719544717757_blob%';