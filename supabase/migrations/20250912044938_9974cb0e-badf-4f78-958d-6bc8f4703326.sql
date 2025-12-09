-- Clean up obsolete product and category data from visual_editor_data
-- This ensures the visual editor only displays current products from the products table

DELETE FROM visual_editor_data 
WHERE element_type IN ('product', 'category');

-- Add a comment to clarify the data source
COMMENT ON TABLE visual_editor_data IS 'Stores visual customization data: logo, banners, and contact info. Products and categories are stored in dedicated tables.';