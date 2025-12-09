-- Update existing banners with real images and attractive content
UPDATE visual_editor_data 
SET data = jsonb_build_object(
  'imageUrl', '/lovable-uploads/7a48d2dc-1797-4805-afe6-3c6f336c128d.png',
  'title', 'Ofertas Especiales',
  'subtitle', 'Hasta 50% de descuento en productos seleccionados',
  'linkUrl', '/catalogo',
  'sort', 0
),
updated_at = now()
WHERE element_id = 'banner_1' AND tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686';

UPDATE visual_editor_data 
SET data = jsonb_build_object(
  'imageUrl', '/lovable-uploads/036c3c47-ff9b-4a0a-b133-a179d700347d.png',
  'title', 'Nueva Colección',
  'subtitle', 'Descubre los productos más innovadores',
  'linkUrl', '/catalogo',
  'sort', 1
),
updated_at = now()
WHERE element_id = 'banner_2' AND tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686';

UPDATE visual_editor_data 
SET data = jsonb_build_object(
  'imageUrl', '/lovable-uploads/5170b911-cef6-4d1a-bf12-67bb9deba2de.png',
  'title', 'Envío Gratis',
  'subtitle', 'En compras mayores a $999',
  'linkUrl', '/catalogo',
  'sort', 2
),
updated_at = now()
WHERE element_id = 'banner_3' AND tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686';

-- Update existing products with real images and better data
UPDATE visual_editor_data 
SET data = jsonb_build_object(
  'name', 'Auriculares Premium Noise Pro',
  'description', 'Auriculares inalámbricos con cancelación de ruido activa y audio de alta fidelidad para una experiencia inmersiva única.',
  'price', 199.99,
  'priceMXN', 3999.80,
  'category', 'Electrónicos',
  'imageUrl', '/lovable-uploads/019e20b3-a4c5-43ac-a8fb-c327ad976310.png',
  'features', array['Cancelación de ruido activa', 'Batería 30 horas', 'Bluetooth 5.0', 'Resistente al agua IPX5'],
  'stock', 25,
  'sku', 'AUR-001'
),
updated_at = now()
WHERE element_id = 'demo_product_1' AND tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686';

UPDATE visual_editor_data 
SET data = jsonb_build_object(
  'name', 'Smartwatch Pro Series',
  'description', 'Reloj inteligente con GPS integrado, monitor de salud avanzado y resistencia al agua para acompañarte en todas tus actividades.',
  'price', 299.99,
  'priceMXN', 5999.80,
  'category', 'Electrónicos',
  'imageUrl', '/lovable-uploads/16ca1c29-687c-4e73-ac12-9edcff496a4c.png',
  'features', array['GPS integrado', 'Monitor cardíaco', 'Resistente al agua', 'Batería 7 días'],
  'stock', 15,
  'sku', 'SMW-002'
),
updated_at = now()
WHERE element_id = 'demo_product_2' AND tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686';

UPDATE visual_editor_data 
SET data = jsonb_build_object(
  'name', 'Mochila Urban Explorer',
  'description', 'Mochila de diseño moderno con compartimentos organizadores y material resistente al agua ideal para el día a día.',
  'price', 79.99,
  'priceMXN', 1599.80,
  'category', 'Accesorios',
  'imageUrl', '/lovable-uploads/2bc4a296-1a6d-442f-aa8b-1603ef872999.png',
  'features', array['Material resistente al agua', 'Compartimento para laptop', 'Puerto USB', 'Diseño ergonómico'],
  'stock', 40,
  'sku', 'MOC-003'
),
updated_at = now()
WHERE element_id = 'demo_product_3' AND tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686';

-- Add new products to expand the catalog
INSERT INTO visual_editor_data (tenant_id, element_type, element_id, data, created_at, updated_at)
VALUES 
('2d62ded6-0745-4ced-abdb-30b7b82e5686', 'product', 'demo_product_4', 
jsonb_build_object(
  'name', 'Tablet Ultra HD 10"',
  'description', 'Tablet de alta resolución con procesador potente, perfecta para trabajo y entretenimiento.',
  'price', 449.99,
  'priceMXN', 8999.80,
  'category', 'Electrónicos',
  'imageUrl', '/lovable-uploads/929755de-4946-479f-82ed-a328afea0a1c.png',
  'features', array['Pantalla 10 pulgadas', 'Procesador Octa-core', '128GB almacenamiento', 'Cámara dual'],
  'stock', 20,
  'sku', 'TAB-004'
), now(), now()),

('2d62ded6-0745-4ced-abdb-30b7b82e5686', 'product', 'demo_product_5', 
jsonb_build_object(
  'name', 'Lámpara LED Inteligente',
  'description', 'Lámpara con control por app, colores RGB y programación automática para crear el ambiente perfecto.',
  'price', 89.99,
  'priceMXN', 1799.80,
  'category', 'Hogar',
  'imageUrl', '/lovable-uploads/7a48d2dc-1797-4805-afe6-3c6f336c128d.png',
  'features', array['Control por app', '16 millones de colores', 'Programación automática', 'Compatible Alexa'],
  'stock', 30,
  'sku', 'LAM-005'
), now(), now()),

('2d62ded6-0745-4ced-abdb-30b7b82e5686', 'product', 'demo_product_6', 
jsonb_build_object(
  'name', 'Teclado Mecánico Gaming',
  'description', 'Teclado mecánico con switches táctiles, retroiluminación RGB y diseño anti-ghosting.',
  'price', 129.99,
  'priceMXN', 2599.80,
  'category', 'Accesorios',
  'imageUrl', '/lovable-uploads/036c3c47-ff9b-4a0a-b133-a179d700347d.png',
  'features', array['Switches mecánicos', 'RGB personalizable', 'Anti-ghosting', 'Cable trenzado'],
  'stock', 35,
  'sku', 'TEC-006'
), now(), now()),

('2d62ded6-0745-4ced-abdb-30b7b82e5686', 'product', 'demo_product_7', 
jsonb_build_object(
  'name', 'Aspiradora Robot Smart',
  'description', 'Robot aspiradora con mapeo inteligente, control por app y estación de carga automática.',
  'price', 389.99,
  'priceMXN', 7799.80,
  'category', 'Hogar',
  'imageUrl', '/lovable-uploads/5170b911-cef6-4d1a-bf12-67bb9deba2de.png',
  'features', array['Mapeo inteligente', 'Control por app', 'Carga automática', 'Filtro HEPA'],
  'stock', 12,
  'sku', 'ASP-007'
), now(), now()),

('2d62ded6-0745-4ced-abdb-30b7b82e5686', 'product', 'demo_product_8', 
jsonb_build_object(
  'name', 'Cámara Web 4K Pro',
  'description', 'Cámara web profesional con resolución 4K, micrófono integrado y enfoque automático.',
  'price', 159.99,
  'priceMXN', 3199.80,
  'category', 'Electrónicos',
  'imageUrl', '/lovable-uploads/2bc4a296-1a6d-442f-aa8b-1603ef872999.png',
  'features', array['Resolución 4K', 'Micrófono noise-canceling', 'Enfoque automático', 'Compatible streaming'],
  'stock', 28,
  'sku', 'CAM-008'
), now(), now());

-- Update logo with a better image
UPDATE visual_editor_data 
SET data = jsonb_build_object(
  'url', '/lovable-uploads/929755de-4946-479f-82ed-a328afea0a1c.png',
  'alt', 'TechStore Logo'
),
updated_at = now()
WHERE element_id = 'main' AND element_type = 'logo' AND tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686';