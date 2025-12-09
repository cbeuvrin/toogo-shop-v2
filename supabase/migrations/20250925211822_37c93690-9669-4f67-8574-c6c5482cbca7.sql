-- Update RLS policies for public access to store data

-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Users can view products in their tenant" ON products;
DROP POLICY IF EXISTS "Users can view categories in their tenant" ON categories;
DROP POLICY IF EXISTS "Anyone can view product images" ON product_images;
DROP POLICY IF EXISTS "Anyone can view product categories" ON product_categories;

-- Create new public SELECT policies for products
CREATE POLICY "Public can view all active products" 
ON products 
FOR SELECT 
USING (status = 'active');

-- Create new public SELECT policies for categories
CREATE POLICY "Public can view all categories" 
ON categories 
FOR SELECT 
USING (true);

-- Create new public SELECT policies for product images
CREATE POLICY "Public can view all product images" 
ON product_images 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.status = 'active'
  )
);

-- Create new public SELECT policies for product categories
CREATE POLICY "Public can view all product categories" 
ON product_categories 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_categories.product_id 
    AND products.status = 'active'
  )
);