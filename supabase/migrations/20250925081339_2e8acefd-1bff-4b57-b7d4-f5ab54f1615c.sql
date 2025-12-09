-- Remove the problematic trigger that causes infinite loop
-- This trigger was causing timeouts when users edit products due to infinite recursion
-- between trg_sync_visual_to_product and trg_sync_product_to_visual

DROP TRIGGER IF EXISTS trg_sync_visual_to_product ON public.visual_editor_data;

-- Also remove the function since it's no longer needed
DROP FUNCTION IF EXISTS public.sync_visual_editor_to_product();

-- Keep trg_sync_product_to_visual to maintain one-way sync from products to visual editor
-- This allows product changes to be reflected in visual data without causing loops