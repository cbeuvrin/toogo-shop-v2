-- Update RLS policies for product_images and product_categories to allow public access to Demo Store

-- Update product_images policy to allow public viewing for Demo Store
DROP POLICY IF EXISTS "Anyone can view product images" ON product_images;
CREATE POLICY "Anyone can view product images" 
ON product_images 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'::uuid
  )
);

-- Update product_categories policy to allow public viewing for Demo Store
DROP POLICY IF EXISTS "Anyone can view product categories" ON product_categories;
CREATE POLICY "Anyone can view product categories" 
ON product_categories 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_categories.product_id 
    AND products.tenant_id = '2d62ded6-0745-4ced-abdb-30b7b82e5686'::uuid
  )
);